import { NextResponse } from 'next/server';
import { getEffectiveTldPrices } from '@/lib/domain-price-sync';

/** Preços de domínio por extensão (registo/renovação/transferência), já com a
 * sincronização real da Dynadot aplicada quando existir. Informação pública —
 * é a mesma que já aparece nas páginas de preços do site. */
export async function GET() {
  const prices = await getEffectiveTldPrices();
  return NextResponse.json({ success: true, prices });
}
