import { NextResponse } from 'next/server';
import { requireAdminOrReseller } from '@/lib/panel-api-auth';
import { getSupabaseAdmin } from '@/lib/supabase-admin';
import { isYearClosed } from '@/lib/accounting-year-lock';

// Lista/regista despesas de produção (materiais, etc.) de uma encomenda —
// o total alimenta "Custos de produção" na Contabilidade mensal.
export async function GET(request: Request, { params }: { params: Promise<{ batchId: string }> }) {
  const auth = await requireAdminOrReseller();
  if ('error' in auth) return auth.error;
  if (auth.user.role !== 'admin') {
    return NextResponse.json({ success: false, error: 'Acção restrita a administradores.' }, { status: 403 });
  }

  const supabase = getSupabaseAdmin();
  if (!supabase) {
    return NextResponse.json({ success: false, error: 'Supabase Service Role não configurado.' }, { status: 503 });
  }

  const { batchId } = await params;

  try {
    const { data, error } = await supabase
      .from('quotation_batch_expenses')
      .select('*')
      .eq('batch_id', batchId)
      .order('created_at', { ascending: true });
    if (error) throw error;

    return NextResponse.json({ success: true, despesas: data || [] });
  } catch (error: any) {
    console.error('[admin/cotacoes/despesas GET] error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request, { params }: { params: Promise<{ batchId: string }> }) {
  const auth = await requireAdminOrReseller();
  if ('error' in auth) return auth.error;
  if (auth.user.role !== 'admin') {
    return NextResponse.json({ success: false, error: 'Acção restrita a administradores.' }, { status: 403 });
  }

  const supabase = getSupabaseAdmin();
  if (!supabase) {
    return NextResponse.json({ success: false, error: 'Supabase Service Role não configurado.' }, { status: 503 });
  }

  const { batchId } = await params;

  try {
    if (await isYearClosed(supabase, new Date().getFullYear())) {
      return NextResponse.json({ success: false, error: 'O exercício deste ano já está fechado — não é possível lançar novas despesas.' }, { status: 409 });
    }

    const body = await request.json();
    const { data, error } = await supabase
      .from('quotation_batch_expenses')
      .insert({ batch_id: batchId, descricao: body?.descricao || '', valor_mt: body?.valorMt || 0, quantidade: body?.quantidade || 1 })
      .select()
      .single();
    if (error) throw error;

    return NextResponse.json({ success: true, despesa: data });
  } catch (error: any) {
    console.error('[admin/cotacoes/despesas POST] error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
