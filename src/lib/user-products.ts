import type { SupabaseClient } from '@supabase/supabase-js';

export type ClientProductTier = 'none' | 'domain' | 'hosting' | 'both';

export type UserProductsSummary = {
  tier: ClientProductTier;
  hasPaidProducts: boolean;
  domains: Array<{
    id?: string;
    name: string;
    expirationDate?: string | null;
    status?: string | null;
  }>;
  hosting: Array<{
    id?: string;
    domain: string;
    plan?: string | null;
    expirationDate?: string | null;
    status?: string | null;
  }>;
  /** Planos de email (server='Mail' em hosting_renewals) — nunca contam para tier/hosting. */
  emailPlans: Array<{
    id?: string;
    /** Vazio até o cliente associar um domínio (ver attachDomainToEmailPlan). */
    domain: string;
    expirationDate?: string | null;
    status?: string | null;
  }>;
};

export async function fetchUserProductsSummary(
  supabase: SupabaseClient,
  userId: string,
): Promise<UserProductsSummary> {
  const domains: UserProductsSummary['domains'] = [];
  const hosting: UserProductsSummary['hosting'] = [];
  const emailPlans: UserProductsSummary['emailPlans'] = [];

  const [domainRenewals, hostingRenewals, pagamentos, sites] = await Promise.all([
    supabase
      .from('domain_renewals')
      .select('id, domain_name, expiration_date, status')
      .eq('user_id', userId),
    supabase
      .from('hosting_renewals')
      .select('id, domain_name, package_name, server, expiration_date, status')
      .eq('user_id', userId),
    supabase
      .from('pagamentos')
      .select('id, status, descricao')
      .eq('user_id', userId)
      .in('status', ['paid', 'completed']),
    supabase
      .from('site_clientes')
      .select('id, dominio, plano, status, data_renovacao')
      .eq('cliente_id', userId),
  ]);

  for (const row of domainRenewals.data ?? []) {
    domains.push({
      id: row.id,
      name: row.domain_name,
      expirationDate: row.expiration_date,
      status: row.status,
    });
  }

  for (const row of hostingRenewals.data ?? []) {
    // Planos de email (server='Mail') não são hospedagem real — nunca podem
    // contaminar tier/hasHosting, senão o painel mostra um cartão de
    // "Hospedagem" bogus para quem só comprou email.
    if (row.server === 'Mail') {
      emailPlans.push({
        id: row.id,
        domain: row.domain_name,
        expirationDate: row.expiration_date,
        status: row.status,
      });
      continue;
    }
    hosting.push({
      id: row.id,
      domain: row.domain_name,
      plan: row.package_name,
      expirationDate: row.expiration_date,
      status: row.status,
    });
  }

  for (const row of sites.data ?? []) {
    if (!hosting.some((h) => h.domain === row.dominio)) {
      hosting.push({
        id: row.id,
        domain: row.dominio,
        plan: row.plano,
        expirationDate: row.data_renovacao,
        status: row.status,
      });
    }
  }

  const paidCount =
    (pagamentos.data?.length ?? 0) +
    domains.filter((d) => d.status && d.status !== 'cancelled').length +
    hosting.filter((h) => h.status && !['cancelled', 'expired'].includes(String(h.status))).length +
    emailPlans.filter((e) => e.status && !['cancelled', 'expired'].includes(String(e.status))).length;

  const hasDomains = domains.length > 0;
  const hasHosting = hosting.length > 0;
  const hasEmailPlan = emailPlans.length > 0;

  let tier: ClientProductTier = 'none';
  if (hasDomains && hasHosting) tier = 'both';
  else if (hasHosting) tier = 'hosting';
  else if (hasDomains) tier = 'domain';

  return {
    tier,
    hasPaidProducts: paidCount > 0 || hasDomains || hasHosting || hasEmailPlan,
    domains,
    hosting,
    emailPlans,
  };
}
