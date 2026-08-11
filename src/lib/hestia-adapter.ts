/**
 * Operações de ciclo de vida de conta no HestiaCP — equivalente ao subconjunto
 * de `directadmin-adapter.ts` realmente usado pelo checkout e pela gestão de
 * clientes (ver plano: criar/suspender/reactivar/apagar/mudar password).
 */

import { hestiaCall, hestiaCallJson } from '@/lib/hestia-client';

function isAlreadyExistsError(error?: string): boolean {
  return (error || '').toLowerCase().includes('exists');
}

export type HestiaPackage = { packageName: string };

export async function listPackages(): Promise<HestiaPackage[]> {
  const result = await hestiaCallJson<Record<string, unknown>>('v-list-user-packages');
  if (!result.ok) return [];
  return Object.keys(result.data)
    .filter((name) => name !== 'system')
    .map((packageName) => ({ packageName }));
}

export async function createAccount(input: {
  username: string;
  password: string;
  email: string;
  domain: string;
  packageName: string;
}): Promise<{ ok: boolean; error?: string }> {
  const userResult = await hestiaCall('v-add-user', [
    input.username,
    input.password,
    input.email,
    input.packageName,
  ]);
  if (!userResult.ok && !isAlreadyExistsError(userResult.error)) {
    return { ok: false, error: userResult.error };
  }

  const domainResult = await hestiaCall('v-add-web-domain', [input.username, input.domain]);
  if (!domainResult.ok && !isAlreadyExistsError(domainResult.error)) {
    return { ok: false, error: domainResult.error };
  }

  // SSL best-effort — a conta e o domínio já ficam criados mesmo que o
  // Let's Encrypt falhe (ex.: DNS ainda não propagado); não bloqueia o
  // resultado da criação da conta em si.
  await hestiaCall('v-add-letsencrypt-domain', [input.username, input.domain]).catch(() => {});

  return { ok: true };
}

export async function suspendAccount(username: string): Promise<{ ok: boolean; error?: string }> {
  const result = await hestiaCall('v-suspend-user', [username]);
  return { ok: result.ok, error: result.error };
}

export async function unsuspendAccount(username: string): Promise<{ ok: boolean; error?: string }> {
  const result = await hestiaCall('v-unsuspend-user', [username]);
  return { ok: result.ok, error: result.error };
}

export async function deleteAccount(username: string): Promise<{ ok: boolean; error?: string }> {
  const result = await hestiaCall('v-delete-user', [username]);
  return { ok: result.ok, error: result.error };
}

export async function changePassword(
  username: string,
  password: string,
): Promise<{ ok: boolean; error?: string }> {
  const result = await hestiaCall('v-change-user-password', [username, password]);
  return { ok: result.ok, error: result.error };
}

export type HestiaUser = {
  username: string;
  email: string;
  firstName: string;
  lastName: string;
  packageName: string;
  suspended: boolean;
  diskUsedMb: number;
  bandwidthUsedMb: number;
  diskLimitMb: number | null;
  bandwidthLimitMb: number | null;
};

function parseHestiaLimit(value: string | undefined): number | null {
  if (!value || value.toLowerCase() === 'unlimited') return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function parseHestiaUsage(value: string | undefined): number {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

/**
 * Lista todas as contas reais do Hestia (equivalente a `listAllHostingUsersFromDa`
 * do DirectAdmin) — usado pelo hestia-sync para espelhar o estado real do
 * servidor no Supabase. Exclui o próprio utilizador de login da API
 * (HESTIA_USER, ex: 'vdadmin'), que não é uma conta de cliente.
 */
export async function listUsers(): Promise<HestiaUser[]> {
  const result = await hestiaCallJson<Record<string, Record<string, string>>>('v-list-users');
  if (!result.ok) return [];
  const apiUser = (process.env.HESTIA_USER || 'vdadmin').trim();
  return Object.entries(result.data)
    .filter(([username]) => username !== apiUser)
    .map(([username, u]) => ({
      username,
      email: u.EMAIL || '',
      firstName: u.FNAME || '',
      lastName: u.LNAME || '',
      packageName: u.PACKAGE || '',
      suspended: (u.SUSPENDED || 'no').toLowerCase() === 'yes',
      diskUsedMb: parseHestiaUsage(u.U_DISK),
      bandwidthUsedMb: parseHestiaUsage(u.U_BANDWIDTH),
      diskLimitMb: parseHestiaLimit(u.DISK_QUOTA),
      // #campo-real: v-list-users devolve "BANDWIDTH", não "BANDWIDTH_QUOTA"
      // (confirmado directamente na resposta real do servidor) — o nome
      // errado fazia isto ser sempre null, mesmo com quota real definida.
      bandwidthLimitMb: parseHestiaLimit(u.BANDWIDTH),
    }));
}

export type HestiaWebDomain = {
  domain: string;
  ip: string;
  suspended: boolean;
  sslEnabled: boolean;
  diskUsedMb: number;
  bandwidthUsedMb: number;
};

/** Lista os domínios/websites reais de uma conta Hestia (equivalente a `da.listWebsites()` filtrado por dono). */
export async function listWebDomains(username: string): Promise<HestiaWebDomain[]> {
  const result = await hestiaCallJson<Record<string, Record<string, string>>>('v-list-web-domains', [username]);
  if (!result.ok) return [];
  return Object.entries(result.data).map(([domain, d]) => ({
    domain,
    ip: d.IP || '',
    suspended: (d.SUSPENDED || 'no').toLowerCase() === 'yes',
    sslEnabled: (d.SSL || 'no').toLowerCase() !== 'no' && Boolean(d.SSL),
    diskUsedMb: parseHestiaUsage(d.U_DISK),
    bandwidthUsedMb: parseHestiaUsage(d.U_BANDWIDTH),
  }));
}
