import type { SupabaseClient } from '@supabase/supabase-js';
import { createClient as createAdminClient } from '@supabase/supabase-js';
import type { CatalogCartItem } from '@/lib/package-catalog';
import { generateProvisionerPassword } from '@/lib/reseller-auto-provision';
import { sanitizeDaUsername } from '@/lib/reseller-provision';
import { encryptDaSecret } from '@/lib/da-credential-store';
import { upsertPanelAuthAccount } from '@/lib/panel-auth-accounts';
import { upsertMirrorUser, upsertMirrorSite } from '@/lib/panel-mirror-write';
import { schedulePanelServerProvision } from '@/lib/panel-server-provision';
import { getDaSyncAdmin } from '@/lib/da-sync-schema';

// 'VisualDESIGN' é o único pacote real confirmado no DirectAdmin (via
// CMD_API_PACKAGES_USER) — os nomes VD-Host-*/VD-Email-* não existem no
// servidor e faziam a criação da conta falhar sempre. Usar este pacote para
// todos os planos até existirem pacotes dedicados por plano.
const CART_PLAN_TO_PACKAGE: Record<string, string> = {
  'hosting-basico': 'VisualDESIGN',
  'hosting-pro': 'VisualDESIGN',
  'hosting-business': 'VisualDESIGN',
  'hosting-enterprise': 'VisualDESIGN',
  'email-pro': 'VisualDESIGN',
  'email-starter': 'VisualDESIGN',
  'email-business': 'VisualDESIGN',
};

/**
 * Escolhe um username livre no espelho do painel (panel_users) — não no
 * DirectAdmin em si. O painel tem de conseguir registar a conta mesmo que o
 * servidor DA esteja indisponível ou tenha atingido o limite da licença, daí
 * verificar unicidade aqui e não via API DA (ver panel-server-provision.ts,
 * que faz a sincronização real de forma assíncrona e best-effort, com nova
 * tentativa automática mais tarde se falhar).
 */
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

function addYears(date: Date, years: number) {
  const d = new Date(date);
  d.setFullYear(d.getFullYear() + years);
  return d.toISOString().split('T')[0];
}

/**
 * Regista uma notificação para um admin quando uma escrita de tracking de
 * renovação falha. Sem isto, uma falha aqui fica só num console.warn que
 * ninguém vê — foi assim que hosting_renewals ficou meses sem existir sem
 * ninguém notar. Nunca deve poder bloquear o checkout em si.
 */
async function alertAdminOfTrackingFailure(context: string, message: string) {
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!serviceKey || !supabaseUrl) return;
  try {
    const admin = createAdminClient(supabaseUrl, serviceKey);
    const { data: adminProfile } = await admin
      .from('profiles')
      .select('id')
      .eq('role', 'admin')
      .limit(1)
      .maybeSingle();
    if (!adminProfile?.id) return;
    await admin.from('notifications').insert({
      user_id: adminProfile.id,
      title: 'Falha ao registar renovação',
      message: `[checkout-fulfillment] ${context}: ${message}`,
      type: 'error',
      category: 'system',
    });
  } catch {
    /* um alerta falhado nunca deve impedir o checkout de terminar */
  }
}

/**
 * Activa os produtos comprados (domínio/hospedagem/email) e promove a conta guest -> client.
 * Só deve ser chamada depois de o pagamento estar confirmado (webhook Stripe), nunca a partir
 * de um pedido directo do browser.
 */
