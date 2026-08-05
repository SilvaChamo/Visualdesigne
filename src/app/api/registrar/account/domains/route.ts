import { NextResponse } from 'next/server';
import { requireAdminOrReseller } from '@/lib/panel-api-auth';
import { readImpersonateDaUsername } from '@/lib/panel-api-context';
import { dynadotAPI } from '@/lib/dynadot-adapter';

/**
 * Lista domínios na conta Dynadot (registador) — conta única partilhada por toda a
 * empresa, sem coluna de posse por revendedor. Stopgap: admin-only até existir rastreio
 * de posse por domínio (ver AUDITORIA_PAINEL_PLANO_CORRECAO.md, P1-6).
 */
export async function GET() {
  const auth = await requireAdminOrReseller();
  if ('error' in auth) return auth.error;
  // Um admin a impersonar um revendedor deve ver exactamente o que esse revendedor veria
  // (bloqueado, como já acontece para revendedores reais) — nunca a conta partilhada inteira.
  const impersonating =
    auth.user.role === 'admin' ? await readImpersonateDaUsername() : null;
  if (auth.user.role !== 'admin' || impersonating) {
    return NextResponse.json({ success: false, error: 'Acção restrita a administradores.' }, { status: 403 });
  }

  const result = await dynadotAPI.listAllDomains();
  if (!result.success) {
    return NextResponse.json(
      { success: false, error: result.error || 'Erro ao listar domínios' },
      { status: 400 },
    );
  }

  return NextResponse.json({ success: true, domains: result.domains });
}
