import { getEffectiveTldPrices } from '@/lib/domain-price-sync';
import { HOSTING_PLANS, getHostingCyclePrice, type HostingBillingCycle } from '@/lib/hosting-plans';

export type CatalogCartItem = {
  id: string;
  type: 'domain' | 'hosting' | 'ssl' | 'email';
  name: string;
  price: number;
  period: number;
  /** Presente só quando o item é uma transferência de domínio de outro registador
   * (não um registo novo) — código de autorização (EPP) do dono actual. */
  authCode?: string;
};

/** Mesma fórmula usada em toda a app para converter USD -> MT (ver src/lib/domain-tld-prices.ts). */
function usdToMt(usd: number): number {
  return Math.round(usd * 65 * 1.5 * 1.075);
}

/**
 * Único plano de email vendido através do carrinho (DomainSearch, CartDrawer,
 * /precos/email) — sem domínio adicional incluído; o domínio é escolhido
 * depois, no painel do cliente (ver ClientProductsHub / attach-email-domain).
 */
export const EMAIL_BASICO_ID = 'email-basico';
export const EMAIL_BASICO_PRICE_MT = 680;
const EMAIL_CATALOG: Record<string, { name: string; monthly: number; annual: number }> = {
  [EMAIL_BASICO_ID]: { name: 'Email Básico', monthly: EMAIL_BASICO_PRICE_MT, annual: EMAIL_BASICO_PRICE_MT * 12 },
};

const HOSTING_CYCLES: HostingBillingCycle[] = ['monthly', 'semiannual', 'annual'];

export type ResolvedCartItem = {
  item: CatalogCartItem;
  priceMt: number;
};

export type CatalogResolution = {
  resolved: ResolvedCartItem[];
  rejected: CatalogCartItem[];
};

/**
 * Recalcula o preço de cada item do carrinho a partir de uma fonte de verdade no servidor,
 * em vez de confiar no `price` que o browser envia. Itens que não sejam reconhecidos
 * são rejeitados (fail closed) — nunca ficam a passar com o preço enviado pelo cliente.
 */
export async function resolveCartItems(items: CatalogCartItem[]): Promise<CatalogResolution> {
  const resolved: ResolvedCartItem[] = [];
  const rejected: CatalogCartItem[] = [];
  const tldPrices = await getEffectiveTldPrices();

  for (const item of items) {
    if (item.type === 'domain') {
      const domainName = (item.id || item.name || '').toLowerCase().trim();
      const tld = tldPrices.find((t) => domainName.endsWith(t.value));
      if (!tld) {
        rejected.push(item);
        continue;
      }
      const years = Math.max(1, item.period || 1);
      // Transferência de outro registador usa o preço de transferência (normalmente
      // já inclui 1 ano), não o de registo novo.
      const unitPrice = item.authCode ? tld.transfer : tld.price;
      resolved.push({ item, priceMt: usdToMt(unitPrice * years) });
      continue;
    }

    if (item.type === 'hosting') {
      const plan = HOSTING_PLANS.find((p) => p.id === item.id);
      if (!plan) {
        rejected.push(item);
        continue;
      }
      // O carrinho envia o preço já resolvido (mensal, semestral ou anual) com period fixo em 1;
      // só aceitamos o valor se corresponder exatamente a um dos três ciclos oficiais do plano.
      const priceMt = HOSTING_CYCLES.map((cycle) => getHostingCyclePrice(plan.basePrice, cycle)).find(
        (price) => price === item.price
      );
      if (priceMt === undefined) {
        rejected.push(item);
        continue;
      }
      resolved.push({ item, priceMt });
      continue;
    }

    if (item.type === 'email') {
      const plan = EMAIL_CATALOG[item.id];
      if (!plan) {
        rejected.push(item);
        continue;
      }
      const priceMt = item.price === plan.monthly ? plan.monthly : item.price === plan.annual ? plan.annual : undefined;
      if (priceMt === undefined) {
        rejected.push(item);
        continue;
      }
      resolved.push({ item, priceMt });
      continue;
    }

    // 'ssl' e outros tipos ainda não têm catálogo server-side definido.
    rejected.push(item);
  }

  return { resolved, rejected };
}
