import { NextRequest, NextResponse } from 'next/server';
import { createClient as createAdminClient, type SupabaseClient } from '@supabase/supabase-js';
import { requireAdmin } from '@/lib/admin-api-auth';
import { dynadotAPI } from '@/lib/dynadot-adapter';
import { DOMAIN_TLD_PRICES, domainRenewalPriceMt } from '@/lib/domain-tld-prices';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

async function listAllAuthUsers(admin: SupabaseClient) {
  const all: { id: string; email: string }[] = [];
  for (let page = 1; page <= 20; page++) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 1000 });
    if (error) break;
    for (const u of data.users) {
      if (u.email) all.push({ id: u.id, email: u.email });
    }
    if (!data.users?.length || data.users.length < 1000) break;
  }
  return all;
}

/** Estima o preço de renovação em MT pela extensão do domínio — usado só quando se cria uma
 * linha de domain_renewals do zero (domínio já existia na Dynadot mas nunca tinha sido
 * seguido no painel), para não ficar sem preço nenhum. */
function estimateRenewalPriceMt(domainName: string): number | null {
  const tld = DOMAIN_TLD_PRICES.find((t) => domainName.endsWith(t.value));
  if (!tld) return null;
  return domainRenewalPriceMt(tld, 1);
}

/** Lista contas do painel (id + email) para o selector de "mover domínio" — nunca texto livre. */
export async function GET() {
  const auth = await requireAdmin();
  if ('error' in auth) return auth.error;
  if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
    return NextResponse.json({ success: false, error: 'Supabase Service Role não configurado.' }, { status: 500 });
  }
  const admin = createAdminClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
  const accounts = await listAllAuthUsers(admin);
  accounts.sort((a, b) => a.email.localeCompare(b.email));
  return NextResponse.json({ success: true, accounts });
}

/**
 * Move um domínio de uma conta do painel para outra — ex.: um domínio
 * registado sob a conta admin (silva.chamo@) passa a pertencer à conta real
 * do cliente (silvadasilva@). Actualiza a linha de domain_renewals (ou
 * cria-a, com os dados reais da Dynadot, se o domínio ainda não tinha
 * nenhuma — foi registado antes de existir este mecanismo). Não mexe em
 * hosting nem em DNS — é só a "dona" do registo no painel.
 */
export async function POST(req: NextRequest) {
  const auth = await requireAdmin();
  if ('error' in auth) return auth.error;

  try {
    const { domain, targetEmail } = (await req.json()) as { domain?: string; targetEmail?: string };
    const domainName = (domain || '').toLowerCase().trim();
    const email = (targetEmail || '').toLowerCase().trim();
    if (!domainName || !email) {
      return NextResponse.json({ success: false, error: 'domain e targetEmail são obrigatórios.' }, { status: 400 });
    }

    if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
      return NextResponse.json({ success: false, error: 'Supabase Service Role não configurado.' }, { status: 500 });
    }
    const admin = createAdminClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

    const allAccounts = await listAllAuthUsers(admin);
    const targetUser = allAccounts.find((u) => u.email.toLowerCase() === email);
    if (!targetUser) {
      return NextResponse.json(
        { success: false, error: `Não existe nenhuma conta com o email ${email}.` },
        { status: 404 },
      );
    }

    const { data: existing } = await admin
      .from('domain_renewals')
      .select('id, user_id')
      .eq('domain_name', domainName)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    const previousUserId = existing?.user_id ?? null;

    if (existing?.id) {
      const { error: updateError } = await admin
        .from('domain_renewals')
        .update({ user_id: targetUser.id })
        .eq('id', existing.id);
      if (updateError) {
        return NextResponse.json({ success: false, error: updateError.message }, { status: 500 });
      }
    } else {
      const details = await dynadotAPI.getDomainDetails(domainName);
      if (!details.success) {
        return NextResponse.json(
          { success: false, error: `Domínio não encontrado na Dynadot: ${details.error}` },
          { status: 404 },
        );
      }
      // #19 (3.1): sem isto a linha ficava sem preço de renovação nenhum — estimado pela
      // extensão do domínio (mesma tabela usada no checkout); fica anotado como estimativa
      // nas notas para o admin saber que não veio de uma compra real.
      const estimatedPrice = estimateRenewalPriceMt(domainName);
      const { error: insertError } = await admin.from('domain_renewals').insert({
        user_id: targetUser.id,
        domain_name: domainName,
        registration_date: new Date().toISOString().slice(0, 10),
        expiration_date: details.expireDate || null,
        renewal_price: estimatedPrice,
        currency: 'MZN',
        status: 'active',
        registrar: 'VisualDesign',
        auto_renew: details.autoRenew ?? false,
        notes: `Linha criada ao mover o domínio para esta conta (não existia registo anterior no painel).${
          estimatedPrice ? ' Preço de renovação estimado pela extensão — confirmar valor real.' : ' Sem preço de renovação — extensão não reconhecida, confirmar valor manualmente.'
        }`,
      });
      if (insertError) {
        return NextResponse.json({ success: false, error: insertError.message }, { status: 500 });
      }
    }

    if (previousUserId && previousUserId !== targetUser.id) {
      await admin.from('notifications').insert({
        user_id: previousUserId,
        title: 'Domínio movido de conta',
        message: `O domínio ${domainName} deixou de estar associado a esta conta.`,
        type: 'info',
        category: 'system',
      });
    }
    await admin.from('notifications').insert({
      user_id: targetUser.id,
      title: 'Domínio associado à sua conta',
      message: `O domínio ${domainName} passou a estar associado à sua conta.`,
      type: 'success',
      category: 'system',
    });

    return NextResponse.json({ success: true, message: `${domainName} movido para ${email}.` });
  } catch (error: unknown) {
    console.error('[admin/domains/transfer-owner] POST:', error);
    const message = error instanceof Error ? error.message : 'Erro ao mover domínio';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
