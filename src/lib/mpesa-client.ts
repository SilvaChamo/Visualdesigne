/**
 * Cliente M-Pesa Moçambique (Vodacom) — API C2B Single Stage.
 *
 * Autenticação: a API Key é cifrada com a Public Key da conta (RSA,
 * padding PKCS#1 v1.5 — nunca OAEP, a Vodacom devolve 401 sem explicação
 * com o padding errado) e enviada como Bearer token, gerado a cada pedido.
 *
 * A protecção Incapsula à frente do sandbox é instável — confirmámos por
 * testes directos que o mecanismo (chave, token, endpoint) está correcto,
 * mas só uma fracção dos pedidos chega mesmo à aplicação (o resto leva
 * 502/504 da própria Incapsula, antes da app M-Pesa). Por isso as chamadas
 * aqui repetem automaticamente nesses casos.
 */

import crypto from 'node:crypto';

function readEnv(name: string): string {
  const value = process.env[name];
  if (!value) return '';
  return value.trim().replace(/^['"]|['"]$/g, '');
}

function toPem(publicKeyRaw: string): string {
  const body = publicKeyRaw.match(/.{1,64}/g)?.join('\n') ?? publicKeyRaw;
  return `-----BEGIN PUBLIC KEY-----\n${body}\n-----END PUBLIC KEY-----\n`;
}

function generateToken(apiKey: string, publicKeyRaw: string): string {
  const encrypted = crypto.publicEncrypt(
    { key: toPem(publicKeyRaw), padding: crypto.constants.RSA_PKCS1_PADDING },
    Buffer.from(apiKey, 'utf8'),
  );
  return encrypted.toString('base64');
}

function resolveMpesaConfig() {
  const apiKey = readEnv('MPESA_API_KEY');
  const publicKey = readEnv('MPESA_PUBLIC_KEY');
  const serviceProviderCode = readEnv('MPESA_SERVICE_PROVIDER_CODE');
  const host = readEnv('MPESA_HOST') || 'api.sandbox.vm.co.mz';
  const port = readEnv('MPESA_PORT') || '18352';
  if (!apiKey || !publicKey || !serviceProviderCode) {
    throw new Error('Credenciais M-Pesa ausentes (MPESA_API_KEY / MPESA_PUBLIC_KEY / MPESA_SERVICE_PROVIDER_CODE).');
  }
  return { apiKey, publicKey, serviceProviderCode, host, port };
}

// Cabeçalhos "de navegador" — sem isto a protecção Incapsula à frente do
// sandbox rejeita o pedido com 502 antes de chegar à app (confirmado por
// testes: o mesmo pedido sem User-Agent/Accept falha sempre).
const BROWSER_LIKE_HEADERS = {
  Accept: 'application/json',
  'User-Agent':
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36',
};

export type MpesaC2BInput = {
  msisdn: string;
  amountMt: number;
  thirdPartyReference: string;
  transactionReference: string;
};

export type MpesaC2BResult =
  | { ok: true; transactionId?: string; conversationId?: string; raw: string }
  | { ok: false; error: string; raw?: string; gatewayNoise?: boolean };

async function singleAttempt(input: MpesaC2BInput): Promise<MpesaC2BResult> {
  const { apiKey, publicKey, serviceProviderCode, host, port } = resolveMpesaConfig();
  const token = generateToken(apiKey, publicKey);

  const body = {
    input_TransactionReference: input.transactionReference,
    input_CustomerMSISDN: input.msisdn,
    input_Amount: String(Math.round(input.amountMt)),
    input_ThirdPartyReference: input.thirdPartyReference,
    input_ServiceProviderCode: serviceProviderCode,
  };

  const controller = new AbortController();
  // A Vodacom pode demorar até ~60s a responder (USSD push + PIN do
  // cliente) — timeout generoso de propósito.
  const timeout = setTimeout(() => controller.abort(), 65_000);

  let response: Response;
  try {
    response = await fetch(`https://${host}:${port}/ipg/v1x/c2bPayment/singleStage/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Origin: 'developer.mpesa.vm.co.mz',
        Authorization: `Bearer ${token}`,
        ...BROWSER_LIKE_HEADERS,
      },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
  } catch (e: unknown) {
    clearTimeout(timeout);
    return { ok: false, error: e instanceof Error ? e.message : 'Ligação ao M-Pesa falhou', gatewayNoise: true };
  }
  clearTimeout(timeout);

  const text = await response.text();

  if (response.status === 502 || response.status === 503 || response.status === 504) {
    return { ok: false, error: `Gateway M-Pesa indisponível (${response.status})`, raw: text, gatewayNoise: true };
  }

  let data: Record<string, unknown>;
  try {
    data = JSON.parse(text);
  } catch {
    return { ok: false, error: `Resposta inválida do M-Pesa (HTTP ${response.status})`, raw: text };
  }

  const responseCode = String(data.output_ResponseCode ?? '');
  const success = response.ok && (responseCode === 'INS-0' || responseCode === '');
  if (!success) {
    const desc = String(data.output_ResponseDesc || data.output_error || 'Pagamento rejeitado pelo M-Pesa');
    return { ok: false, error: desc, raw: text };
  }

  return {
    ok: true,
    transactionId: typeof data.output_TransactionID === 'string' ? data.output_TransactionID : undefined,
    conversationId: typeof data.output_ConversationID === 'string' ? data.output_ConversationID : undefined,
    raw: text,
  };
}

/**
 * C2B Single Stage com repetição automática — só nos casos de "ruído de
 * gateway" (502/503/504/falha de ligação), nunca em rejeições reais da
 * aplicação (ex.: PIN errado, saldo insuficiente).
 */
export async function c2bSingleStagePay(
  input: MpesaC2BInput,
  maxAttempts = 6,
): Promise<MpesaC2BResult> {
  let last: MpesaC2BResult = { ok: false, error: 'Nenhuma tentativa executada' };
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    last = await singleAttempt(input);
    if (last.ok || !last.gatewayNoise) return last;
    if (attempt < maxAttempts) await new Promise((r) => setTimeout(r, 1500));
  }
  return last;
}
