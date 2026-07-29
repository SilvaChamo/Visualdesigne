import { getSupabaseAdmin } from '@/lib/supabase-admin';

/** true se o ano já tiver um fecho anual gravado (ver accounting_year_closings) — nesse caso os
 * totais desse ano ficaram congelados e não podem voltar a mudar por baixo do tapete. */
export async function isYearClosed(supabase: ReturnType<typeof getSupabaseAdmin>, year: number): Promise<boolean> {
  if (!supabase) return false;
  const { data } = await supabase.from('accounting_year_closings').select('year').eq('year', year).maybeSingle();
  return Boolean(data);
}
