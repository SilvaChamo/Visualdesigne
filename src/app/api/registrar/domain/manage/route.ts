import { NextRequest, NextResponse } from 'next/server';
import { requireAdminOrReseller } from '@/lib/panel-api-auth';
import { dynadotAPI } from '@/lib/dynadot-adapter';

/** Detalhes e acções de gestão de domínio no registador (Dynadot). */
export async function GET(request: NextRequest) {
  const auth = await requireAdminOrReseller();
  if ('error' in auth) return auth.error;

  const domain = request.nextUrl.searchParams.get('domain')?.trim().toLowerCase();
  if (!domain) {
    return NextResponse.json({ success: false, error: 'Domínio obrigatório' }, { status: 400 });
  }

  const result = await dynadotAPI.getDomainDetails(domain);
  if (!result.success) {
    return NextResponse.json({ success: false, error: result.error }, { status: 400 });
  }

  return NextResponse.json({
    success: true,
    domain,
    isLocked: result.isLocked,
    autoRenew: result.autoRenew,
    expireDate: result.expireDate,
    status: result.status,
  });
}

export async function POST(request: NextRequest) {
  const auth = await requireAdminOrReseller();
  if ('error' in auth) return auth.error;

  let body: { domain?: string; action?: string; isEnabled?: boolean };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ success: false, error: 'JSON inválido' }, { status: 400 });
  }

  const domain = body.domain?.trim().toLowerCase();
  const action = body.action?.trim();

  if (!domain || !action) {
    return NextResponse.json({ success: false, error: 'Domínio e acção obrigatórios' }, { status: 400 });
  }

  if (action === 'unlock' || action === 'auth-code') {
    // A conta de registador (Dynadot) é única e partilhada por toda a empresa — sem um
    // registo de "este domínio pertence a este revendedor" não há forma segura de deixar um
    // revendedor desbloquear transferência ou obter o código EPP de um domínio que pode nem
    // ser seu. Estas duas acções permitem sequestrar um domínio, por isso ficam admin-only
    // até existir rastreio de posse por domínio.
    if (auth.user.role !== 'admin') {
      return NextResponse.json(
        { success: false, error: 'Acção restrita a administradores.' },
        { status: 403 },
      );
    }
  }

  if (action === 'unlock') {
    const result = await dynadotAPI.setTransferLock(domain, false);
    if (!result.success) {
      return NextResponse.json({ success: false, error: result.error }, { status: 400 });
    }
    return NextResponse.json({ success: true, isLocked: result.isLocked, message: 'Bloqueio de transferência removido.' });
  }

  if (action === 'auth-code') {
    const result = await dynadotAPI.getTransferAuthCode(domain);
    if (!result.success) {
      return NextResponse.json({ success: false, error: result.error }, { status: 400 });
    }
    return NextResponse.json({
      success: true,
      authCode: result.authCode,
      message: 'Código de transferência obtido.',
    });
  }

  if (action === 'autorenew') {
    if (typeof body.isEnabled !== 'boolean') {
      return NextResponse.json({ success: false, error: 'isEnabled obrigatório' }, { status: 400 });
    }
    const result = await dynadotAPI.setAutoRenew(domain, body.isEnabled);
    if (!result.success) {
      return NextResponse.json({ success: false, error: result.error }, { status: 400 });
    }
    return NextResponse.json({
      success: true,
      autoRenew: result.isEnabled,
      message: result.isEnabled ? 'Renovação automática activada.' : 'Renovação automática desactivada.',
    });
  }

  return NextResponse.json({ success: false, error: 'Acção desconhecida' }, { status: 400 });
}
