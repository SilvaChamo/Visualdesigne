import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { getSupabaseAdmin } from '@/lib/supabase-admin';
import { saveProfileForAuthUser } from '@/lib/profile-db';

// "O Meu Perfil" do cliente — self-service, sem impersonação: o utilizador
// só pode ler/editar a sua própria conta (a sessão autenticada define o
// userId, nunca vem do pedido). Nome/telefone/empresa/nif ficam em
// user_metadata (mesmo padrão do perfil do revendedor) porque a tabela
// `profiles` só tem name/email genéricos.
export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 });

  const admin = getSupabaseAdmin();
  if (!admin) return NextResponse.json({ error: 'Supabase Service Role não configurado.' }, { status: 500 });

  const { data, error } = await admin.auth.admin.getUserById(user.id);
  if (error || !data?.user) {
    return NextResponse.json({ error: 'Utilizador não encontrado.' }, { status: 404 });
  }

  return NextResponse.json({
    email: data.user.email || '',
    nome: data.user.user_metadata?.nome || data.user.user_metadata?.full_name || '',
    telefone: data.user.user_metadata?.telefone || '',
    empresa: data.user.user_metadata?.empresa || '',
    nif: data.user.user_metadata?.nif || '',
  });
}

export async function PATCH(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 });

  const admin = getSupabaseAdmin();
  if (!admin) return NextResponse.json({ error: 'Supabase Service Role não configurado.' }, { status: 500 });

  const body = await request.json().catch(() => ({}));

  const { data: currentData, error: currentError } = await admin.auth.admin.getUserById(user.id);
  if (currentError || !currentData?.user) {
    return NextResponse.json({ error: 'Utilizador não encontrado.' }, { status: 404 });
  }

  const nome = typeof body.nome === 'string' ? body.nome.trim() : undefined;
  const telefone = typeof body.telefone === 'string' ? body.telefone.trim() : undefined;
  const empresa = typeof body.empresa === 'string' ? body.empresa.trim() : undefined;
  const nif = typeof body.nif === 'string' ? body.nif.trim() : undefined;
  const password = typeof body.password === 'string' && body.password ? body.password : undefined;
  const email = typeof body.email === 'string' ? body.email.trim() : undefined;
  const emailChanged = Boolean(email) && email!.toLowerCase() !== (currentData.user.email || '').toLowerCase();

  if (password && password.length < 6) {
    return NextResponse.json({ error: 'A senha deve ter pelo menos 6 caracteres.' }, { status: 400 });
  }
  if (emailChanged && !email!.includes('@')) {
    return NextResponse.json({ error: 'Email inválido.' }, { status: 400 });
  }

  if (emailChanged) {
    const { data: existingUsers, error: listError } = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 });
    if (listError) return NextResponse.json({ error: listError.message }, { status: 500 });
    const taken = existingUsers.users.some((u) => u.id !== user.id && u.email?.toLowerCase() === email!.toLowerCase());
    if (taken) {
      return NextResponse.json({ error: `Já existe uma conta com o email ${email}.` }, { status: 409 });
    }
  }

  const updatePayload: Parameters<typeof admin.auth.admin.updateUserById>[1] = {
    user_metadata: {
      ...currentData.user.user_metadata,
      ...(nome !== undefined ? { nome, full_name: nome } : {}),
      ...(telefone !== undefined ? { telefone } : {}),
      ...(empresa !== undefined ? { empresa } : {}),
      ...(nif !== undefined ? { nif } : {}),
    },
  };
  if (emailChanged) {
    updatePayload.email = email;
    updatePayload.email_confirm = true;
  }
  if (password) updatePayload.password = password;

  const { data: updated, error: updateError } = await admin.auth.admin.updateUserById(user.id, updatePayload);
  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 });
  }

  if (nome !== undefined || emailChanged) {
    await saveProfileForAuthUser(admin, user.id, {
      ...(nome !== undefined ? { name: nome } : {}),
      ...(emailChanged ? { email } : {}),
    });
  }

  return NextResponse.json({
    success: true,
    email: updated.user?.email || currentData.user.email,
    nome: updated.user?.user_metadata?.nome || '',
    telefone: updated.user?.user_metadata?.telefone || '',
    empresa: updated.user?.user_metadata?.empresa || '',
    nif: updated.user?.user_metadata?.nif || '',
  });
}
