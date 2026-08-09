import { NextRequest, NextResponse } from 'next/server';
import { createClient as createAdminClient } from '@supabase/supabase-js';
import { requireAdminOrReseller } from '@/lib/panel-api-auth';
import { fulfillCheckout } from '@/lib/checkout-fulfillment';
import { c2bSingleStagePay } from '@/lib/mpesa-client';

// Confirmação automática de pagamento via M-Pesa Sandbox — só disponível
// nesta instância de teste (MPESA_ENV=sandbox nunca é definida em produção)
// e só para admins, enquanto validamos a integração. Mesmo princípio do
// webhook Stripe (fulfillCheckout + idempotência por status), mas síncrono:
// aqui é a própria chamada C2B que confirma o pagamento, não um callback.
export async function POST(request: NextRequest) {
  if ((process.env.MPESA_ENV || '').trim().toLowerCase() !== 'sandbox') {
    return NextResponse.json({ error: 'M-Pesa Sandbox não está activo nesta instância.' }, { status: 403 });
  }

  const auth = await requireAdminOrReseller();
  if ('error' in auth) return auth.error;
  if (auth.user.role !== 'admin') {
    return NextResponse.json({ error: 'Apenas administradores.' }, { status: 403 });
  }

  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!serviceKey || !supabaseUrl) {
    return NextResponse.json({ error: 'Configuração em falta.' }, { status: 500 });
  }
  const admin = createAdminClient(supabaseUrl, serviceKey);

  const body = await request.json();
  const sessionId = String(body.sessionId || '').trim();
  const msisdn = String(body.msisdn || '').trim();
  if (!sessionId || !msisdn) {
    return NextResponse.json({ error: 'Sessão ou número de telefone em falta.' }, { status: 400 });
  }

  const { data: session, error } = await admin
    .from('checkout_sessions')
    .select('*')
    .eq('id', sessionId)
    .maybeSingle();

  if (error || !session) {
    return NextResponse.json({ error: 'Pedido de checkout não encontrado.' }, { status: 404 });
  }

  // Idempotência — mesma regra do webhook Stripe.
  if (session.status === 'paid') {
    return NextResponse.json({ success: true, alreadyPaid: true });
  }
  if (session.metodo_pagamento !== 'mpesa') {
    return NextResponse.json({ error: 'Este pedido não é M-Pesa.' }, { status: 400 });
  }

  // Nunca testar com compra de domínio — regista a sério no Dynadot assim
  // que o painel considerar o pagamento confirmado.
  const items: Array<{ type: string }> = Array.isArray(session.items) ? session.items : [];
  if (items.some((i) => i.type !== 'hosting')) {
    return NextResponse.json(
      { error: 'M-Pesa Sandbox só está autorizado para carrinhos só de hospedagem (nunca domínios).' },
      { status: 400 },
    );
  }

  const thirdPartyReference = session.mpesa_third_party_reference || session.id.replace(/-/g, '').slice(0, 20);
  const transactionReference = `VD${Date.now().toString().slice(-10)}`;

  const result = await c2bSingleStagePay({
    msisdn,
    amountMt: Number(session.total_mt) || 0,
    thirdPartyReference,
    transactionReference,
  });

  await admin
    .from('checkout_sessions')
    .update({
      mpesa_third_party_reference: thirdPartyReference,
      mpesa_transaction_id: result.ok ? result.transactionId || null : null,
      mpesa_conversation_id: result.ok ? result.conversationId || null : null,
      mpesa_last_response: result.ok ? result.raw : result.raw || result.error,
    })
    .eq('id', sessionId);

  if (!result.ok) {
    return NextResponse.json({ success: false, error: result.error }, { status: 502 });
  }

  try {
    await fulfillCheckout(admin, session.user_id, session.items, 'mpesa');
    await admin
      .from('checkout_sessions')
      .update({ status: 'paid', fulfilled_at: new Date().toISOString() })
      .eq('id', sessionId);
  } catch (fulfillError) {
    console.error('[checkout/mpesa-pay] erro ao activar produtos:', fulfillError);
    await admin.from('checkout_sessions').update({ status: 'failed' }).eq('id', sessionId);
    return NextResponse.json({ success: false, error: 'Pagamento confirmado mas falhou a activar os produtos.' }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
