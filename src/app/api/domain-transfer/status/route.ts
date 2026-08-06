import { NextRequest, NextResponse } from 'next/server';
import { requirePanelBootstrapAccess } from '@/lib/panel-api-auth';
import { getSupabaseAdmin } from '@/lib/supabase-admin';
import { dynadotAPI } from '@/lib/dynadot-adapter';

const DYNADOT_STATUS_MAP: Record<string, string> = {
  waiting: 'waiting',
  pending: 'waiting',
  completed: 'completed',
  success: 'completed',
  rejected: 'rejected',
  cancelled: 'rejected',
  failed: 'failed',
};

/**
 * Consulta o estado actual de um pedido de transferência — sempre pergunta à
 * Dynadot ao vivo (não só à nossa tabela), porque a aprovação acontece do
 * lado do registador antigo, fora do nosso controlo.
 */
export async function GET(request: NextRequest) {
  const auth = await requirePanelBootstrapAccess();
  if ('error' in auth) return auth.error;

  const domain = request.nextUrl.searchParams.get('domain')?.trim().toLowerCase();
  if (!domain) {
    return NextResponse.json({ success: false, error: 'Domínio obrigatório' }, { status: 400 });
  }

  const supabase = getSupabaseAdmin();
  if (!supabase) {
    return NextResponse.json({ success: false, error: 'Serviço indisponível.' }, { status: 503 });
  }

  let query = supabase
    .from('domain_transfer_requests')
    .select('*')
    .eq('domain_name', domain)
    .order('created_at', { ascending: false })
    .limit(1);
  if (auth.user.role !== 'admin') {
    query = query.eq('user_id', auth.user.id);
  }
  const { data: request_, error } = await query.maybeSingle();
  if (error || !request_) {
    return NextResponse.json({ success: false, error: 'Pedido de transferência não encontrado.' }, { status: 404 });
  }

  // Só vale a pena perguntar à Dynadot se já foi submetido lá — 'pending'/'failed'
  // locais significam que nunca chegou a sair da nossa base de dados.
  if (request_.status === 'pending' || request_.status === 'failed') {
    return NextResponse.json({
      success: true,
      status: request_.status,
      errorMessage: request_.error_message,
      createdAt: request_.created_at,
    });
  }

  const live = await dynadotAPI.getTransferStatus(domain);
  if (!live.success) {
    return NextResponse.json({
      success: true,
      status: request_.status,
      errorMessage: request_.error_message,
      createdAt: request_.created_at,
    });
  }

  const mapped = DYNADOT_STATUS_MAP[live.status.toLowerCase()] || request_.status;
  if (mapped !== request_.status || live.orderId !== request_.dynadot_order_id) {
    await supabase
      .from('domain_transfer_requests')
      .update({ status: mapped, dynadot_order_id: live.orderId, updated_at: new Date().toISOString() })
      .eq('id', request_.id);

    if (mapped === 'completed' && request_.status !== 'completed') {
      // Transferência concluída a sério — o domínio passa a ser nosso de facto.
      await supabase
        .from('domain_renewals')
        .update({ status: 'active', notes: 'Transferência concluída' })
        .eq('user_id', request_.user_id)
        .eq('domain_name', domain);
      await supabase.from('notifications').insert({
        user_id: request_.user_id,
        title: 'Transferência de domínio concluída',
        message: `O domínio ${domain} foi transferido com sucesso e já está activo na sua conta.`,
        type: 'success',
        category: 'system',
      });
    } else if (mapped === 'rejected' && request_.status !== 'rejected') {
      await supabase.from('notifications').insert({
        user_id: request_.user_id,
        title: 'Transferência de domínio rejeitada',
        message: `O pedido de transferência de ${domain} foi rejeitado pelo registador anterior. Contacte o suporte se precisar de ajuda.`,
        type: 'error',
        category: 'system',
      });
    }
  }

  return NextResponse.json({
    success: true,
    status: mapped,
    rawStatus: live.status,
    orderId: live.orderId,
    createdAt: request_.created_at,
    completedAt: live.completedDate,
  });
}
