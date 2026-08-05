import { getSupabaseAdmin } from '@/lib/supabase-admin';
import { fulfillCheckout } from '@/lib/checkout-fulfillment';
import type { CatalogCartItem } from '@/lib/package-catalog';

/**
 * Confirma uma checkout_session pendente (M-Pesa/Transferência confirmados
 * manualmente pela equipa) — activa os produtos comprados. Cartão via
 * Stripe nunca passa por aqui: o webhook chama fulfillCheckout directamente.
 * Idempotente.
 */
export async function confirmCheckoutSession(
  supabase: ReturnType<typeof getSupabaseAdmin>,
  sessionId: string,
): Promise<{ ok: boolean; alreadyDone?: boolean; error?: string }> {
  if (!supabase) return { ok: false, error: 'Supabase Service Role não configurado.' };

  const { data: session, error: sessionError } = await supabase
    .from('checkout_sessions')
    .select('id, user_id, items, status, metodo_pagamento')
    .eq('id', sessionId)
    .single();
  if (sessionError || !session) return { ok: false, error: 'Sessão de checkout não encontrada.' };
  if (session.status !== 'pending') return { ok: true, alreadyDone: true };

  try {
    await fulfillCheckout(supabase, session.user_id, session.items as CatalogCartItem[], session.metodo_pagamento);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return { ok: false, error: message };
  }

  const { error: updateError } = await supabase
    .from('checkout_sessions')
    .update({ status: 'paid', fulfilled_at: new Date().toISOString() })
    .eq('id', sessionId);
  if (updateError) return { ok: false, error: updateError.message };

  return { ok: true };
}
