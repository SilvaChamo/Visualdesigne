import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { getSupabaseAdmin } from '@/lib/supabase-admin';
import { computeNumeroMap } from '@/lib/quotation-numero';

// Números práticos de todas as encomendas (ex.: 252026D001) — mapa batch_id -> número.
// Não expõe dados de clientes (só id/batch_id/categoria/data), serve para o
// mesmo número aparecer igual no painel admin, no painel do cliente e no
// documento de cotação.
export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 });
  }

  const admin = getSupabaseAdmin();
  if (!admin) {
    return NextResponse.json({ error: 'Indisponível.' }, { status: 503 });
  }

  const { data, error } = await admin
    .from('quotation_requests')
    .select('id, batch_id, categoria_id, created_at')
    .order('created_at', { ascending: true });

  if (error) {
    console.error('[cotacoes/numeros] erro:', error);
    return NextResponse.json({ error: 'Não foi possível calcular os números.' }, { status: 500 });
  }

  const map = computeNumeroMap(data || []);
  return NextResponse.json({ success: true, numeros: Object.fromEntries(map) });
}
