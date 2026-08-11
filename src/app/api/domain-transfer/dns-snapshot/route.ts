import { NextRequest, NextResponse } from 'next/server';
import dns from 'dns';
import { requirePanelBootstrapAccess } from '@/lib/panel-api-auth';
import { getSupabaseAdmin } from '@/lib/supabase-admin';

/**
 * Leitura pública de DNS (NS/MX) de um domínio ainda a transferir — não
 * depende da Dynadot nem de posse do domínio, é a mesma informação que
 * qualquer `dig` mostraria. Serve para o cliente ver, enquanto espera, para
 * onde o domínio aponta agora (ainda no registador anterior).
 */
export async function GET(request: NextRequest) {
  const auth = await requirePanelBootstrapAccess();
  if ('error' in auth) return auth.error;

  const domain = request.nextUrl.searchParams.get('domain')?.trim().toLowerCase();
  if (!domain) {
    return NextResponse.json({ success: false, error: 'Domínio obrigatório' }, { status: 400 });
  }

  // Só deixa ver o snapshot de domínios com um pedido de transferência
  // associado ao próprio utilizador (ou qualquer um, se admin) — evita que
  // isto vire uma ferramenta genérica de lookup DNS para qualquer domínio.
  const supabase = getSupabaseAdmin();
  if (!supabase) {
    return NextResponse.json({ success: false, error: 'Serviço indisponível.' }, { status: 503 });
  }
  let ownershipQuery = supabase.from('domain_transfer_requests').select('id').eq('domain_name', domain).limit(1);
  if (auth.user.role !== 'admin') {
    ownershipQuery = ownershipQuery.eq('user_id', auth.user.id);
  }
  const { data: owned } = await ownershipQuery.maybeSingle();
  if (!owned) {
    return NextResponse.json({ success: false, error: 'Sem pedido de transferência para este domínio.' }, { status: 404 });
  }

  const [ns, mx] = await Promise.all([
    dns.promises.resolveNs(domain).catch(() => [] as string[]),
    dns.promises
      .resolveMx(domain)
      .then((records) => records.sort((a, b) => a.priority - b.priority).map((r) => r.exchange))
      .catch(() => [] as string[]),
  ]);

  return NextResponse.json({ success: true, domain, nameservers: ns, mailExchangers: mx });
}
