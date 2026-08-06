/**
 * Taxa única de conversão MZN↔USD — a mesma já usada para cobrar via Stripe
 * (ver mznToUsdCents em stripe.ts) e para mostrar preços de domínios em MT
 * (ver usdToMt em package-catalog.ts). Não é uma taxa de câmbio ao minuto,
 * é a taxa "com margem" que o site já usa em todo o lado — manter uma só
 * fonte evita valores a divergir consoante o sítio da conversão.
 */
export const MZN_TO_USD_RATE = 65 * 1.5 * 1.075;

export function mtToUsd(amountMt: number): number {
  return amountMt / MZN_TO_USD_RATE;
}

export function usdToMtAmount(amountUsd: number): number {
  return amountUsd * MZN_TO_USD_RATE;
}

export function formatUsd(amountMt: number): string {
  return mtToUsd(amountMt).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}
