import { NextRequest, NextResponse } from 'next/server';
import { createClient as createAdminClient } from '@supabase/supabase-js';
import { requireAdmin } from '@/lib/admin-api-auth';
import { dynadotAPI } from '@/lib/dynadot-adapter';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

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

    const { data: authList, error: listErr } = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 });
    if (listErr) {
      return NextResponse.json({ success: false, error: listErr.message }, { status: 500 });
    }
    let targetUser = authList.users.find((u) => u.email?.toLowerCase() === email);
    if (!targetUser) {
      for (let page = 2; page <= 20 && !targetUser; page++) {
        const { data: nextPage } = await admin.auth.admin.listUsers({ page, perPage: 1000 });
        targetUser = nextPage.users.find((u) => u.email?.toLowerCase() === email);
        if (!nextPage.users?.length || nextPage.users.length < 1000) break;
      }
    }
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
      const { error: insertError } = await admin.from('domain_renewals').insert({
        user_id: targetUser.id,
        domain_name: domainName,
        registration_date: new Date().toISOString().slice(0, 10),
        expiration_date: details.expireDate || null,
        currency: 'MZN',
        status: 'active',
        registrar: 'VisualDesign',
        auto_renew: details.autoRenew ?? false,
        notes: 'Linha criada ao mover o domínio para esta conta (não existia registo anterior no painel).',
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
