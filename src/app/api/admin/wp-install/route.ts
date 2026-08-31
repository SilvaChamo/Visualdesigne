import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin-api-auth';
import { createDirectAdminAPI, getAdminDirectAdminAPI } from '@/lib/directadmin-adapter';
import { loadResellerCredentialsByDaUsername } from '@/lib/da-credential-store';
import { getDaSyncAdmin } from '@/lib/da-sync-schema';
import { mirrorAfterDaMutation } from '@/lib/panel-mirror-write';
import { scheduleDaSync } from '@/lib/da-sync-engine';
import { installWordPressSite } from '@/lib/wp-cli-server';
import { getProviderByUsername } from '@/lib/hosting-provider';
import * as hestiaAdapter from '@/lib/hestia-adapter';

/** Dono real do domínio (username no servidor, DA ou Hestia) — 'admin' por
 * omissão quando não há registo próprio no mirror. */
async function resolveDomainOwner(domain: string): Promise<string> {
  const admin = getDaSyncAdmin();
  let owner = 'admin';
  if (admin) {
    const { data } = await admin.from('panel_sites').select('owner').eq('domain', domain).maybeSingle();
    if (data?.owner) owner = String(data.owner);
  }
  return owner;
}

async function daApiForOwner(owner: string) {
  if (!owner || owner === 'admin') return getAdminDirectAdminAPI();
  const stored = await loadResellerCredentialsByDaUsername(owner);
  if (!stored) return getAdminDirectAdminAPI();
  return createDirectAdminAPI({ role: 'reseller', user: stored.user, password: stored.password });
}

export async function POST(req: NextRequest) {
  const auth = await requireAdmin();
  if ('error' in auth) return auth.error;

  const body = await req.json().catch(() => ({}));
  const domain = String(body.domain || '').trim().toLowerCase();
  if (!domain) {
    return NextResponse.json({ success: false, error: 'Domínio obrigatório' }, { status: 400 });
  }

  const adminUser = String(body.adminUsername || body.adminUser || 'admin').trim();
  const adminPassword = String(body.adminPassword || '').trim();
  const adminEmail = String(body.adminEmail || '').trim();
  const dbName = String(body.databaseName || body.dbName || '').trim();
  const dbUser = String(body.databaseUser || body.dbUser || dbName).trim();
  const dbPassword = String(body.databasePassword || body.dbPass || '').trim();

  if (!adminPassword || !adminEmail || !dbName || !dbUser || !dbPassword) {
    return NextResponse.json({ success: false, error: 'Campos obrigatórios em falta' }, { status: 400 });
  }

  try {
    const owner = await resolveDomainOwner(domain);
    const provider = await getProviderByUsername(owner);

    // wp-cli-server já sabe encontrar a pasta certa em qualquer painel
    // (DirectAdmin .../domains/ ou Hestia .../web/) — só a criação da base
    // de dados é que precisa de despacho, porque cada painel tem a sua
    // própria forma de a criar.
    let dbNameFinal = dbName;
    let dbUserFinal = dbUser;

    if (provider === 'hestia') {
      const dbResult = await hestiaAdapter.createDatabase({
        username: owner,
        dbNameSuffix: dbName,
        dbUserSuffix: dbUser,
        password: dbPassword,
      });
      if (!dbResult.ok) {
        return NextResponse.json(
          { success: false, error: dbResult.error || 'Falha ao criar base de dados' },
          { status: 502 },
        );
      }
      // O Hestia prefixa sempre com "username_" — o wp-config.php tem de
      // usar o nome real da base, não o sufixo que veio do formulário.
      dbNameFinal = dbResult.database || dbName;
      dbUserFinal = dbResult.dbUser || dbUser;
    } else {
      const da = await daApiForOwner(owner);
      const dbResult = await da.createDatabase({ domain, dbName, dbUser, dbPassword });
      if (dbResult.success === false) {
        return NextResponse.json(
          { success: false, error: dbResult.error || dbResult.output || 'Falha ao criar base de dados' },
          { status: 502 },
        );
      }
    }

    await mirrorAfterDaMutation('createDatabase', { domain, dbName: dbNameFinal, dbUser: dbUserFinal, dbPassword });

    const result = await installWordPressSite({
      domain,
      directory: String(body.directory || '').trim(),
      siteTitle: String(body.siteName || domain).trim(),
      adminUser,
      adminPassword,
      adminEmail,
      dbName: dbNameFinal,
      dbUser: dbUserFinal,
      dbPassword,
      protocol: body.protocol === 'http' ? 'http' : 'https',
    });

    if (!result.ok) {
      return NextResponse.json({ success: false, error: result.output }, { status: 502 });
    }

    await mirrorAfterDaMutation('installWordPress', { domain });
    if (provider !== 'hestia') scheduleDaSync(400);

    return NextResponse.json({ success: true, message: 'WordPress instalado com sucesso.', output: result.output });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : 'Erro na instalação';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
