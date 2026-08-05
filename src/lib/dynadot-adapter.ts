/**
 * Adaptador API Dynadot (RESTful v1).
 * Documentação: https://www.dynadot.com/domain/api-document
 *
 * Autenticação: Authorization: Bearer <apiKey> + X-Signature (HMAC-SHA256,
 * hex) de `${apiKey}\n${path}\n${xRequestId}\n${body}`, assinado com a
 * secret key. Todas as respostas vêm com HTTP 200 — o sucesso/erro real está
 * em `body.code` (200 = sucesso), nunca no status HTTP.
 */

import crypto from 'crypto';
import { profileName } from '@/lib/profile-db';

const DYNADOT_ENV = process.env.DYNADOT_ENV === 'production' ? 'production' : 'sandbox';
const BASE_URL =
  DYNADOT_ENV === 'production' ? 'https://api.dynadot.com' : 'https://api-sandbox.dynadot.com';

/**
 * Mapeia o perfil do painel (profiles) para o formato de contacto WHOIS que
 * a Dynadot exige para registar um domínio. Partilhado entre o registo
 * manual (admin, /api/domain-register) e o registo automático depois de uma
 * compra no carrinho (checkout-fulfillment.ts).
 */
export function mapProfileToDynadotContact(
  profile: Record<string, unknown> | null | undefined,
  userEmail: string,
) {
  const name = profileName(profile as { name?: string; nome?: string } | null, 'Utilizador').trim();

  let rawPhone = String(profile?.telefone || '').replace(/[\s\-()]/g, '');
  if (!rawPhone) rawPhone = '840000000';
  if (rawPhone.startsWith('+')) rawPhone = rawPhone.substring(1);

  const ccMap = ['258', '351', '55', '244', '238', '245', '239', '670'];
  let phoneCc = '258';
  let phoneNumber = rawPhone;
  const matchedCc = ccMap.find((cc) => rawPhone.startsWith(cc) && rawPhone.length > cc.length);
  if (matchedCc) {
    phoneCc = matchedCc;
    phoneNumber = rawPhone.substring(matchedCc.length);
  }

  const countryMap: Record<string, string> = {
    'moçambique': 'MZ',
    'mozambique': 'MZ',
    'portugal': 'PT',
    'brasil': 'BR',
    'brazil': 'BR',
    'angola': 'AO',
    'cabo verde': 'CV',
    'guiné-bissau': 'GW',
    'são tomé e príncipe': 'ST',
    'timor-leste': 'TL',
  };
  const cleanCountry = String(profile?.pais || 'Moçambique').toLowerCase().trim();
  const country = countryMap[cleanCountry] || 'MZ';
  const city = String(profile?.cidade || 'Maputo');

  return {
    name,
    email: userEmail || 'admin@your-domain.com',
    phone_cc: phoneCc,
    phone_number: phoneNumber,
    address1: String(profile?.morada || 'Av. Marginal 123'),
    city,
    state: city,
    zip: '1100',
    country,
    organization: profile?.empresa ? String(profile.empresa) : undefined,
  };
}

function getKeys() {
  if (DYNADOT_ENV === 'production') {
    const apiKey = process.env.DYNADOT_API_KEY;
    const secretKey = process.env.DYNADOT_SECRET_KEY;
    if (!apiKey || !secretKey) return null;
    return { apiKey, secretKey };
  }
  const apiKey = process.env.DYNADOT_SANDBOX_API_KEY;
  const secretKey = process.env.DYNADOT_SANDBOX_SECRET_KEY;
  if (!apiKey || !secretKey) return null;
  return { apiKey, secretKey };
}

function signRequest(apiKey: string, secretKey: string, path: string, requestId: string, body: string) {
  const stringToSign = `${apiKey}\n${path}\n${requestId}\n${body}`;
  return crypto.createHmac('sha256', secretKey).update(stringToSign).digest('hex');
}

type DynadotEnvelope<T> = {
  code: number;
  message?: string;
  data?: T;
  error?: { description?: string };
};

