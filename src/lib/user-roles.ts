import {
  ADMIN_BOOTSTRAP_EMAILS,
  resolveRegistryPanelRole,
} from '@/lib/panel-user-registry';

export type UserRole = 'admin' | 'manager' | 'reseller' | 'client' | 'guest';

/** Emails com acesso bootstrap ao painel admin (não promovem papel na listagem). */
export const ADMIN_EMAILS = ADMIN_BOOTSTRAP_EMAILS;

type RoleSource = {
  email?: string | null;
  userMetadata?: Record<string, unknown> | null;
  appMetadata?: Record<string, unknown> | null;
  profileRole?: string | null;
  daUsername?: string | null;
  hasPaidProducts?: boolean;
};

function readRole(value: unknown): UserRole | null {
  if (
    value === 'admin' ||
    value === 'manager' ||
    value === 'reseller' ||
    value === 'client' ||
    value === 'guest'
  ) {
    return value;
  }
  return null;
}

/** Resolve o papel efectivo do utilizador */
export function resolveUserRole(source: RoleSource): UserRole {
  const email = (source.email || '').toLowerCase();

  // Emails de bootstrap (donos/operadores do painel) são sempre admin — evita que
  // a conta caia em "cliente"/"guest" no pós-login e só chegue ao admin ao
  // navegar manualmente para /dashboard (que já reconhecia este mesmo email).
  if (email && ADMIN_BOOTSTRAP_EMAILS.has(email)) return 'admin';

  const metaRole = readRole(source.userMetadata?.role) ?? readRole(source.appMetadata?.role);
  const profileRole = readRole(source.profileRole);

  if (profileRole === 'admin' || metaRole === 'admin') return 'admin';
  if (profileRole === 'manager' || metaRole === 'manager') return 'manager';

  const registryRole = resolveRegistryPanelRole({
    email,
    daUsername: source.daUsername,
  });
  if (registryRole) return registryRole;

  if (profileRole === 'reseller' || metaRole === 'reseller') return 'reseller';
  if (profileRole === 'client' || metaRole === 'client') return 'client';

  // #7: tinha de vir antes do "if guest → guest" abaixo — senão uma conta
  // marcada guest com compras confirmadas (hasPaidProducts) nunca chegava a
  // ser avaliada, ficava sempre presa em guest. É precisamente o mecanismo
  // que o botão de sincronizar utilizadores usa para reparar essas contas.
  if (source.hasPaidProducts) return 'client';

  if (profileRole === 'guest' || metaRole === 'guest') return 'guest';

  // Sem compras e sem role → visitante registado
  return 'guest';
}

export function getRedirectPathForRole(role: UserRole): string {
  switch (role) {
    case 'admin':
    case 'manager':
      return '/dashboard';
    case 'reseller':
      return '/revendedor';
    case 'client':
      return '/cliente';
    case 'guest':
    default:
      return '/guest';
  }
}

export function isPanelRole(role: UserRole): boolean {
  return role === 'admin' || role === 'manager' || role === 'reseller' || role === 'client';
}
