import { NextRequest, NextResponse } from 'next/server';
import dns from 'dns';
import tls from 'tls';
import { requireDaAccessForDomain } from '@/lib/panel-domain-access';

type CheckResult = { ok: boolean; detail: string };

async function checkDns(domain: string): Promise<CheckResult> {
  try {
    const addresses = await dns.promises.resolve4(domain);
    if (addresses.length > 0) {
      return { ok: true, detail: addresses[0] };
    }
    return { ok: false, detail: 'Sem registos A' };
  } catch {
    try {
      const addresses = await dns.promises.resolve6(domain);
      if (addresses.length > 0) return { ok: true, detail: addresses[0] };
    } catch {
      /* cai para erro abaixo */
    }
    return { ok: false, detail: 'Domínio não resolve' };
  }
}

async function checkServer(domain: string): Promise<CheckResult> {
  try {
    const res = await fetch(`https://${domain}`, {
      method: 'HEAD',
      redirect: 'follow',
      signal: AbortSignal.timeout(8000),
    });
    return { ok: res.status < 500, detail: `HTTP ${res.status}` };
  } catch (e: unknown) {
    return { ok: false, detail: e instanceof Error ? e.message : 'Sem resposta' };
  }
}

function checkSsl(domain: string): Promise<CheckResult> {
  return new Promise((resolve) => {
    const socket = tls.connect(
      { host: domain, port: 443, servername: domain, timeout: 8000 },
      () => {
        const authorized = socket.authorized || /already trusted/i.test(socket.authorizationError?.toString() || '');
        resolve({
          ok: authorized,
          detail: authorized ? 'Certificado válido' : String(socket.authorizationError || 'Certificado inválido'),
        });
        socket.end();
      },
    );
    socket.on('timeout', () => {
      resolve({ ok: false, detail: 'Tempo esgotado na ligação TLS' });
      socket.destroy();
    });
    socket.on('error', (err) => {
      resolve({ ok: false, detail: err.message });
    });
  });
}

export async function GET(req: NextRequest) {
  const domain = req.nextUrl.searchParams.get('domain')?.trim().toLowerCase();
  if (!domain) {
    return NextResponse.json({ success: false, error: 'Domínio obrigatório' }, { status: 400 });
  }

  const auth = await requireDaAccessForDomain(domain);
  if ('error' in auth) return auth.error;

  const [dnsResult, serverResult, sslResult] = await Promise.all([
    checkDns(domain),
    checkServer(domain),
    checkSsl(domain),
  ]);

  return NextResponse.json({
    success: true,
    domain,
    dns: dnsResult,
    server: serverResult,
    ssl: sslResult,
  });
}
