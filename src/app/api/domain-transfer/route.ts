import { NextResponse } from 'next/server';
import { requirePanelBootstrapAccess } from '@/lib/panel-api-auth';
import { getSupabaseAdmin } from '@/lib/supabase-admin';

/** Lista os pedidos de transferência de domínio do próprio cliente (ou, se admin, todos). */
export async function GET() {
  const auth = await requirePanelBootstrapAccess();
  if ('error' in auth) return auth.error;

  const supabase = getSupabaseAdmin();
  if (!supabase) {
    return NextResponse.json({ success: false, error: 'Serviço indisponível.' }, { status: 503 });
  }

  let query = supabase.from('domain_transfer_requests').select('*').order('created_at', { ascending: false });
  if (auth.user.role !== 'admin') {
    query = query.eq('user_id', auth.user.id);
  }

  const { data, error } = await query;
  if (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true, pedidos: data });
}
