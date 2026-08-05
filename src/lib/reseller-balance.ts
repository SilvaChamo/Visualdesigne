import { getSupabaseAdmin } from '@/lib/supabase-admin';

/**
 * Debita o saldo do revendedor com bloqueio optimista: lê o saldo actual e
 * só aplica o UPDATE `WHERE saldo_mt = <valor lido>` — se outro pedido
 * alterou o saldo entretanto (ex: duas compras em simultâneo), a condição
 * falha, 0 linhas são afectadas, e devolvemos erro em vez de arriscar um
 * "lost update" que deixasse o saldo errado. Sem RPC/função nova na BD.
 */
export async function deductResellerBalance(
  supabase: ReturnType<typeof getSupabaseAdmin>,
  daUsername: string,
  valorMt: number,
): Promise<{ ok: boolean; error?: string }> {
  if (!supabase) return { ok: false, error: 'Supabase Service Role não configurado.' };

  const { data: existing } = await supabase
    .from('reseller_credits')
    .select('saldo_mt')
    .eq('da_username', daUsername)
    .maybeSingle();
  const saldoAtual = Number(existing?.saldo_mt) || 0;
  if (saldoAtual < valorMt) {
    return { ok: false, error: 'Saldo insuficiente.' };
  }

  const novoSaldo = saldoAtual - valorMt;
  const { data, error } = await supabase
    .from('reseller_credits')
    .update({ saldo_mt: novoSaldo, updated_at: new Date().toISOString() })
    .eq('da_username', daUsername)
    .eq('saldo_mt', saldoAtual)
    .select('saldo_mt');

  if (error) return { ok: false, error: error.message };
  if (!data || data.length === 0) {
    return { ok: false, error: 'O saldo foi alterado entretanto — tente novamente.' };
  }
  return { ok: true };
}

/** Devolve o valor ao saldo — usado quando o débito foi feito mas a activação do produto falhou a meio. */
export async function refundResellerBalance(
  supabase: ReturnType<typeof getSupabaseAdmin>,
  daUsername: string,
  valorMt: number,
): Promise<void> {
  if (!supabase) return;
  const { data: existing } = await supabase
    .from('reseller_credits')
    .select('saldo_mt')
    .eq('da_username', daUsername)
    .maybeSingle();
  const novoSaldo = (Number(existing?.saldo_mt) || 0) + valorMt;
  await supabase
    .from('reseller_credits')
    .upsert({ da_username: daUsername, saldo_mt: novoSaldo, updated_at: new Date().toISOString() }, { onConflict: 'da_username' });
}
