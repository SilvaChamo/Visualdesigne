import { NextResponse } from 'next/server';
import { requireAdminOrReseller } from '@/lib/panel-api-auth';
import { getSupabaseAdmin } from '@/lib/supabase-admin';
import { fulfillCheckout, HOSTING_DOMAIN_REGEX } from '@/lib/checkout-fulfillment';
import type { CatalogCartItem } from '@/lib/package-catalog';

type CartItemWithStatus = CatalogCartItem & { status?: 'pending' | 'paid' | 'failed'; rejectionReason?: string | null };

/**
 * Confirma (activa o produto) ou rejeita UM item de um pedido de pagamento
 * manual (M-Pesa/Transferência) — não o pedido inteiro. Um pedido pode ter
 * vários itens de tipos diferentes (ex: domínio + hospedagem juntos); cada
 * um é aprovado separadamente, mesma lógica usada nas Encomendas
 * (quotation_requests → computeBatchStatus). O estado do pedido inteiro
 * (`checkout_sessions.status`) fica derivado: só passa a 'paid' quando
 * todos os itens estiverem 'paid'.
 */
export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAdminOrReseller();
  if ('error' in auth) return auth.error;
  if (auth.user.role !== 'admin') {
    return NextResponse.json({ success: false, error: 'Acção restrita a administradores.' }, { status: 403 });
  }

  const supabase = getSupabaseAdmin();
  if (!supabase) {
    return NextResponse.json({ success: false, error: 'Supabase Service Role não configurado.' }, { status: 503 });
  }

  const { id } = await params;

  try {
    const body = await request.json();
    const { itemIndex, status, rejectionReason, hostingDomain } = body || {};
    if (status !== 'paid' && status !== 'failed') {
      return NextResponse.json({ success: false, error: 'Estado inválido.' }, { status: 400 });
    }
    if (typeof itemIndex !== 'number') {
      return NextResponse.json({ success: false, error: 'itemIndex obrigatório.' }, { status: 400 });
    }

    const { data: session, error: sessionError } = await supabase
      .from('checkout_sessions')
      .select('id, user_id, items, status, metodo_pagamento')
      .eq('id', id)
      .single();
    if (sessionError || !session) {
      return NextResponse.json({ success: false, error: 'Pedido não encontrado.' }, { status: 404 });
    }

    const items = (session.items as CartItemWithStatus[]) || [];
    let item = items[itemIndex];
    if (!item) {
      return NextResponse.json({ success: false, error: 'Item não encontrado neste pedido.' }, { status: 404 });
    }
    const currentItemStatus = item.status ?? session.status;
    if (currentItemStatus !== 'pending') {
      return NextResponse.json({ success: false, error: 'Este item já foi respondido.' }, { status: 409 });
    }

    // #6: o admin pode corrigir/definir o domínio de uma hospedagem aqui mesmo,
    // antes de confirmar — sem isto, um pedido sem domínio ficava preso sem
    // forma de o resolver a partir da Contabilidade.
    const normalizedDomain = typeof hostingDomain === 'string' ? hostingDomain.toLowerCase().trim() : '';
    if (
      status === 'paid' &&
      (item as any).type === 'hosting' &&
      normalizedDomain &&
      HOSTING_DOMAIN_REGEX.test(normalizedDomain)
    ) {
      item = { ...item, hostingDomain: normalizedDomain } as CartItemWithStatus;
    }

    if (status === 'paid') {
      await fulfillCheckout(supabase, session.user_id, [item], session.metodo_pagamento);
    }

    const updatedItems = items.map((it, idx) =>
      idx === itemIndex ? { ...item, status, rejectionReason: status === 'failed' ? rejectionReason || null : null } : it,
    );
    const allPaid = updatedItems.every((it) => (it.status ?? session.status) === 'paid');
    const allDone = updatedItems.every((it) => (it.status ?? session.status) !== 'pending');
    const newRowStatus = allPaid ? 'paid' : allDone ? 'failed' : 'pending';

    const { data, error } = await supabase
      .from('checkout_sessions')
      .update({
        items: updatedItems,
        status: newRowStatus,
        fulfilled_at: allPaid ? new Date().toISOString() : undefined,
      })
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;

    return NextResponse.json({ success: true, pedido: data });
  } catch (error: any) {
    console.error('[admin/checkout-pagamentos PATCH] error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
