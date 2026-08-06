// Submete um pedido de transferência de domínio (de outro registador para a
// Dynadot) depois de pago no carrinho — chamado só para itens 'domain' com
// authCode (ver checkout-fulfillment.ts). Não é instantâneo: o registador
// antigo tem de aprovar (ou passar 5-7 dias sem responder, que conta como
// aprovação silenciosa) — daí existir domain_transfer_requests para
// acompanhar o estado, em vez de assumir sucesso logo aqui.
import type { SupabaseClient } from '@supabase/supabase-js';
import { dynadotAPI } from '@/lib/dynadot-adapter';

export async function submitDomainTransfer(
  admin: SupabaseClient,
  userId: string,
  domain: string,
  authCode: string,
  years: number,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const clean = domain.toLowerCase().trim();

  const { data: request, error: insertError } = await admin
    .from('domain_transfer_requests')
    .insert({ user_id: userId, domain_name: clean, status: 'pending', years })
    .select('id')
    .single();
  if (insertError) {
    return { ok: false, error: `Falha ao registar pedido de transferência: ${insertError.message}` };
  }

  const result = await dynadotAPI.initiateTransferIn(clean, authCode, years);

  if (!result.success) {
    await admin
      .from('domain_transfer_requests')
      .update({ status: 'failed', error_message: result.error, updated_at: new Date().toISOString() })
      .eq('id', request.id);
    return { ok: false, error: result.error };
  }

  await admin
    .from('domain_transfer_requests')
    .update({ status: 'submitted', updated_at: new Date().toISOString() })
    .eq('id', request.id);

  return { ok: true };
}
