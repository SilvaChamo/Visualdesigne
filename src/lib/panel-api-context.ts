/**
 * Contexto API do painel — admin a impersonar revendedor (como no DirectAdmin).
 */

import { cookies } from 'next/headers';
import {
  getDirectAdminAPIForAuth,
  getDirectAdminAPIForDaUsername,
  type DirectAdminServerAPI,
} from '@/lib/directadmin-adapter';
import { getResellerDaUsername } from '@/lib/directadmin-credentials';
import type { MirrorScope } from '@/lib/panel-mirror-read';
import type { PanelStaffAuthSuccess } from '@/lib/panel-api-auth';

export const IMPERSONATE_COOKIE = 'vd_impersonate_reseller';

export async function readImpersonateDaUsername(): Promise<string | null> {
  const store = await cookies();
  const value = store.get(IMPERSONATE_COOKIE)?.value?.trim();
  return value || null;
}

export type PanelDaContext = {
  daApi: DirectAdminServerAPI;
  mirrorScope: MirrorScope;
  impersonating: string | null;
  effectiveRole: 'admin' | 'reseller';
};

export async function resolvePanelDaContext(auth: PanelStaffAuthSuccess): Promise<PanelDaContext> {
  const impersonating =
    auth.user.role === 'admin' ? await readImpersonateDaUsername() : null;

  console.log('[IMPERSONATE-DEBUG] resolvePanelDaContext', {
    authRole: auth.user.role,
    authEmail: auth.user.email,
    impersonating,
  });

  if (impersonating) {
    const daApi = await getDirectAdminAPIForDaUsername(impersonating);
    return {
      daApi,
      mirrorScope: { role: 'reseller', daUsername: impersonating },
      impersonating,
      effectiveRole: 'reseller',
    };
  }

  if (auth.user.role === 'reseller' || auth.user.role === 'manager') {
    // "manager" (conta profissional) usa exactamente o mesmo mecanismo de credenciais
    // escopadas que um revendedor — resolveDirectAdminCredentials() só distingue
    // 'admin' de "qualquer outra coisa", por isso fica sempre limitado à sua própria
    // conta DA (loadResellerCredentialsByUserId por auth.user.id), nunca a admin real.
    const scopedAuth = { id: auth.user.id, email: auth.user.email, role: 'reseller' as const };
    const daUsername = await getResellerDaUsername(scopedAuth);
    const daApi = await getDirectAdminAPIForAuth(scopedAuth);
    return {
      daApi,
      mirrorScope: {
        role: 'reseller',
        userId: auth.user.id,
        daUsername: daUsername || undefined,
      },
      impersonating: null,
      effectiveRole: 'reseller',
    };
  }

  const daApi = await getDirectAdminAPIForAuth({ id: auth.user.id, email: auth.user.email, role: 'admin' });
  return {
    daApi,
    mirrorScope: { role: 'admin', userId: auth.user.id },
    impersonating: null,
    effectiveRole: 'admin',
  };
}