export async function fulfillCheckout(
  supabase: SupabaseClient,
  userId: string,
  items: CatalogCartItem[],
  paymentMethod: string,
) {
  const today = new Date().toISOString().split('T')[0];
  const total = items.reduce((sum, item) => sum + (item.price || 0), 0);
  const created: string[] = [];

  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const admin = serviceKey && supabaseUrl ? createAdminClient(supabaseUrl, serviceKey) : null;
  const { data: authUser } = admin ? await admin.auth.admin.getUserById(userId) : { data: null };
  const currentMetadata = authUser?.user?.user_metadata || {};
  const email = authUser?.user?.email;
  const displayName = currentMetadata.nome || currentMetadata.full_name || email?.split('@')[0];

  // Password partilhada entre o login do painel e a(s) conta(s) de
  // hospedagem criadas nesta compra — gerada uma única vez (se houver pelo
  // menos um item de hospedagem) e sincronizada no perfil auth mais abaixo,
  // para que o botão "Direct Admin" no painel entre por SSO assim que o
  // servidor confirmar a criação.
  let sharedHostingPassword: string | null = null;

  for (const item of items) {
    const years = item.period || 1;
    const expires = addYears(new Date(), years);

    if (item.type === 'domain') {
      const domainName = item.name.toLowerCase().trim();
      const { error } = await supabase.from('domain_renewals').upsert(
        {
          user_id: userId,
          domain_name: domainName,
          registration_date: today,
          expiration_date: expires,
          renewal_price: item.price,
          currency: 'MZN',
          status: 'active',
          registrar: 'VisualDesign',
          notes: `Compra carrinho (${paymentMethod})`,
        },
        { onConflict: 'user_id,domain_name', ignoreDuplicates: false },
      );
      if (error) {
        const { error: insErr } = await supabase.from('domain_renewals').insert({
          user_id: userId,
          domain_name: domainName,
          registration_date: today,
          expiration_date: expires,
          renewal_price: item.price,
          currency: 'MZN',
          status: 'active',
          registrar: 'VisualDesign',
        });
        if (insErr) {
          console.warn('[checkout-fulfillment] domain_renewals:', insErr.message);
          await alertAdminOfTrackingFailure('domain_renewals', insErr.message);
        }
      }
      created.push(`domínio:${domainName}`);
    }

    if (item.type === 'hosting') {
      const domainName = item.name.toLowerCase().trim();
      const packageName = CART_PLAN_TO_PACKAGE[item.id] || 'VisualDESIGN';
      const { error: insErr } = await supabase.from('hosting_renewals').insert({
        user_id: userId,
        domain_name: domainName,
        package_name: packageName,
        start_date: today,
        expiration_date: expires,
        renewal_price: item.price,
        currency: 'MZN',
        status: 'active',
        server: 'DirectAdmin',
        notes: `Compra carrinho (${paymentMethod})`,
      });
      if (insErr) {
        console.warn('[checkout-fulfillment] hosting_renewals:', insErr.message);
        await alertAdminOfTrackingFailure('hosting_renewals', insErr.message);
      }
      created.push(`hospedagem:${domainName}`);

      // Regista a conta no painel (espelho Supabase) já, automaticamente —
      // o cliente é levado para o painel dele logo a seguir ao pagamento,
      // com a hospedagem lá mesmo antes de o servidor confirmar. A criação
      // real no DirectAdmin é tentada em segundo plano por
      // schedulePanelServerProvision, com nova tentativa automática mais
      // tarde se falhar (ex.: licença do servidor no limite) — nunca
      // bloqueia nem depende do checkout. Editar a conta (trocar pacote,
      // etc.) depois de criada é que fica manual, no painel admin.
      if (admin && email) {
        try {
          if (!sharedHostingPassword) sharedHostingPassword = generateProvisionerPassword();
          const daUsername = await pickAvailableMirrorUsername(domainName.split('.')[0] || email.split('@')[0]);

          const { saveProfileForAuthUser: savePassword } = await import('@/lib/profile-db');
          await savePassword(admin, userId, {
            da_password_encrypted: encryptDaSecret(sharedHostingPassword),
          });
          await upsertPanelAuthAccount(admin, {
            userId,
            email,
            role: 'client',
            name: displayName,
            serverLinked: false,
            daUsername: null,
          });
          await upsertMirrorUser({
            username: daUsername,
            email,
            first_name: displayName,
            acl: 'user',
            auth_user_id: userId,
            package_name: packageName,
          });
          await upsertMirrorSite({ domain: domainName, owner: daUsername, admin_email: email, package: packageName });

          schedulePanelServerProvision(daUsername, 800);
        } catch (provisionError) {
          const msg = provisionError instanceof Error ? provisionError.message : String(provisionError);
          console.error('[checkout-fulfillment] falha ao registar conta de hospedagem no painel:', msg);
          await alertAdminOfTrackingFailure('provisionamento de hospedagem', `${domainName}: ${msg}`);
        }
      }
    }

    if (item.type === 'email') {
      const serviceName = item.name.toLowerCase().trim();
      const packageName = CART_PLAN_TO_PACKAGE[item.id] || 'VisualDESIGN';
      const { error: insErr } = await supabase.from('hosting_renewals').insert({
        user_id: userId,
        domain_name: serviceName,
        package_name: packageName,
        start_date: today,
        expiration_date: expires,
        renewal_price: item.price,
        currency: 'MZN',
        status: 'active',
        server: 'Mail',
        notes: `Plano de e-mail (${paymentMethod})`,
      });
      if (insErr) {
        console.warn('[checkout-fulfillment] email plano:', insErr.message);
        await alertAdminOfTrackingFailure('hosting_renewals (email)', insErr.message);
      }
      created.push(`email:${serviceName}`);
    }
  }

  await supabase.from('pagamentos').insert({
    user_id: userId,
    domain: items.map((i) => i.name).join(', '),
    valor: total,
    vencimento: today,
    metodo: paymentMethod,
    pago_em: new Date().toISOString(),
    status: 'paid',
  });

  if (admin) {
    const { getProfileForAuthUser, saveProfileForAuthUser } = await import('@/lib/profile-db');
    const existingProfile = await getProfileForAuthUser(admin, userId, email);

    // Só promove guest -> client. Nunca despromove uma conta já elevada (admin/manager/reseller)
    // que, por exemplo, esteja apenas a testar uma compra.
    const ELEVATED_ROLES = ['admin', 'manager', 'reseller'];
    const isElevated =
      ELEVATED_ROLES.includes(existingProfile?.role || '') || ELEVATED_ROLES.includes(currentMetadata.role);

    if (!isElevated) {
      await admin.auth.admin.updateUserById(userId, {
        // Se foi provisionada hospedagem nesta compra, a password do login
        // passa a ser a mesma da conta de hospedagem, para o botão "Direct
        // Admin" entrar por SSO assim que o servidor confirmar a criação.
        ...(sharedHostingPassword ? { password: sharedHostingPassword } : {}),
        user_metadata: { ...currentMetadata, role: 'client', nome: displayName },
      });
    } else if (sharedHostingPassword) {
      await admin.auth.admin.updateUserById(userId, { password: sharedHostingPassword });
    }

    await saveProfileForAuthUser(admin, userId, {
      email,
      role: isElevated ? undefined : 'client',
      name: displayName,
    });
  }

  return { created, total };
}
