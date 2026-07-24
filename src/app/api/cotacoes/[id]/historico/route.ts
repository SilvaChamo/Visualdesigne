import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase-admin';
import { resolveQuotationAccess } from '@/lib/quotation-access';

// Histórico de mudanças de estado de uma encomenda — usado tanto pelo painel
// do cliente como pelo admin (mesma rota, resolveQuotationAccess decide quem
// pode ver).
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const access = await resolveQuotationAccess(id);
  if (!access.ok) return access.response;

  const admin = getSupabaseAdmin();
  if (!admin) {
    return NextResponse.json({ error: 'Serviço indisponível.' }, { status: 503 });
  }

  const { data, error } = await admin
    .from('quotation_status_history')
    .select('*')
    .in('quotation_id', access.batchQuotationIds)
    .order('created_at', { ascending: true });

  if (error) {
    console.error('[cotacoes/[id]/historico] list error:', error);
    return NextResponse.json({ error: 'Não foi possível carregar o histórico.' }, { status: 500 });
  }

  return NextResponse.json({ success: true, historico: data || [] });
}
