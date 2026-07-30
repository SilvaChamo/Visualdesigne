import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { requireAdminOrReseller } from '@/lib/panel-api-auth';
import { resolveEffectivePanelUserId } from '@/lib/panel-reseller-context';
import { saveProfileForAuthUser } from '@/lib/profile-db';

function admin() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
}

// "Meu Perfil" do revendedor precisa de ler/escrever pelo Auth Admin API (em vez
// de supabase.auth.updateUser() no browser) porque quando um admin está a
// impersonar um revendedor, a sessão do browser continua a ser a do próprio
// admin — updateUser() do lado do cliente alteraria sempre a conta do admin,
// nunca a do revendedor impersonado. Ver resolveEffectivePanelUserId().
export async function GET() {
  const auth = await requireAdminOrReseller();
  if ('error' in auth) return auth.error;
  const userId = await resolveEffectivePanelUserId(auth.user);

  const { data, error } = await admin().auth.admin.getUserById(userId);
  if (error || !data?.user) {
    return NextResponse.json({ error: 'Utilizador não encontrado.' }, { status: 404 });
  }

  return NextResponse.json({
    email: data.user.email || '',
    nome: data.user.user_metadata?.nome || data.user.user_metadata?.full_name || '',
    telefone: data.user.user_metadata?.telefone || '',
    empresa: data.user.user_metadata?.empresa || '',
  });
}

export async function PATCH(request: NextRequest) {
  const auth = await requireAdminOrReseller();
  if ('error' in auth) return auth.error;
  const userId = await resolveEffectivePanelUserId(auth.user);

  const body = await request.json().catch(() => ({}));
  const supabaseAdmin = admin();

  const { data: currentData, error: currentError } = await supabaseAdmin.auth.admin.getUserById(userId);
  if (currentError || !currentData?.user) {
    return NextResponse.json({ error: 'Utilizador não encontrado.' }, { status: 404 });
  }

  const nome = typeof body.nome === 'string' ? body.nome.trim() : undefined;
  const telefone = typeof body.telefone === 'string' ? body.telefone.trim() : undefined;
  const empresa = typeof body.empresa === 'string' ? body.empresa.trim() : undefined;
  const password = typeof body.password === 'string' && body.password ? body.password : undefined;
  const email = typeof body.email === 'string' ? body.email.trim() : undefined;
  const emailChanged = Boolean(email) && email!.toLowerCase() !== (currentData.user.email || '').toLowerCase();

  if (password && password.length < 6) {
    return NextResponse.json({ error: 'A senha deve ter pelo menos 6 caracteres.' }, { status: 400 });
  }
  if (emailChanged && !email!.includes('@')) {
    return NextResponse.json({ error: 'Email inválido.' }, { status: 400 });
  }

  const updatePayload: Parameters<typeof supabaseAdmin.auth.admin.updateUserById>[1] = {
    user_metadata: {
      ...currentData.user.user_metadata,
      ...(nome !== undefined ? { nome, full_name: nome } : {}),
      ...(telefone !== undefined ? { telefone } : {}),
      ...(empresa !== undefined ? { empresa } : {}),
    },
  };
  if (emailChanged) {
    updatePayload.email = email;
    updatePayload.email_confirm = true;
  }
  if (password) updatePayload.password = password;

  const { data: updated, error: updateError } = await supabaseAdmin.auth.admin.updateUserById(userId, updatePayload);
  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 });
  }

  if (nome !== undefined || emailChanged) {
    await saveProfileForAuthUser(supabaseAdmin, userId, {
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
  });
}
