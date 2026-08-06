import { NextResponse } from 'next/server';
import { requireAdminOrReseller } from '@/lib/panel-api-auth';
import { getSupabaseAdmin } from '@/lib/supabase-admin';
import { confirmResellerCreditRequest } from '@/lib/reseller-credit';
import { getAttachmentSignedUrl } from '@/lib/quotation-attachments-bucket';

// Confirma (soma ao saldo) ou rejeita um pedido de carregamento — só depois
// de a equipa verificar manualmente que o M-Pesa/transferência entrou. Um
// pedido pago por Cartão já chega confirmado pelo webhook do Stripe, nunca
// passa por aqui.
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
      const result = await confirmResellerCreditRequest(supabase, id);
      if (!result.ok) {
        return NextResponse.json({ success: false, error: result.error || 'Não foi possível confirmar.' }, { status: 409 });
      }
      const { data } = await supabase.from('reseller_credit_requests').select('*').eq('id', id).single();
      const signedUrl = await getAttachmentSignedUrl(data?.comprovativo_url);
      return NextResponse.json({ success: true, pedido: data ? { ...data, comprovativo_url: signedUrl } : data });
    }

    const { data: pedido, error: pedidoError } = await supabase
      .from('reseller_credit_requests')
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
      .from('reseller_credit_requests')
      .update({ status: 'rejected', rejection_reason: rejectionReason || null, confirmed_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;

    const signedUrl = await getAttachmentSignedUrl(data?.comprovativo_url);
    return NextResponse.json({ success: true, pedido: { ...data, comprovativo_url: signedUrl } });
  } catch (error: any) {
    console.error('[admin/reseller-creditos PATCH] error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
