import { NextResponse } from 'next/server';
import { requireAdminOrReseller } from '@/lib/panel-api-auth';
import { getSupabaseAdmin } from '@/lib/supabase-admin';

// Lista todos os pedidos de pagamento de renovação, para a equipa
// confirmar/rejeitar depois de verificar o pagamento manual (M-Pesa/banco).
export async function GET() {
  const auth = await requireAdminOrReseller();
  if ('error' in auth) return auth.error;
  if (auth.user.role !== 'admin') {
    return NextResponse.json({ success: false, error: 'Acção restrita a administradores.' }, { status: 403 });
  }

  const supabase = getSupabaseAdmin();
  if (!supabase) {
    return NextResponse.json({ success: false, error: 'Supabase Service Role não configurado.' }, { status: 503 });
  }

  try {
    const { data, error } = await supabase
      .from('renewal_payment_requests')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) throw error;

    // Dados do cliente (nome/telefone/morada/cidade/empresa) para o painel
    // "Dados do cliente" na Contabilidade — mesmo padrão do checkout-pagamentos.
    const userIds = Array.from(new Set((data || []).map((s) => s.user_id).filter(Boolean)));
    const profileById: Record<string, { nome?: string; email?: string; telefone?: string; morada?: string; cidade?: string; empresa?: string }> = {};
    if (userIds.length > 0) {
      const { data: profiles } = await supabase
        .from('profiles')
        .select('user_id, name, email, telefone, morada, cidade, empresa')
        .in('user_id', userIds);
      for (const p of profiles || []) {
        if (p.user_id) profileById[p.user_id] = { nome: p.name, email: p.email, telefone: p.telefone, morada: p.morada, cidade: p.cidade, empresa: p.empresa };
      }
    }

    // Contas por Google (OAuth) nunca passam por /api/auth/register — não
    // têm linha em profiles. Sem isto a coluna "Cliente" ficava sempre "—"
    // para elas, mesmo a conta tendo nome/email reais no próprio Auth.
    const missingIds = userIds.filter((id) => !profileById[id]?.nome && !profileById[id]?.email);
    if (missingIds.length > 0) {
      const authUsers = await Promise.all(
        missingIds.map((id) => supabase.auth.admin.getUserById(id).catch(() => null)),
      );
      authUsers.forEach((res, idx) => {
        const user = res?.data?.user;
        if (!user) return;
        const id = missingIds[idx];
        profileById[id] = {
          ...profileById[id],
          nome: profileById[id]?.nome || user.user_metadata?.full_name || user.user_metadata?.name || undefined,
          email: profileById[id]?.email || user.email || undefined,
        };
      });
    }

    const pedidos = (data || []).map((s) => ({
      ...s,
      cliente: profileById[s.user_id] || null,
    }));

    return NextResponse.json({ success: true, pedidos });
  } catch (error: any) {
    console.error('[admin/renewal-pagamentos GET] error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
