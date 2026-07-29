import { getSupabaseAdmin } from '@/lib/supabase-admin';

/**
 * Confirma um pedido de carregamento pendente e soma o valor ao saldo do
 * revendedor — usado tanto pela confirmação manual do admin (M-Pesa/
 * Transferência) como pelo webhook do Stripe (Cartão, automático). Idempotente:
 * um pedido que já não esteja 'pending' é ignorado, para o webhook poder
 * repetir a entrega sem duplicar o saldo.
 */
export async function confirmResellerCreditRequest(
  supabase: ReturnType<typeof getSupabaseAdmin>,
  requestId: string,
): Promise<{ ok: boolean; alreadyDone?: boolean; error?: string }> {
  if (!supabase) return { ok: false, error: 'Supabase Service Role não configurado.' };

  const { data: pedido, error: pedidoError } = await supabase
    .from('reseller_credit_requests')
    .select('id, da_username, valor_mt, status')
    .eq('id', requestId)
    .single();
  if (pedidoError || !pedido) return { ok: false, error: 'Pedido não encontrado.' };
  if (pedido.status !== 'pending') return { ok: true, alreadyDone: true };

  const { data: existing } = await supabase
    .from('reseller_credits')
    .select('saldo_mt')
    .eq('da_username', pedido.da_username)
    .maybeSingle();
  const novoSaldo = (Number(existing?.saldo_mt) || 0) + Number(pedido.valor_mt);

  const { error: creditoError } = await supabase
    .from('reseller_credits')
    .upsert({ da_username: pedido.da_username, saldo_mt: novoSaldo, updated_at: new Date().toISOString() }, { onConflict: 'da_username' });
  if (creditoError) return { ok: false, error: creditoError.message };

  const { error: updateError } = await supabase
    .from('reseller_credit_requests')
    .update({ status: 'confirmed', confirmed_at: new Date().toISOString() })
    .eq('id', requestId);
  if (updateError) return { ok: false, error: updateError.message };

  return { ok: true };
}
