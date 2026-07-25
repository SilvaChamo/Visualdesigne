import { NextRequest, NextResponse } from 'next/server';
import { applyBrevoMxToDomain } from '@/lib/bind-email-dns';
import { daRequest } from '@/lib/directadmin';
import { requireAdminResellerOrManager } from '@/lib/panel-api-auth';
import { loadResellerCredentialsByUserId } from '@/lib/da-credential-store';
import { getMirrorSiteOwner } from '@/lib/panel-mirror-read';

/**
 * GET  ?action=list&domain=visualdesignmoz.com  → lista emails
 * POST action=create  → cria email
 * DELETE action=delete → apaga email
 * PATCH action=password → muda password
 */

async function canAccessDomain(role: 'admin' | 'reseller' | 'manager', userId: string, domain: string): Promise<boolean> {
  if (role === 'admin') return true;
  const creds = await loadResellerCredentialsByUserId(userId);
  if (!creds?.user) return false;
  const owner = await getMirrorSiteOwner(domain);
  return owner === creds.user;
}

/** daRequest só conhece 'admin'|'reseller' — "manager" usa sempre o caminho escopado 'reseller'. */
function toDaRole(role: 'admin' | 'reseller' | 'manager'): 'admin' | 'reseller' {
  return role === 'admin' ? 'admin' : 'reseller';
}

export async function GET(req: NextRequest) {
  try {
    const auth = await requireAdminResellerOrManager();
    if ('error' in auth) return auth.error;
    const ctx = auth.user;
    const daCtx = { id: ctx.id, email: ctx.email, role: toDaRole(ctx.role) };

    const { searchParams } = new URL(req.url);
    const action = searchParams.get('action') || 'list';
    const domain = searchParams.get('domain') || '';

    if (action === 'domains') {
      if (ctx.role !== 'admin') {
        return NextResponse.json({ success: false, error: 'Acção restrita a administradores.' }, { status: 403 });
      }
      // Listar todos os domínios que têm email no servidor
      const res = await daRequest('CMD_API_SHOW_ALL_USERS', 'GET', { json: 'yes' }, daCtx.role, daCtx);
      const domainsRes = await daRequest('CMD_API_ADDITIONAL_DOMAINS', 'GET', { domain: 'admin' }, daCtx.role, daCtx);
      return NextResponse.json({ success: true, raw: domainsRes });
    }

    if (action === 'list' && domain) {
      if (!(await canAccessDomain(ctx.role, ctx.id, domain))) {
        return NextResponse.json({ success: false, error: 'Domínio fora do seu painel.' }, { status: 403 });
      }
      // CMD_API_POP lista as contas de email para um domínio
      const res = await daRequest('CMD_API_POP', 'GET', { action: 'list', domain }, daCtx.role, daCtx);

      if (res.error) {
        return NextResponse.json({ success: false, error: res.text || 'Erro ao listar emails' });
      }

      // DA devolve: list[]=conta1&list[]=conta2&quota[conta1]=xxx&usage[conta1]=xxx
      const emails: Array<{ email: string; quota: string; usage: string }> = [];
      const rawData = res.data || {};

      // Extrair contas da lista
      const accounts: string[] = [];
      for (const [key, value] of Object.entries(rawData)) {
        if (key.startsWith('list')) {
          accounts.push(value as string);
        }
      }

      for (const account of accounts) {
        emails.push({
          email: `${account}@${domain}`,
          quota: rawData[`quota[${account}]`] as string || rawData[`quota`] as string || 'N/A',
          usage: rawData[`usage[${account}]`] as string || '0',
        });
      }

      return NextResponse.json({ success: true, domain, emails });
    }

    return NextResponse.json({ success: false, error: 'Acção ou domínio em falta' }, { status: 400 });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const auth = await requireAdminResellerOrManager();
    if ('error' in auth) return auth.error;
    const ctx = auth.user;
    const daCtx = { id: ctx.id, email: ctx.email, role: toDaRole(ctx.role) };

    const { action, domain, username, password, quota = '250' } = await req.json();

    if (!domain || !username || !password) {
      return NextResponse.json({ success: false, error: 'domain, username e password são obrigatórios' }, { status: 400 });
    }

    if (!(await canAccessDomain(ctx.role, ctx.id, domain))) {
      return NextResponse.json({ success: false, error: 'Domínio fora do seu painel.' }, { status: 403 });
    }

    if (action === 'create') {
      const res = await daRequest(
        'CMD_API_POP',
        'POST',
        { action: 'create', domain, user: username, passwd: password, passwd2: password, quota: String(quota) },
        daCtx.role,
        daCtx,
      );

      if (res.error) {
        return NextResponse.json({ success: false, error: res.details || res.text || 'Erro ao criar email' });
      }

      const dns = await applyBrevoMxToDomain(domain);

      return NextResponse.json({
        success: true,
        message: `Email ${username}@${domain} criado com sucesso!`,
        dnsBrevo: dns,
      });
    }

    return NextResponse.json({ success: false, error: 'Acção inválida' }, { status: 400 });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const auth = await requireAdminResellerOrManager();
    if ('error' in auth) return auth.error;
    const ctx = auth.user;
    const daCtx = { id: ctx.id, email: ctx.email, role: toDaRole(ctx.role) };

    const { domain, username } = await req.json();

    if (!domain || !username) {
      return NextResponse.json({ success: false, error: 'domain e username são obrigatórios' }, { status: 400 });
    }

    if (!(await canAccessDomain(ctx.role, ctx.id, domain))) {
      return NextResponse.json({ success: false, error: 'Domínio fora do seu painel.' }, { status: 403 });
    }

    const res = await daRequest('CMD_API_POP', 'POST', { action: 'delete', domain, user: username }, daCtx.role, daCtx);

    if (res.error) {
      return NextResponse.json({ success: false, error: res.details || res.text || 'Erro ao apagar email' });
    }

    return NextResponse.json({ success: true, message: `Email ${username}@${domain} apagado.` });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const auth = await requireAdminResellerOrManager();
    if ('error' in auth) return auth.error;
    const ctx = auth.user;
    const daCtx = { id: ctx.id, email: ctx.email, role: toDaRole(ctx.role) };

    const { domain, username, password } = await req.json();

    if (!domain || !username || !password) {
      return NextResponse.json({ success: false, error: 'domain, username e password são obrigatórios' }, { status: 400 });
    }

    if (!(await canAccessDomain(ctx.role, ctx.id, domain))) {
      return NextResponse.json({ success: false, error: 'Domínio fora do seu painel.' }, { status: 403 });
    }

    const res = await daRequest(
      'CMD_API_POP',
      'POST',
      { action: 'modify', domain, user: username, passwd: password, passwd2: password },
      daCtx.role,
      daCtx,
    );

    if (res.error) {
      return NextResponse.json({ success: false, error: res.details || res.text || 'Erro ao alterar password' });
    }

    return NextResponse.json({ success: true, message: `Password de ${username}@${domain} alterada.` });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
