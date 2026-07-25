import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { resolveRoleForAuthUser } from '@/lib/server-auth-role';

import { ADMIN_EMAILS } from '@/lib/user-roles';

export type PanelAuthSuccess = {
  user: {
    id: string;
    email?: string;
    role: 'admin' | 'reseller';
  };
};

/** "manager" (conta profissional) tem scope próprio — nunca acesso admin. */
export type PanelStaffAuthSuccess = {
  user: {
    id: string;
    email?: string;
    role: 'admin' | 'reseller' | 'manager';
  };
};

type PanelAuthFailure = {
  error: NextResponse;
};

const STAFF_ACCESS_DENIED = () => ({
  error: NextResponse.json({ error: 'Acesso restrito a administradores ou revendedores' }, { status: 403 }),
});

async function resolvePanelStaffAuth(): Promise<PanelStaffAuthSuccess | PanelAuthFailure> {
  const supabase = await createClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();

  let user = session?.user ?? null;
  if (!user) {
    const {
      data: { user: verifiedUser },
      error,
    } = await supabase.auth.getUser();
    if (!error && verifiedUser) user = verifiedUser;
  }

  if (!user) {
    return {
      error: NextResponse.json({ error: 'Não autorizado' }, { status: 401 }),
    };
  }

  const email = (user.email || '').toLowerCase();
  const metadataRole = user.user_metadata?.role || user.app_metadata?.role;

  let effectiveRole = metadataRole;
  if (!effectiveRole || (effectiveRole !== 'admin' && effectiveRole !== 'manager' && effectiveRole !== 'reseller')) {
    try {
      effectiveRole = await resolveRoleForAuthUser(supabase, user);
    } catch {
      /* manter metadata */
    }
  }

  if (effectiveRole === 'admin' || ADMIN_EMAILS.has(email)) {
    return { user: { id: user.id, email, role: 'admin' } };
  }

  if (effectiveRole === 'reseller') {
    return { user: { id: user.id, email, role: 'reseller' } };
  }

  if (effectiveRole === 'manager') {
    return { user: { id: user.id, email, role: 'manager' } };
  }

  return STAFF_ACCESS_DENIED();
}

/**
 * Admin ou revendedor apenas — "manager" é explicitamente rejeitado (403). Rotas que fazem
 * sentido para uma conta "manager" com scope próprio devem usar
 * requireAdminResellerOrManager() em vez desta, caso a caso (ver AUDITORIA_PAINEL_PLANO_CORRECAO.md).
 */
export async function requireAdminOrReseller(): Promise<PanelAuthSuccess | PanelAuthFailure> {
  const result = await resolvePanelStaffAuth();
  if ('error' in result) return result;
  if (result.user.role === 'manager') {
    return STAFF_ACCESS_DENIED();
  }
  return { user: result.user as { id: string; email?: string; role: 'admin' | 'reseller' } };
}

/** Como requireAdminOrReseller(), mas também aceita "manager" — só para rotas já escopadas ao seu próprio site. */
export async function requireAdminResellerOrManager(): Promise<PanelStaffAuthSuccess | PanelAuthFailure> {
  return resolvePanelStaffAuth();
}

export type PanelBootstrapAuthSuccess = {
  user: {
    id: string;
    email?: string;
    role: 'admin' | 'manager' | 'reseller' | 'client';
  };
};

export async function requirePanelBootstrapAccess(): Promise<
  PanelBootstrapAuthSuccess | PanelAuthFailure
> {
  const supabase = await createClient();
  const {
    data: { user: verifiedUser },
    error,
  } = await supabase.auth.getUser();

  let user = verifiedUser;
  if (error || !user) {
    const {
      data: { session },
    } = await supabase.auth.getSession();
    user = session?.user ?? null;
  }

  if (!user) {
    return {
      error: NextResponse.json({ error: 'Não autorizado' }, { status: 401 }),
    };
  }

  const email = (user.email || '').toLowerCase();
  let effectiveRole = user.user_metadata?.role || user.app_metadata?.role;
  if (
    !effectiveRole ||
    (effectiveRole !== 'admin' &&
      effectiveRole !== 'manager' &&
      effectiveRole !== 'reseller' &&
      effectiveRole !== 'client')
  ) {
    try {
      effectiveRole = await resolveRoleForAuthUser(supabase, user);
    } catch {
      /* manter metadata */
    }
  }

  if (effectiveRole === 'client') {
    return { user: { id: user.id, email, role: 'client' } };
  }

  if (effectiveRole === 'manager') {
    return { user: { id: user.id, email, role: 'manager' } };
  }

  if (effectiveRole === 'admin' || ADMIN_EMAILS.has(email)) {
    return { user: { id: user.id, email, role: 'admin' } };
  }

  if (effectiveRole === 'reseller') {
    return { user: { id: user.id, email, role: 'reseller' } };
  }

  return {
    error: NextResponse.json({ error: 'Acesso negado' }, { status: 403 }),
  };
}
