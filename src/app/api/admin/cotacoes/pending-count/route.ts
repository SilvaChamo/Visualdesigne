import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { requireAdminOrReseller } from '@/lib/panel-api-auth';

// Contagem leve para o balão de notificação do menu "Encomendas" — encomendas
// (batches) com pelo menos uma linha em 'payment_selected' (cliente escolheu
// método de pagamento e/ou enviou comprovativo, à espera de confirmação da
// equipa). Endpoint dedicado e simples de propósito: não reaproveita
// /api/admin/cotacoes (que faz muito mais e é pesado) só para uma contagem.
export async function GET() {
  const auth = await requireAdminOrReseller();
  if ('error' in auth) return auth.error;

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );

  try {
    const { data, error } = await supabase
      .from('quotation_requests')
      .select('batch_id')
      .eq('status', 'payment_selected');
    if (error) throw error;

    const pendentes = new Set((data || []).map((r) => r.batch_id)).size;
    return NextResponse.json({ success: true, stats: { pendentes } });
  } catch (error: any) {
    console.error('[admin/cotacoes/pending-count] error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
