import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { getSupabaseAdmin } from '@/lib/supabase-admin';

/**
 * #10: histórico de compras do próprio cliente (carrinho/checkout) — até
 * agora só existia visão de admin (checkout-pagamentos); o cliente não tinha
 * onde rever o que comprou depois de o ecrã de "Pagamento confirmado" sumir.
 * Escopo sempre ao próprio user_id — nunca lista compras de outra pessoa.
 */
export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ success: false, error: 'Faça login para continuar.' }, { status: 401 });
  }

  const admin = getSupabaseAdmin();
  if (!admin) {
    return NextResponse.json({ success: false, error: 'Serviço indisponível.' }, { status: 503 });
  }

  try {
    const { data, error } = await admin
      .from('checkout_sessions')
      .select('id, items, total_mt, metodo_pagamento, status, comprovativo_url, rejection_reason, created_at')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });
    if (error) throw error;

    const compras = (data || []).map((s) => ({
      ...s,
      items: (s.items as Array<Record<string, unknown>>).map((item) => ({
        ...item,
        status: item.status ?? s.status,
      })),
    }));

    return NextResponse.json({ success: true, compras });
  } catch (error: unknown) {
    console.error('[client/minhas-compras] GET:', error);
    const message = error instanceof Error ? error.message : 'Erro ao listar compras';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
