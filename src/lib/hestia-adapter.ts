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
