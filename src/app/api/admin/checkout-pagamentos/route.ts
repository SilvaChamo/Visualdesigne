import { NextResponse } from 'next/server';
import { requireAdminOrReseller } from '@/lib/panel-api-auth';
import { getSupabaseAdmin } from '@/lib/supabase-admin';

// Lista os pedidos de pagamento manual (M-Pesa/Transferência) de compras
// novas do carrinho, para a equipa confirmar/rejeitar. Pagamentos por
// Cartão (Stripe) nunca aparecem aqui — já chegam confirmados pelo webhook.
export async function GET() {
  const auth = await requireAdminOrReseller();
  if ('error' in auth) return auth.error;
  if (auth.user.role !== 'admin') {
    return NextResponse.json({ success: false, error: 'Acção restrita a administradores.' }, { status: 403 });
  }

  const supabase = getSupabaseAdmin();
  if (!supabase) {
    return NextResponse.json({ success: false, error: 'Supabase Service Role não configurado.' }, { status: 503 });
  }

  try {
    const { data, error } = await supabase
      .from('checkout_sessions')
      .select('id, user_id, items, total_mt, metodo_pagamento, status, comprovativo_url, rejection_reason, created_at')
      .neq('metodo_pagamento', 'stripe')
      .order('created_at', { ascending: false });
    if (error) throw error;

    const userIds = Array.from(new Set((data || []).map((s) => s.user_id)));
    const profileById: Record<string, { name?: string; email?: string; telefone?: string; morada?: string; cidade?: string; empresa?: string }> = {};
    if (userIds.length > 0) {
      const { data: profiles } = await supabase
        .from('profiles')
        .select('user_id, name, email, telefone, morada, cidade, empresa')
        .in('user_id', userIds);
      for (const p of profiles || []) {
        if (p.user_id) profileById[p.user_id] = p;
      }
    }

    // Cada item do carrinho tem o seu próprio estado (aprovação por-item, não
    // por pedido inteiro — mesma lógica das Encomendas). Pedidos antigos ainda
    // não têm `status` gravado por item: nesse caso herda o estado do pedido
    // inteiro (linha), para não aparecerem como "pendentes" à toa se o pedido
    // já tiver sido confirmado/rejeitado antes desta funcionalidade existir.
    const pedidos = (data || []).map((s) => ({
      ...s,
      user_email: profileById[s.user_id]?.email || null,
      cliente: profileById[s.user_id] || null,
      items: (s.items as Array<Record<string, unknown>>).map((item) => ({
        ...item,
        status: item.status ?? s.status,
      })),
    }));

    const pendentes = pedidos.reduce(
      (sum, p) => sum + p.items.filter((i) => i.status === 'pending').length,
      0,
    );

    return NextResponse.json({ success: true, pedidos, stats: { pendentes } });
  } catch (error: any) {
    console.error('[admin/checkout-pagamentos GET] error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
