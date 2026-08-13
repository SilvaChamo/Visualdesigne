/**
 * Despachante DirectAdmin ↔ HestiaCP para as operações de gestão de contas
 * usadas pelo admin (`/api/admin/clientes`): suspender, reactivar, apagar,
 * mudar password. A criação de conta despacha directamente dentro de
 * `panel-server-provision.ts` (já tem a linha carregada com os dados
 * necessários); aqui só cobre as operações que actuam sobre uma conta já
 * identificada apenas pelo username.
 */

import { daPostViaSsh } from '@/lib/da-api-ssh';
import * as hestiaAdapter from '@/lib/hestia-adapter';
import { getDaSyncAdmin } from '@/lib/da-sync-schema';
import { PANEL_SLUG } from '@/lib/panel-tenant';

export type HostingProvider = 'directadmin' | 'hestia';

/** Servidor onde a conta com este username vive de facto. 'directadmin' por
 * omissão — mesmo default da coluna, e comportamento seguro se a conta não
 * for encontrada (nunca aponta silenciosamente para o servidor errado). */
export async function getProviderByUsername(username: string): Promise<HostingProvider> {
  const sb = getDaSyncAdmin();
  if (!sb || !username) return 'directadmin';
  const { data } = await sb
    .from('panel_auth_accounts')
    .select('provider')
    .eq('da_username', username)
    .eq('panel_slug', PANEL_SLUG.toLowerCase())
    .maybeSingle();
  return data?.provider === 'hestia' ? 'hestia' : 'directadmin';
}

export async function suspendHostingAccount(
  provider: HostingProvider,
  username: string,
): Promise<{ ok: boolean; error?: string }> {
  if (provider === 'hestia') return hestiaAdapter.suspendAccount(username);
  const r = await daPostViaSsh('CMD_API_SELECT_USERS', { suspend: 'yes', select0: username });
  return { ok: r.ok, error: r.error };
}

export async function unsuspendHostingAccount(
  provider: HostingProvider,
  username: string,
): Promise<{ ok: boolean; error?: string }> {
  if (provider === 'hestia') return hestiaAdapter.unsuspendAccount(username);
  const r = await daPostViaSsh('CMD_API_SELECT_USERS', { suspend: 'no', select0: username });
  return { ok: r.ok, error: r.error };
}

export async function deleteHostingAccount(
  provider: HostingProvider,
  username: string,
): Promise<{ ok: boolean; error?: string }> {
  if (provider === 'hestia') return hestiaAdapter.deleteAccount(username);
  const r = await daPostViaSsh('CMD_API_SELECT_USERS', { delete: 'yes', select0: username });
  return { ok: r.ok, error: r.error };
}

/** Remove só um site (não a conta inteira) — usado para limpar encomendas de
 * teste sem arriscar apagar a conta principal do servidor. Ainda não
 * implementado para DirectAdmin de propósito (não confirmado no servidor). */
export async function deleteHostingWebDomain(
  provider: HostingProvider,
  username: string,
  domain: string,
): Promise<{ ok: boolean; error?: string }> {
  if (provider === 'hestia') return hestiaAdapter.deleteWebDomain(username, domain);
  return { ok: false, error: 'Eliminação de site individual ainda não implementada para DirectAdmin.' };
}

export async function changeHostingAccountPassword(
  provider: HostingProvider,
  username: string,
  password: string,
): Promise<{ ok: boolean; error?: string }> {
  if (provider === 'hestia') return hestiaAdapter.changePassword(username, password);
  const r = await daPostViaSsh('CMD_API_MODIFY_USER', {
    action: 'single',
    user: username,
    passwd: password,
    passwd2: password,
  });
  return { ok: r.ok, error: r.error };
}
