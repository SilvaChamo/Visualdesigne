import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { getSupabaseAdmin } from '@/lib/supabase-admin';
import { getStripe, isStripeConfigured, mznToUsdCents } from '@/lib/stripe';

// Cria a sessão de Stripe Checkout para um pedido de pagamento de renovação
// já registado com método 'stripe' — a renovação só avança 1 ano quando o
// webhook confirmar o pagamento (ver /api/webhook/stripe), nunca aqui.
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!isStripeConfigured()) {
    return NextResponse.json({ error: 'Pagamento por cartão ainda não está configurado.' }, { status: 503 });
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Faça login para continuar.' }, { status: 401 });
  }

  const admin = getSupabaseAdmin();
  if (!admin) {
    return NextResponse.json({ error: 'Serviço indisponível.' }, { status: 503 });
  }

  const { id } = await params;

  const { data: pedido, error: pedidoError } = await admin
    .from('renewal_payment_requests')
    .select('id, user_id, service_name, valor_mt, metodo_pagamento, status')
    .eq('id', id)
    .single();
  if (pedidoError || !pedido) {
    return NextResponse.json({ error: 'Pedido não encontrado.' }, { status: 404 });
  }
  if (pedido.user_id !== user.id) {
    return NextResponse.json({ error: 'Não tem permissão para pagar este pedido.' }, { status: 403 });
  }
  if (pedido.metodo_pagamento !== 'stripe') {
    return NextResponse.json({ error: 'Este pedido não é para pagamento por cartão.' }, { status: 409 });
  }
  if (pedido.status !== 'pending') {
    return NextResponse.json({ error: 'Este pedido já foi respondido.' }, { status: 409 });
  }

  try {
    const origin = request.headers.get('origin') || process.env.NEXT_PUBLIC_SITE_URL || '';
    const stripe = getStripe();
    const stripeSession = await stripe.checkout.sessions.create({
      mode: 'payment',
      customer_email: user.email || undefined,
      line_items: [
        {
          price_data: {
            currency: 'usd',
            product_data: { name: `Renovação — ${pedido.service_name}` },
            unit_amount: mznToUsdCents(Number(pedido.valor_mt)),
          },
          quantity: 1,
        },
      ],
      metadata: { kind: 'renewal_payment', renewal_payment_id: pedido.id },
      success_url: `${origin}/renovacao/${pedido.id}?success=1`,
      cancel_url: `${origin}/renovacao/${pedido.id}`,
    });

    return NextResponse.json({ success: true, url: stripeSession.url });
  } catch (error: unknown) {
    console.error('[renewals/pagamento stripe-session] error:', error);
    const message = error instanceof Error ? error.message : 'Erro interno';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
