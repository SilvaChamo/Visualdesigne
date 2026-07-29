import { getSupabaseAdmin } from '@/lib/supabase-admin';

function addYears(date: Date, years: number) {
  const d = new Date(date);
  d.setFullYear(d.getFullYear() + years);
  return d.toISOString().split('T')[0];
}

/**
 * Confirma um pedido de pagamento de renovação pendente — estende a
 * expiração do domínio/hospedagem 1 ano a partir do maior entre a validade
 * actual e hoje (renovação nunca "perde" tempo já pago). Usado tanto pela
 * confirmação manual do admin como pelo webhook do Stripe. Idempotente.
 */
export async function confirmRenewalPayment(
  supabase: ReturnType<typeof getSupabaseAdmin>,
  requestId: string,
): Promise<{ ok: boolean; alreadyDone?: boolean; error?: string }> {
  if (!supabase) return { ok: false, error: 'Supabase Service Role não configurado.' };

  const { data: pedido, error: pedidoError } = await supabase
    .from('renewal_payment_requests')
    .select('id, renewal_type, renewal_id, status')
    .eq('id', requestId)
    .single();
  if (pedidoError || !pedido) return { ok: false, error: 'Pedido não encontrado.' };
  if (pedido.status !== 'pending') return { ok: true, alreadyDone: true };

  const table = pedido.renewal_type === 'domain' ? 'domain_renewals' : 'hosting_renewals';
  const { data: renewal, error: renewalError } = await supabase
    .from(table)
    .select('expiration_date')
    .eq('id', pedido.renewal_id)
    .single();
  if (renewalError || !renewal) return { ok: false, error: 'Registo de renovação não encontrado.' };

  const today = new Date();
  const currentExpiration = new Date(renewal.expiration_date);
  const base = currentExpiration > today ? currentExpiration : today;
  const novaExpiracao = addYears(base, 1);

  const { error: updateRenewalError } = await supabase
    .from(table)
    .update({ expiration_date: novaExpiracao, status: 'active' })
    .eq('id', pedido.renewal_id);
  if (updateRenewalError) return { ok: false, error: updateRenewalError.message };

  const { error: updateRequestError } = await supabase
    .from('renewal_payment_requests')
    .update({ status: 'confirmed', confirmed_at: new Date().toISOString() })
    .eq('id', requestId);
  if (updateRequestError) return { ok: false, error: updateRequestError.message };

  return { ok: true };
}
