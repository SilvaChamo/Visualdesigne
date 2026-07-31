import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { requireAdminOrReseller } from '@/lib/panel-api-auth';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

function getSupabaseAdmin() {
  if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error('Supabase Service Role não configurado.');
  }
  return createClient(supabaseUrl, supabaseServiceKey);
}

async function requireAdmin() {
  const auth = await requireAdminOrReseller();
  if ('error' in auth) return auth;
  if (auth.user.role !== 'admin') {
    return { error: NextResponse.json({ success: false, error: 'Acção restrita a administradores.' }, { status: 403 }) };
  }
  return auth;
}

// Funde duas contas duplicadas da mesma pessoa (ex.: registou-se duas vezes
// com pequenas diferenças no email/nome) numa só: todas as encomendas e
// mensagens da conta "mergeUserId" passam a pertencer a "keepUserId", e a
// conta a mais é eliminada. Nunca apaga nada de "keepUserId".
export async function POST(request: NextRequest) {
  const auth = await requireAdmin();
  if ('error' in auth) return auth.error;

  try {
    const body = await request.json().catch(() => ({}));
    const keepUserId = String(body?.keepUserId || '').trim();
    const mergeUserId = String(body?.mergeUserId || '').trim();

    if (!keepUserId || !mergeUserId) {
      return NextResponse.json({ success: false, error: 'Seleccione as duas contas a fundir.' }, { status: 400 });
    }
    if (keepUserId === mergeUserId) {
      return NextResponse.json({ success: false, error: 'Escolha duas contas diferentes.' }, { status: 400 });
    }

    const supabase = getSupabaseAdmin();

    // 1. Passa as encomendas para a conta que fica.
    const { error: quotationsError } = await supabase
      .from('quotation_requests')
      .update({ user_id: keepUserId })
      .eq('user_id', mergeUserId);
    if (quotationsError) throw quotationsError;

    // 2. Passa a autoria das mensagens enviadas pela conta a fundir — senão
    // ficam com sender_user_id a NULL depois do deleteUser (ON DELETE SET NULL).
    const { error: messagesError } = await supabase
      .from('quotation_messages')
      .update({ sender_user_id: keepUserId })
      .eq('sender_user_id', mergeUserId);
    if (messagesError) throw messagesError;

    // 3. Contas de email associadas à conta a fundir (se existirem).
    await supabase.from('email_contas').update({ cliente_id: keepUserId }).eq('cliente_id', mergeUserId);

    // 4. Elimina a conta a mais (perfil primeiro, depois Auth).
    const { data: profile } = await supabase.from('profiles').select('id').eq('user_id', mergeUserId).maybeSingle();
    if (profile?.id) {
      await supabase.from('profiles').delete().eq('id', profile.id);
    }
    const { error: deleteError } = await supabase.auth.admin.deleteUser(mergeUserId);
    if (deleteError) throw deleteError;

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('[admin/cotacoes/clientes/fundir] erro:', error);
    return NextResponse.json({ success: false, error: error?.message || 'Erro interno' }, { status: 500 });
  }
}
