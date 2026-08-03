import type { SupabaseClient } from '@supabase/supabase-js';
import { createClient as createAdminClient } from '@supabase/supabase-js';
import type { CatalogCartItem } from '@/lib/package-catalog';

// 'VisualDESIGN' é o único pacote real confirmado no DirectAdmin (via
// CMD_API_PACKAGES_USER) — os nomes VD-Host-*/VD-Email-* não existem no
// servidor. Serve só para o registo de tracking (hosting_renewals); a conta
// real é sempre criada manualmente pelo admin/revendedor/profissional (ver
// nota mais abaixo), não a partir do checkout.
const CART_PLAN_TO_PACKAGE: Record<string, string> = {
  'hosting-basico': 'VisualDESIGN',
  'hosting-pro': 'VisualDESIGN',
  'hosting-business': 'VisualDESIGN',
  'hosting-enterprise': 'VisualDESIGN',
  'email-pro': 'VisualDESIGN',
  'email-starter': 'VisualDESIGN',
  'email-business': 'VisualDESIGN',
};

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
 * Avisa o admin que há uma nova hospedagem comprada à espera de conta no
 * servidor. A criação real da conta (DirectAdmin) é sempre um passo manual
 * de admin/revendedor/profissional em "Criar conta de hospedagem" — o
 * checkout nunca cria contas de servidor sozinho, só regista a compra e
 * avisa quem tem de agir.
 */
async function notifyAdminOfPendingHostingProvision(domain: string, packageName: string, clientEmail?: string) {
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
      title: 'Nova hospedagem comprada — falta criar conta no servidor',
      message: `Domínio: ${domain}\nPacote: ${packageName}\nCliente: ${clientEmail || '—'}\n\nCriar em "Criar conta de hospedagem" no painel admin.`,
      type: 'info',
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

      // A conta no servidor (DirectAdmin) nunca é criada a partir do
      // checkout — é sempre um passo manual de admin/revendedor/profissional
      // em "Criar conta de hospedagem". O checkout só regista a compra e
      // avisa quem tem de agir.
      await notifyAdminOfPendingHostingProvision(domainName, packageName, email);
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
        user_metadata: { ...currentMetadata, role: 'client', nome: displayName },
      });
    }

    await saveProfileForAuthUser(admin, userId, {
      email,
      role: isElevated ? undefined : 'client',
      name: displayName,
    });
  }

  return { created, total };
}
