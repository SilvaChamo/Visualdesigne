import { NextResponse } from 'next/server';
import { requireAdminOrReseller } from '@/lib/panel-api-auth';
import { getSupabaseAdmin } from '@/lib/supabase-admin';
import { confirmRenewalPayment } from '@/lib/renewal-payment';

// Confirma (estende a validade 1 ano) ou rejeita um pedido de pagamento de
// renovação — um pedido pago por Cartão já chega confirmado pelo webhook do
// Stripe, nunca passa por aqui.
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
    const { status, rejectionReason } = body || {};
    if (status !== 'confirmed' && status !== 'rejected') {
      return NextResponse.json({ success: false, error: 'Estado inválido.' }, { status: 400 });
    }

    if (status === 'confirmed') {
      const result = await confirmRenewalPayment(supabase, id);
      if (!result.ok) {
        return NextResponse.json({ success: false, error: result.error || 'Não foi possível confirmar.' }, { status: 409 });
      }
      const { data } = await supabase.from('renewal_payment_requests').select('*').eq('id', id).single();
      return NextResponse.json({ success: true, pedido: data });
    }

    const { data: pedido, error: pedidoError } = await supabase
      .from('renewal_payment_requests')
      .select('id, status')
      .eq('id', id)
      .single();
    if (pedidoError || !pedido) {
      return NextResponse.json({ success: false, error: 'Pedido não encontrado.' }, { status: 404 });
    }
    if (pedido.status !== 'pending') {
      return NextResponse.json({ success: false, error: 'Este pedido já foi respondido.' }, { status: 409 });
    }

    const { data, error } = await supabase
      .from('renewal_payment_requests')
      .update({ status: 'rejected', rejection_reason: rejectionReason || null, confirmed_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;

    return NextResponse.json({ success: true, pedido: data });
  } catch (error: any) {
    console.error('[admin/renewal-pagamentos PATCH] error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
