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

  // Domínios de teste criados por sessões anteriores a testar o adaptador Dynadot
  // (ex: "claude-adapter-test-1785931940279.com") ficam presos na conta partilhada:
  // a Dynadot só permite apagar via grace_delete dentro do período de carência,
  // que já expirou para estes (confirmado via API a 2026-08-11, código 409 "grace
  // period has expired"). Filtrar aqui é o único ponto único que cobre tanto
  // "Meus domínios" como "Domínios registados", sem esconder domínios reais.
  const isTestArtifact = (domain: string) => /^claude-[a-z0-9-]+-\d{10,}\.[a-z.]+$/i.test(domain);
  const domains = result.domains.filter((d) => !isTestArtifact(d.domain));

  return NextResponse.json({ success: true, domains });
}
