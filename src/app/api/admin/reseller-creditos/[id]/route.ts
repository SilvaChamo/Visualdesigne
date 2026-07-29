import { NextResponse } from 'next/server';
import { requireAdminOrReseller } from '@/lib/panel-api-auth';
import { getSupabaseAdmin } from '@/lib/supabase-admin';

// Confirma (soma ao saldo) ou rejeita um pedido de carregamento — só depois
// de a equipa verificar manualmente que o M-Pesa/transferência entrou.
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

    const { data: pedido, error: pedidoError } = await supabase
      .from('reseller_credit_requests')
      .select('id, da_username, valor_mt, status')
      .eq('id', id)
      .single();
    if (pedidoError || !pedido) {
      return NextResponse.json({ success: false, error: 'Pedido não encontrado.' }, { status: 404 });
    }
    if (pedido.status !== 'pending') {
      return NextResponse.json({ success: false, error: 'Este pedido já foi respondido.' }, { status: 409 });
    }

    if (status === 'confirmed') {
      const { data: existing } = await supabase
        .from('reseller_credits')
        .select('saldo_mt')
        .eq('da_username', pedido.da_username)
        .maybeSingle();
      const novoSaldo = (Number(existing?.saldo_mt) || 0) + Number(pedido.valor_mt);

      const { error: creditoError } = await supabase
        .from('reseller_credits')
        .upsert({ da_username: pedido.da_username, saldo_mt: novoSaldo, updated_at: new Date().toISOString() }, { onConflict: 'da_username' });
      if (creditoError) throw creditoError;
    }

    const { data, error } = await supabase
      .from('reseller_credit_requests')
      .update({
        status,
        rejection_reason: status === 'rejected' ? (rejectionReason || null) : null,
        confirmed_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;

    return NextResponse.json({ success: true, pedido: data });
  } catch (error: any) {
    console.error('[admin/reseller-creditos PATCH] error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
