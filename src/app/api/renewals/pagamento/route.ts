import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { getSupabaseAdmin } from '@/lib/supabase-admin';
import { notifyQuoteTeam } from '@/lib/notify-quote-team';

const VALID_METHODS = ['mpesa', 'emola', 'transferencia', 'stripe'];
const VALID_TYPES = ['domain', 'hosting'];

// Regista um novo pedido de pagamento de renovação — o valor vem sempre do
// próprio registo (renewal_price), nunca do cliente, para não poder ser
// adulterado. Fica 'pending' até a equipa confirmar (M-Pesa/Transferência)
// ou o webhook do Stripe confirmar automaticamente (Cartão).
export async function POST(request: Request) {
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

  try {
    const body = await request.json();
    const renewalType = String(body?.renewalType || '');
    const renewalId = String(body?.renewalId || '');
    const metodoPagamento = String(body?.metodoPagamento || '');

    if (!VALID_TYPES.includes(renewalType)) {
      return NextResponse.json({ error: 'Tipo de renovação inválido.' }, { status: 400 });
    }
    if (!VALID_METHODS.includes(metodoPagamento)) {
      return NextResponse.json({ error: 'Método de pagamento inválido.' }, { status: 400 });
    }

    const table = renewalType === 'domain' ? 'domain_renewals' : 'hosting_renewals';
    const { data: renewal, error: renewalError } = await admin
      .from(table)
      .select('id, user_id, domain_name, renewal_price')
      .eq('id', renewalId)
      .single();
    if (renewalError || !renewal) {
      return NextResponse.json({ error: 'Renovação não encontrada.' }, { status: 404 });
    }
    if (renewal.user_id !== user.id) {
      return NextResponse.json({ error: 'Não tem permissão para pagar esta renovação.' }, { status: 403 });
    }

    const valorMt = Number(renewal.renewal_price);
    if (!Number.isFinite(valorMt) || valorMt <= 0) {
      return NextResponse.json({ error: 'Esta renovação ainda não tem um valor definido — contacte o suporte.' }, { status: 400 });
    }

    const { data, error } = await admin
      .from('renewal_payment_requests')
      .insert({
        user_id: user.id,
        renewal_type: renewalType,
        renewal_id: renewalId,
        service_name: renewal.domain_name,
        valor_mt: valorMt,
        metodo_pagamento: metodoPagamento,
        status: 'pending',
      })
      .select()
      .single();
    if (error) throw error;

    if (metodoPagamento !== 'stripe') {
      notifyQuoteTeam({
        title: 'Novo pedido de pagamento de renovação',
        message: `${user.email} pediu para pagar a renovação de "${renewal.domain_name}" (${valorMt} MT) via ${metodoPagamento === 'mpesa' ? 'M-Pesa' : metodoPagamento === 'emola' ? 'e-Mola' : 'Transferência Bancária'}. Fica a aguardar comprovativo e confirmação da equipa.`,
        link: `${process.env.NEXT_PUBLIC_SITE_URL || ''}/renovacao/${data.id}`,
      }).catch((err) => console.error('[renewals/pagamento] falha ao notificar equipa:', err));
    }

    return NextResponse.json({ success: true, pedido: data });
  } catch (error: any) {
    console.error('[renewals/pagamento POST] error:', error);
    return NextResponse.json({ error: error.message || 'Erro interno' }, { status: 500 });
  }
}
