/**
 * Associa um domínio (próprio do cliente ou comprado na VisualDesign) ao
 * plano de email básico comprado sem domínio — usado tanto pela rota do
 * cliente (/api/client/attach-email-domain) como pelo fulfillment de compra
 * de um domínio novo (checkout-fulfillment.ts liga automaticamente se
 * houver um plano de email pendente).
 *
 * Regista só no espelho do painel (panel_sites/panel_users) + uma caixa de
 * correio em email_contas — nunca tenta criar conta real no DirectAdmin
 * (o mesmo motivo de sempre: licença do servidor sem espaço, e o cliente já
 * decidiu não perseguir isso). O painel fica activo e a mostrar o domínio
 * mesmo sem o servidor real configurado.
 */
import type { SupabaseClient } from '@supabase/supabase-js';
import { sanitizeDaUsername } from '@/lib/reseller-provision';
import { encryptStoredPassword } from '@/lib/panel-access-credentials';
import { generateProvisionerPassword } from '@/lib/reseller-auto-provision';
import { upsertMirrorUser, upsertMirrorSite } from '@/lib/panel-mirror-write';
import { getDaSyncAdmin } from '@/lib/da-sync-schema';

export const EMAIL_PLAN_PACKAGE_NAME = 'Email Básico';

async function pickAvailableMirrorUsername(base: string): Promise<string> {
  const sb = getDaSyncAdmin();
  const sanitized = sanitizeDaUsername(base);
  if (!sb) return sanitized;
  for (const candidate of [sanitized, `${sanitized}1`, `${sanitized}2`, `${sanitized}${Date.now().toString().slice(-4)}`]) {
    const { data } = await sb.from('panel_users').select('username').eq('username', candidate).maybeSingle();
    if (!data) return candidate;
  }
  return `${sanitized}${Date.now().toString().slice(-6)}`;
}

export type AttachEmailDomainResult =
  | { ok: true; domain: string }
  | { ok: false; error: string };

/** Encontra o plano de email do cliente que ainda não tem domínio associado. */
async function findPendingEmailPlan(admin: SupabaseClient, userId: string) {
  const { data } = await admin
    .from('hosting_renewals')
    .select('id, domain_name')
    .eq('user_id', userId)
    .eq('server', 'Mail')
    .eq('status', 'active')
    .eq('domain_name', '')
    .order('created_at', { ascending: true })
    .limit(1)
    .maybeSingle();
  return data as { id: string; domain_name: string } | null;
}

export async function attachDomainToEmailPlan(
  admin: SupabaseClient,
  userId: string,
  rawDomain: string,
  clientEmail: string,
  displayName?: string | null,
): Promise<AttachEmailDomainResult> {
  const domain = rawDomain.toLowerCase().trim();
  if (!domain.includes('.')) return { ok: false, error: 'Domínio inválido.' };

  const pending = await findPendingEmailPlan(admin, userId);
  if (!pending) return { ok: false, error: 'Sem plano de email pendente para este cliente.' };

  // "não pode ter nenhum domínio adicional" — só um domínio por plano.
  const { data: alreadyAttached } = await admin
    .from('hosting_renewals')
    .select('id')
    .eq('user_id', userId)
    .eq('server', 'Mail')
    .neq('domain_name', '')
    .limit(1)
    .maybeSingle();
  if (alreadyAttached?.id) {
    return { ok: false, error: 'Já tem um domínio associado ao seu plano de email.' };
  }

  const { data: existingSite } = await admin.from('panel_sites').select('domain').eq('domain', domain).maybeSingle();
  if (existingSite) {
    return { ok: false, error: 'Este domínio já está registado no painel.' };
  }

  const username = await pickAvailableMirrorUsername(domain.split('.')[0] || clientEmail.split('@')[0]);

  await upsertMirrorUser({
    username,
    email: clientEmail,
    first_name: displayName || clientEmail.split('@')[0],
    acl: 'user',
    auth_user_id: userId,
    package_name: EMAIL_PLAN_PACKAGE_NAME,
  });
  await upsertMirrorSite({ domain, owner: username, admin_email: clientEmail, package: EMAIL_PLAN_PACKAGE_NAME });

  const mailboxEmail = `contacto@${domain}`;
  await admin.from('email_contas').upsert(
    {
      email: mailboxEmail,
      senha_servidor: encryptStoredPassword(generateProvisionerPassword()),
      tipo_conta: 'webmail',
      status: 'active',
    },
    { onConflict: 'email' },
  );

  await admin.from('hosting_renewals').update({ domain_name: domain }).eq('id', pending.id);

  return { ok: true, domain };
}
