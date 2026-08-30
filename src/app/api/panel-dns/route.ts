import { NextRequest, NextResponse } from 'next/server';
import { daAddDnsRecord, daDeleteDnsRecord, normalizeDnsNameForDa } from '@/lib/da-dns-ops';
import {
  loadResellerCredentialsByDaUsername,
  loadResellerCredentialsByUserId,
  resolveOwnerDaUsername,
} from '@/lib/da-credential-store';
import { scheduleDaSync } from '@/lib/da-sync-engine';
import { getDaSyncAdmin } from '@/lib/da-sync-schema';
import { requireDaAccessForDomain } from '@/lib/panel-domain-access';
import type { PanelStaffAuthSuccess } from '@/lib/panel-api-auth';
import { resolvePanelDaContext } from '@/lib/panel-api-context';
import { getMirrorSiteOwner, isMirrorStale, listMirrorDns } from '@/lib/panel-mirror-read';
import { deleteMirrorDnsById, upsertMirrorDns } from '@/lib/panel-mirror-write';
import { resolveDirectAdminCredentials, resolveDirectAdminCredentialsForDomainOwner } from '@/lib/directadmin-credentials';

async function canAccessDomain(
  role: 'admin' | 'reseller' | 'manager' | 'profissional',
  userId: string,
  domain: string,
  impersonatingDaUsername?: string | null,
): Promise<boolean> {
  if (impersonatingDaUsername) {
    const owner = await getMirrorSiteOwner(domain);
    return owner === impersonatingDaUsername;
  }
  if (role === 'admin') return true;
  const username = await resolveOwnerDaUsername(userId);
  if (!username) return false;
  const owner = await getMirrorSiteOwner(domain);
  return owner === username;
}

/** DNS por DirectAdmin não tem equivalente Hestia ainda — mensagem correcta
 * em vez de "credenciais indisponíveis" (que sugeria um problema de sync)
 * quando a causa real é a conta já estar no Hestia. */
async function missingDaCredsMessage(daUsername?: string | null): Promise<string> {
  if (daUsername) {
    const { getProviderByUsername } = await import('@/lib/hosting-provider');
    if ((await getProviderByUsername(daUsername)) === 'hestia') {
      return 'Esta conta já está no Hestia — a gestão de DNS por aqui ainda só cobre contas DirectAdmin.';
    }
  }
  return 'Credenciais de revendedor indisponíveis';
}

async function resolveDaCreds(
  role: 'admin' | 'reseller' | 'manager' | 'profissional',
  userId: string,
  impersonatingDaUsername?: string | null,
) {
  if (impersonatingDaUsername) {
    const stored = await loadResellerCredentialsByDaUsername(impersonatingDaUsername);
    if (!stored) throw new Error(await missingDaCredsMessage(impersonatingDaUsername));
    return { role: 'reseller' as const, user: stored.user, password: stored.password };
  }
  if (role === 'admin') return resolveDirectAdminCredentials('admin');
  const stored = await loadResellerCredentialsByUserId(userId);
  if (!stored) {
    throw new Error(await missingDaCredsMessage(await resolveOwnerDaUsername(userId)));
  }
  return { role: 'reseller' as const, user: stored.user, password: stored.password };
}

