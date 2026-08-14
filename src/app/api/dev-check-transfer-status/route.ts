import { NextResponse } from 'next/server';
import crypto from 'crypto';

// TEMPORÁRIO — diagnóstico da API Dynadot em bruto (só GET, leitura).
const BASE_URL = 'https://api.dynadot.com';

function sign(apiKey: string, secretKey: string, path: string, requestId: string, body: string) {
  const stringToSign = `${apiKey}\n${path}\n${requestId}\n${body}`;
  return crypto.createHmac('sha256', secretKey).update(stringToSign).digest('hex');
}

async function rawGet(path: string) {
  const apiKey = process.env.DYNADOT_API_KEY!;
  const secretKey = process.env.DYNADOT_SECRET_KEY!;
  const requestId = crypto.randomUUID();
  const signature = sign(apiKey, secretKey, path, requestId, '');
  const res = await fetch(`${BASE_URL}${path}`, {
    method: 'GET',
    headers: {
      Accept: 'application/json',
      Authorization: `Bearer ${apiKey}`,
      'X-Request-ID': requestId,
      'X-Signature': signature,
    },
  });
  const json = await res.json().catch(() => ({}));
  return { httpStatus: res.status, path, body: json };
}

export async function GET() {
  const results = await Promise.all([
    rawGet('/restful/v1/domains/aamihe.com/transfer_status?transfer_type=transfer_in'),
    rawGet('/restful/v1/domains/aamihe.com/transfer_status'),
    rawGet('/restful/v1/domains/aamihe.com/transfer_status?transfer_type=transferring_in'),
    rawGet('/restful/v1/domains'),
  ]);
  return NextResponse.json(results);
}
