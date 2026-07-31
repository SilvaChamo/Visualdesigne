import type { SupabaseClient } from '@supabase/supabase-js';

// Não há uma tabela de "lido/não lido" — heurística: por encomenda (batch),
// conta quantas mensagens seguidas, a partir do fim, vieram do lado que
// ainda não respondeu. Usada dos dois lados da conversa: o admin quer saber
// quantas mensagens do CLIENTE ficaram por responder (unreadSenderRole:
// 'client'); o cliente quer saber quantas da EQUIPA ficaram por responder
// (unreadSenderRole: 'admin').
export async function computeUnreadByBatch(
  supabase: SupabaseClient,
  rows: { id: string; batch_id: string }[],
  unreadSenderRole: 'client' | 'admin',
): Promise<Record<string, number>> {
  const idToBatch = new Map(rows.map((r) => [r.id, r.batch_id]));
  const allIds = rows.map((r) => r.id);
  if (allIds.length === 0) return {};

  const { data: messages, error } = await supabase
    .from('quotation_messages')
    .select('quotation_id, sender_role, created_at')
    .in('quotation_id', allIds)
    .order('created_at', { ascending: true });

  if (error || !messages) return {};

  const byBatch = new Map<string, { sender_role: string; created_at: string }[]>();
  for (const m of messages) {
    const batchId = idToBatch.get(m.quotation_id);
    if (!batchId) continue;
    const list = byBatch.get(batchId) ?? [];
    list.push(m);
    byBatch.set(batchId, list);
  }

  const unread: Record<string, number> = {};
  for (const [batchId, list] of byBatch) {
    let count = 0;
    for (let i = list.length - 1; i >= 0; i -= 1) {
      if (list[i].sender_role !== unreadSenderRole) break;
      count += 1;
    }
    if (count > 0) unread[batchId] = count;
  }
  return unread;
}