async function dynadotFetch<T = unknown>(
  method: string,
  path: string,
  body?: Record<string, unknown>,
): Promise<{ ok: true; data: T } | { ok: false; error: string }> {
  const keys = getKeys();
  if (!keys) return { ok: false, error: 'Chaves de API do registador não configuradas' };

  const bodyStr = body !== undefined ? JSON.stringify(body) : '';
  const requestId = crypto.randomUUID();
  const signature = signRequest(keys.apiKey, keys.secretKey, path, requestId, bodyStr);

  const headers: Record<string, string> = {
    Accept: 'application/json',
    Authorization: `Bearer ${keys.apiKey}`,
    'X-Request-ID': requestId,
    'X-Signature': signature,
  };
  if (bodyStr) headers['Content-Type'] = 'application/json';

  try {
    const res = await fetch(`${BASE_URL}${path}`, {
      method,
      headers,
      body: bodyStr || undefined,
    });
    const json = (await res.json().catch(() => ({}))) as DynadotEnvelope<T>;

    if (json.code !== 200) {
      return { ok: false, error: json.error?.description || json.message || `Erro do registador (código ${json.code})` };
    }
    return { ok: true, data: (json.data as T) ?? ({} as T) };
  } catch (e: unknown) {
    return { ok: false, error: e instanceof Error ? e.message : 'Erro ao contactar o serviço de registo' };
  }
}

/** Pesquisa de disponibilidade — não exige X-Signature. */
export async function checkAvailability(domain: string) {
  const clean = domain.toLowerCase().trim();
  const result = await dynadotFetch<{ domain_name: string; available: 'Yes' | 'No' }>(
    'GET',
    `/restful/v1/domains/${encodeURIComponent(clean)}/search`,
  );
  if (!result.ok) {
    return { available: false, error: result.error };
  }
  return {
    available: result.data.available === 'Yes',
    currency: 'USD',
  };
}

type DynadotDomainInfo = {
  domainName: string;
  expiration: number;
  registration: number;
  glueInfo?: { name_server_settings?: { name_servers?: { server_name: string }[] } };
  locked?: 'Yes' | 'No';
  renew_option?: string;
  status?: string;
};

export type DynadotDomainRow = {
  domain: string;
  status?: string;
  expireDate?: string;
  tld?: string;
};

function mapDynadotDomain(item: DynadotDomainInfo): DynadotDomainRow {
  const domain = item.domainName.toLowerCase();
  const parts = domain.split('.');
  const tld = parts.length > 1 ? parts.slice(1).join('.') : undefined;
  return {
    domain,
    status: item.status,
    expireDate: item.expiration ? new Date(item.expiration).toISOString().slice(0, 10) : undefined,
    tld,
  };
}

