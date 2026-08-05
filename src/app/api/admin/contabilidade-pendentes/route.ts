import { NextResponse } from 'next/server';
import { requireAdminOrReseller } from '@/lib/panel-api-auth';
import { getSupabaseAdmin } from '@/lib/supabase-admin';

/**
 * Contagem única de tudo o que está pendente de confirmação na Contabilidade
 * (créditos de revendedor + renovações + itens de compras novas do carrinho
 * — domínio/hospedagem/e-mail), para o balão do menu "Contabilidade" no
 * AdminSidebar. Junta as 3 fontes em vez de cada separador ter o seu próprio
 * balão.
 */
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
    const [creditos, renovacoes, compras] = await Promise.all([
      supabase.from('reseller_credit_requests').select('id', { count: 'exact', head: true }).eq('status', 'pending'),
      supabase.from('renewal_payment_requests').select('id', { count: 'exact', head: true }).eq('status', 'pending'),
      supabase.from('checkout_sessions').select('items').neq('metodo_pagamento', 'stripe').eq('status', 'pending'),
    ]);

    const comprasPendentes = (compras.data || []).reduce((sum, s) => {
      const items = (s.items as Array<{ status?: string }>) || [];
      return sum + items.filter((i) => (i.status ?? 'pending') === 'pending').length;
    }, 0);

    const pendentes = (creditos.count || 0) + (renovacoes.count || 0) + comprasPendentes;

    return NextResponse.json({ success: true, stats: { pendentes } });
  } catch (error: any) {
    console.error('[admin/contabilidade-pendentes GET] error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
