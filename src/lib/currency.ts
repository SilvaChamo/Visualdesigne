/**
 * Taxa que forma os PREÇOS DE VENDA em MT a partir do custo em USD da
 * Dynadot (ver domain-tld-prices.ts, DomainSearch.tsx) — "custo × margem".
 * #26: não é a mesma coisa que converter um preço de venda já fixado em MT
 * (ex.: fixedPurchasePriceMt) de volta para USD — dividir esse preço fixo
 * por esta taxa devolve o custo original sem margem nenhuma, é por isso que
 * existe a getCheckoutUsdRate() separada abaixo. Não tocar neste sentido.
 */
export const MZN_TO_USD_RATE = 65 * 1.5 * 1.075;

/**
 * #26: taxa própria e separada para MOSTRAR/COBRAR em dólar um preço que já
 * está fixado em MT (ex.: o .com a 985 MT) — nunca reaproveitar
 * MZN_TO_USD_RATE aqui, que serve para formar preços a partir do custo, não
 * para os converter de volta. Valor por omissão: 985 MT ÷ 15,50 USD (decisão
 * do Silva, 2026-08-07 — dá margem semelhante à das vendas em meticais,
 * cobre o custo real de 10,88 USD na Dynadot). Configurável por variável de
 * ambiente para ajustar no servidor sem novo deploy do lado do servidor;
 * o valor mostrado ao cliente (bundle já construído) só muda com um deploy.
 */
const DEFAULT_CHECKOUT_USD_RATE = 985 / 15.5;

export function getCheckoutUsdRate(): number {
  return Number(process.env.NEXT_PUBLIC_CHECKOUT_USD_RATE) || DEFAULT_CHECKOUT_USD_RATE;
}

export function mtToUsd(amountMt: number): number {
  return amountMt / getCheckoutUsdRate();
}

export function usdToMtAmount(amountUsd: number): number {
  return amountUsd * getCheckoutUsdRate();
}

export function formatUsd(amountMt: number): string {
  return mtToUsd(amountMt).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}
