// Acesso a acções de domínio (SSL/DNS/PHP/transferência) escopado ao próprio
// dono. Staff (admin/reseller/manager) continua a passar sempre — o que
// muda é que agora um 'client' também pode chamar, mas só para um domínio
// que ele realmente possui (confirmado contra o mesmo critério usado no
// bootstrap do painel: username do panel_users ligado ao seu auth_user_id,
// ou o admin_email do site a bater com o email da conta).
import { NextResponse } from 'next/server';
import { requirePanelBootstrapAccess, type PanelBootstrapAuthSuccess } from '@/lib/panel-api-auth';
import { listMirrorWebsitesForClientUser } from '@/lib/panel-mirror-read';

type DomainAccessFailure = { error: NextResponse };

const ACCESS_DENIED = () =>
  NextResponse.json({ success: false, error: 'Acesso negado a este domínio.' }, { status: 403 });

export async function requireDaAccessForDomain(
  domain: string,
): Promise<PanelBootstrapAuthSuccess | DomainAccessFailure> {
  const auth = await requirePanelBootstrapAccess();
  if ('error' in auth) return auth;

  if (auth.user.role === 'admin' || auth.user.role === 'reseller' || auth.user.role === 'manager') {
    return auth;
  }

  // role === 'client'
  const clean = domain.trim().toLowerCase();
  if (!clean) return { error: ACCESS_DENIED() };

  const sites = await listMirrorWebsitesForClientUser(auth.user.id, auth.user.email);
  const owns = sites.some((s) => (s.domain || '').toLowerCase() === clean);
  if (!owns) return { error: ACCESS_DENIED() };

  return auth;
}
