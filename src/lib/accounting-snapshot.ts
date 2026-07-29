import { getSupabaseAdmin } from '@/lib/supabase-admin';

const IVA_PERCENT = 16;

/**
 * Recalcula custos/IVA/lucro da cópia de contabilidade (accounting_batch_snapshots)
 * de uma encomenda já concluída, sempre que uma despesa de produção é
 * lançada/editada/removida depois da encomenda ter ficado 'done'. Sem isto,
 * esquecer-se de lançar o custo do material antes da entrega ficava
 * congelado para sempre na Contabilidade, mesmo depois de corrigido aqui.
 * Não faz nada se a encomenda ainda não tiver cópia (não está concluída) —
 * nesse caso o Balanço mensal já lê as despesas ao vivo, não há nada a
 * corrigir. Quem chama já garantiu que o ano não está fechado.
 */
export async function refreshAccountingSnapshotCosts(
  supabase: ReturnType<typeof getSupabaseAdmin>,
  batchId: string,
): Promise<void> {
  if (!supabase) return;
  try {
    const { data: snapshot } = await supabase
      .from('accounting_batch_snapshots')
      .select('receita_mt')
      .eq('batch_id', batchId)
      .maybeSingle();
    if (!snapshot) return;

    const { data: expenses } = await supabase
      .from('quotation_batch_expenses')
      .select('valor_mt, quantidade')
      .eq('batch_id', batchId);
    const custosProducaoMt = (expenses || []).reduce(
      (sum: number, e: any) => sum + (Number(e.valor_mt) || 0) * (Number(e.quantidade) || 1),
      0,
    );

    const receitaMt = Number(snapshot.receita_mt) || 0;
    const ivaMt = ((receitaMt - custosProducaoMt) * IVA_PERCENT) / 100;
    const lucroMt = receitaMt - custosProducaoMt - ivaMt;

    await supabase
      .from('accounting_batch_snapshots')
      .update({ custos_producao_mt: custosProducaoMt, iva_mt: ivaMt, lucro_mt: lucroMt })
      .eq('batch_id', batchId);
  } catch (error) {
    console.error('[accounting-snapshot] falha ao actualizar cópia de contabilidade:', error);
  }
}
