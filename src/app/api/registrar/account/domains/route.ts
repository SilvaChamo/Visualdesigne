import { NextResponse } from 'next/server';
import { requireAdminOrReseller } from '@/lib/panel-api-auth';
import { spaceshipAPI } from '@/lib/spaceship-adapter';

/**
 * Lista domínios na conta Spaceship (registador) — conta única partilhada por toda a
 * empresa, sem coluna de posse por revendedor. Stopgap: admin-only até existir rastreio
 * de posse por domínio (ver AUDITORIA_PAINEL_PLANO_CORRECAO.md, P1-6).
 */
export async function GET() {
  const auth = await requireAdminOrReseller();
  if ('error' in auth) return auth.error;
  if (auth.user.role !== 'admin') {
    return NextResponse.json({ success: false, error: 'Acção restrita a administradores.' }, { status: 403 });
  }

  const result = await spaceshipAPI.listAllDomains();
  if (!result.success) {
    return NextResponse.json(
      { success: false, error: result.error || 'Erro ao listar domínios' },
      { status: 400 },
    );
  }

  return NextResponse.json({ success: true, domains: result.domains });
}
