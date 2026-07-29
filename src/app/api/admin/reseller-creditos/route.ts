import { NextResponse } from 'next/server';
import { requireAdminOrReseller } from '@/lib/panel-api-auth';
import { getSupabaseAdmin } from '@/lib/supabase-admin';

// Lista todos os pedidos de carregamento de saldo dos revendedores, para a
// equipa confirmar/rejeitar depois de verificar o pagamento (M-Pesa/banco).
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
      .from('reseller_credit_requests')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) throw error;

    return NextResponse.json({ success: true, pedidos: data || [] });
  } catch (error: any) {
    console.error('[admin/reseller-creditos GET] error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
