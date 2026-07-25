export type HostingBillingCycle = 'monthly' | 'semiannual' | 'annual';

export interface HostingPlanDef {
  id: 'hosting-basico' | 'hosting-pro' | 'hosting-business' | 'hosting-enterprise';
  nameKey: string;
  basePrice: number;
  popular: boolean;
}

/**
 * Fonte única dos 4 planos oficiais de hospedagem (preço mensal em MT).
 * Usada por /precos/hospedagem, a marca VisualWeb, o motor de busca de domínios
 * e a validação de preço do carrinho, para nunca haver valores divergentes entre eles.
 */
export const HOSTING_PLANS: HostingPlanDef[] = [
  { id: 'hosting-basico', nameKey: 'pricing.hosting.basic', basePrice: 680, popular: false },
  { id: 'hosting-pro', nameKey: 'pricing.hosting.pro', basePrice: 1040, popular: true },
  { id: 'hosting-business', nameKey: 'pricing.hosting.business', basePrice: 1360, popular: false },
  { id: 'hosting-enterprise', nameKey: 'pricing.hosting.enterprise', basePrice: 2040, popular: false },
];

export function getHostingPlan(id: string): HostingPlanDef | undefined {
  return HOSTING_PLANS.find((p) => p.id === id);
}

/** O plano Básico tem desconto maior (20%/10%) que os restantes planos (10%/5%). */
function cycleRate(basePrice: number, cycle: HostingBillingCycle): number {
  if (cycle === 'monthly') return 1;
  const isBasic = basePrice === 680;
  if (cycle === 'semiannual') return isBasic ? 0.9 : 0.95;
  return isBasic ? 0.8 : 0.9;
}

/** Equivalente mensal já com o desconto do ciclo aplicado. */
export function getHostingMonthlyEquivalent(basePrice: number, cycle: HostingBillingCycle): number {
  if (cycle === 'monthly') return basePrice;
  return Math.round(basePrice * cycleRate(basePrice, cycle));
}

/** Preço total cobrado no ciclo (6x ou 12x o equivalente mensal). */
export function getHostingCyclePrice(basePrice: number, cycle: HostingBillingCycle): number {
  if (cycle === 'monthly') return basePrice;
  const months = cycle === 'semiannual' ? 6 : 12;
  return getHostingMonthlyEquivalent(basePrice, cycle) * months;
}

export function formatHostingPrice(val: number): string {
  if (val >= 1000) {
    const thousands = Math.floor(val / 1000);
    const remainder = val % 1000;
    return `${thousands}.${remainder.toString().padStart(3, '0')}`;
  }
  return val.toString();
}