export async function GET(req: NextRequest) {
  try {
    const domain = new URL(req.url).searchParams.get('domain')?.trim();
    if (!domain) {
      return NextResponse.json({ success: false, error: 'Domínio obrigatório' }, { status: 400 });
    }

    // Cliente 'dono' do domínio (verificado contra o mirror) pode ver/editar a
    // sua própria zona DNS; staff (admin/reseller/manager) continua igual.
    const auth = await requireDaAccessForDomain(domain);
    if ('error' in auth) return auth.error;

    let mirrorScope: Awaited<ReturnType<typeof resolvePanelDaContext>>['mirrorScope'];
    let daApi: Awaited<ReturnType<typeof resolvePanelDaContext>>['daApi'];

    if (auth.user.role === 'client') {
      const { getDirectAdminAPIForAuth } = await import('@/lib/directadmin-adapter');
      daApi = await getDirectAdminAPIForAuth({ id: auth.user.id, email: auth.user.email, role: 'admin' });
      mirrorScope = { role: 'admin', userId: auth.user.id };
    } else {
      const ctx = await resolvePanelDaContext(auth as PanelStaffAuthSuccess);
      if (!(await canAccessDomain(auth.user.role, auth.user.id, domain, ctx.impersonating))) {
        return NextResponse.json({ success: false, error: 'Sem acesso a este domínio' }, { status: 403 });
      }
      mirrorScope = ctx.mirrorScope;
      daApi = ctx.daApi;
    }

    const stale = await isMirrorStale(120);
    if (stale) scheduleDaSync(0);

    let records = await listMirrorDns(domain, mirrorScope);
    let source: 'mirror' | 'live' = 'mirror';

    if (records.length === 0) {
      try {
        const live = await daApi.listDNS(domain);
        records = live.map((r) => ({
          id: '',
          name: String(r.name || ''),
          type: String(r.type || 'A').toUpperCase(),
          content: String(r.content || r.value || ''),
          ttl: Number(r.ttl) || 3600,
        }));
        source = 'live';
        scheduleDaSync(0);
      } catch {
        /* espelho vazio — devolver lista vazia */
      }
    }

    return NextResponse.json({
      success: true,
      domain,
      records,
      source,
    });
  } catch (e: unknown) {
    return NextResponse.json(
      { success: false, error: e instanceof Error ? e.message : 'Erro ao carregar DNS' },
      { status: 500 },
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const domain = String(body.domainName || body.domain || '').trim();
    const name = String(body.name || '').trim();
    const type = String(body.type || 'A').toUpperCase();
    const value = String(body.value || body.content || '').trim();
    const ttl = parseInt(String(body.ttl || '3600'), 10) || 3600;

    if (!domain || !name || !type || !value) {
      return NextResponse.json({ success: false, error: 'Campos incompletos' }, { status: 400 });
    }

    const auth = await requireDaAccessForDomain(domain);
    if ('error' in auth) return auth.error;

    let creds: Awaited<ReturnType<typeof resolveDaCreds>>;
    if (auth.user.role === 'client') {
      creds = await resolveDirectAdminCredentialsForDomainOwner(domain);
    } else {
      const { impersonating } = await resolvePanelDaContext(auth as PanelStaffAuthSuccess);
      if (!(await canAccessDomain(auth.user.role, auth.user.id, domain, impersonating))) {
        return NextResponse.json({ success: false, error: 'Sem acesso a este domínio' }, { status: 403 });
      }
      creds = await resolveDaCreds(auth.user.role, auth.user.id, impersonating);
    }

    const result = await daAddDnsRecord(creds, { domain, name, type, value, ttl });
    if (!result.ok) {
      return NextResponse.json({ success: false, error: result.error || 'Falha ao criar registo' }, { status: 502 });
    }

    const mirrorName = normalizeDnsNameForDa(name, domain).replace(/\.$/, '');
    const mirror = await upsertMirrorDns({ domain, name: mirrorName, type, value, ttl });
    scheduleDaSync(30);

    return NextResponse.json({
      success: true,
      message: 'Registo DNS criado com sucesso.',
      id: mirror.id,
    });
  } catch (e: unknown) {
    return NextResponse.json(
      { success: false, error: e instanceof Error ? e.message : 'Erro ao criar registo DNS' },
      { status: 500 },
    );
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const body = await req.json();
    const domain = String(body.domainName || body.domain || '').trim();
    const id = String(body.id || '').trim();

    if (!domain || !id) {
      return NextResponse.json({ success: false, error: 'Domínio e registo obrigatórios' }, { status: 400 });
    }

    const auth = await requireDaAccessForDomain(domain);
    if ('error' in auth) return auth.error;

    let creds: Awaited<ReturnType<typeof resolveDaCreds>>;
    if (auth.user.role === 'client') {
      creds = await resolveDirectAdminCredentialsForDomainOwner(domain);
    } else {
      const { impersonating } = await resolvePanelDaContext(auth as PanelStaffAuthSuccess);
      if (!(await canAccessDomain(auth.user.role, auth.user.id, domain, impersonating))) {
        return NextResponse.json({ success: false, error: 'Sem acesso a este domínio' }, { status: 403 });
      }
      creds = await resolveDaCreds(auth.user.role, auth.user.id, impersonating);
    }

    const admin = getDaSyncAdmin();
    if (!admin) {
      return NextResponse.json({ success: false, error: 'Base de dados indisponível' }, { status: 503 });
    }

    const { data: row, error: fetchErr } = await admin
      .from('panel_dns')
      .select('*')
      .eq('id', id)
      .eq('domain', domain)
      .maybeSingle();

    if (fetchErr || !row) {
      return NextResponse.json({ success: false, error: 'Registo não encontrado' }, { status: 404 });
    }

    const result = await daDeleteDnsRecord(creds, {
      domain,
      name: String(row.name),
      type: String(row.type),
      value: String(row.value),
    });
    if (!result.ok) {
      return NextResponse.json({ success: false, error: result.error || 'Falha ao remover registo' }, { status: 502 });
    }

    await deleteMirrorDnsById(id);
    scheduleDaSync(30);

    return NextResponse.json({ success: true, message: 'Registo DNS removido com sucesso.' });
  } catch (e: unknown) {
    return NextResponse.json(
      { success: false, error: e instanceof Error ? e.message : 'Erro ao remover registo DNS' },
      { status: 500 },
    );
  }
}
