import { NextResponse } from 'next/server';
import { dynadotAPI } from '@/lib/dynadot-adapter';

// TEMPORÁRIO — só leitura. Confirma se o IP do Contabo já foi autorizado
// na Dynadot e mostra o estado real da transferência do aamihe.com.
export async function GET() {
  const transferStatus = await dynadotAPI.getTransferStatus('aamihe.com');
  const domainDetails = await dynadotAPI.getDomainDetails('aamihe.com');
  return NextResponse.json({ transferStatus, domainDetails });
}