export const dynadotAPI = {
  async listAllDomains(): Promise<{ success: true; domains: DynadotDomainRow[] } | { success: false; error: string }> {
    const result = await dynadotFetch<{ domainInfo: DynadotDomainInfo[] }>('GET', '/restful/v1/domains');
    if (!result.ok) return { success: false, error: result.error };
    return { success: true, domains: (result.data.domainInfo || []).map(mapDynadotDomain) };
  },

  async getDomainDetails(domain: string): Promise<
    | { success: true; isLocked?: boolean; autoRenew?: boolean; expireDate?: string; status?: string }
    | { success: false; error: string }
  > {
    const clean = domain.toLowerCase().trim();
    const result = await dynadotFetch<{ domainInfo: DynadotDomainInfo[] }>(
      'GET',
      `/restful/v1/domains/${encodeURIComponent(clean)}`,
    );
    if (!result.ok) return { success: false, error: result.error };
    const info = result.data.domainInfo?.[0];
    if (!info) return { success: false, error: 'Domínio não encontrado' };
    return {
      success: true,
      isLocked: info.locked === 'Yes',
      autoRenew: info.renew_option === 'auto-renew',
      expireDate: info.expiration ? new Date(info.expiration).toISOString().slice(0, 10) : undefined,
      status: info.status,
    };
  },

  async getTransferAuthCode(domain: string): Promise<
    { success: true; authCode: string } | { success: false; error: string }
  > {
    const clean = domain.toLowerCase().trim();
    const result = await dynadotFetch<{ auth_code: string }>(
      'GET',
      `/restful/v1/domains/${encodeURIComponent(clean)}/transfer_auth_code`,
    );
    if (!result.ok) return { success: false, error: result.error };
    if (!result.data.auth_code) return { success: false, error: 'Código de transferência não disponível' };
    return { success: true, authCode: result.data.auth_code };
  },

  async setTransferLock(
    domain: string,
    isLocked: boolean,
  ): Promise<{ success: true; isLocked: boolean } | { success: false; error: string }> {
    const clean = domain.toLowerCase().trim();
    const result = await dynadotFetch('PUT', `/restful/v1/domains/${encodeURIComponent(clean)}/domain_lock`, {
      lock: isLocked,
    });
    if (!result.ok) {
      // A Dynadot devolve erro se o domínio já estiver no estado pedido — não é uma falha real.
      if (/already/i.test(result.error)) return { success: true, isLocked };
      return { success: false, error: result.error };
    }
    return { success: true, isLocked };
  },

  async setAutoRenew(
    domain: string,
    isEnabled: boolean,
  ): Promise<{ success: true; isEnabled: boolean } | { success: false; error: string }> {
    const clean = domain.toLowerCase().trim();
    const result = await dynadotFetch('PUT', `/restful/v1/domains/${encodeURIComponent(clean)}/renew_option`, {
      renew_option: isEnabled ? 'auto' : 'reset',
    });
    if (!result.ok) return { success: false, error: result.error };
    return { success: true, isEnabled };
  },

  /**
   * Aponta o domínio para nameservers próprios (ex: os que a Cloudflare
   * atribuiu a uma zona nova). Sem isto o domínio fica registado mas sem
   * nenhum DNS a apontar.
   */
  async setNameservers(
    domain: string,
    hosts: string[],
  ): Promise<{ success: true; hosts: string[] } | { success: false; error: string }> {
    if (hosts.length < 2) {
      return { success: false, error: 'São precisos pelo menos 2 nameservers' };
    }
    const clean = domain.toLowerCase().trim();
    const result = await dynadotFetch('PUT', `/restful/v1/domains/${encodeURIComponent(clean)}/nameservers`, {
      nameserver_list: hosts,
    });
    if (!result.ok) return { success: false, error: result.error };
    return { success: true, hosts };
  },

  async createContact(contactData: {
    name: string;
    email: string;
    phone_cc: string;
    phone_number: string;
    address1: string;
    city: string;
    state?: string;
    zip: string;
    country: string;
    organization?: string;
  }): Promise<{ success: true; contactId: string } | { success: false; error: string }> {
    const result = await dynadotFetch<{ contact_id: number }>('POST', '/restful/v1/contacts', {
      contact: contactData,
    });
    if (!result.ok) return { success: false, error: result.error };
    if (!result.data.contact_id) return { success: false, error: 'ID do contacto não retornado pela API' };
    return { success: true, contactId: String(result.data.contact_id) };
  },

  async registerDomain(
    domain: string,
    contactId: string,
    years = 1,
    autoRenew = true,
  ): Promise<{ success: true; message: string; raw?: unknown } | { success: false; error: string; raw?: unknown }> {
    const clean = domain.toLowerCase().trim();
    const result = await dynadotFetch<{ domain_name: string; expiration_date: string }>(
      'POST',
      `/restful/v1/domains/${encodeURIComponent(clean)}/register`,
      {
        domain: {
          duration: years,
          privacy: 'full',
          registrant_contactId: Number(contactId),
          admin_contactId: Number(contactId),
          tech_contactId: Number(contactId),
          billing_contactId: Number(contactId),
        },
      },
    );

    if (!result.ok) {
      return { success: false, error: result.error };
    }

    if (autoRenew) {
      await dynadotAPI.setAutoRenew(clean, true);
    }

    return {
      success: true,
      message: `Domínio ${clean} registado com sucesso.`,
      raw: result.data,
    };
  },
};
