import { NextResponse } from 'next/server';
import { requireAdminOrReseller } from '@/lib/panel-api-auth';
import { getSupabaseAdmin } from '@/lib/supabase-admin';

const IVA_PERCENT = 16;

// Fecho de exercício anual — acto deliberado do admin, nunca automático.
// Congela os totais do ano (receita, custos, IVA, lucro) num registo
// imutável; ver supabase-accounting-year-closings.sql. Uma vez fechado, as
// despesas de produção desse ano ficam bloqueadas (ver
// /api/admin/cotacoes/[batchId]/despesas) — os totais aqui gravados nunca
// mais podem mudar por baixo do tapete.
export async function POST(request: Request) {
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
    const body = await request.json();
    const year = Number(body?.year);
    if (!Number.isInteger(year) || year < 2000 || year > 2100) {
      return NextResponse.json({ success: false, error: 'Ano inválido.' }, { status: 400 });
    }

    const { data: existing } = await supabase
      .from('accounting_year_closings')
      .select('year')
      .eq('year', year)
      .maybeSingle();
    if (existing) {
      return NextResponse.json({ success: false, error: `O ano ${year} já está fechado.` }, { status: 409 });
    }

    const start = `${year}-01-01T00:00:00.000Z`;
    const end = `${year + 1}-01-01T00:00:00.000Z`;

    const [{ data: registos, error: registosError }, { data: expenses, error: expensesError }] = await Promise.all([
      supabase.from('accounting_batch_snapshots').select('receita_mt').gte('done_at', start).lt('done_at', end),
      supabase.from('quotation_batch_expenses').select('valor_mt, quantidade').gte('created_at', start).lt('created_at', end),
    ]);
    if (registosError) throw registosError;
    if (expensesError) throw expensesError;

    const receitaMt = (registos || []).reduce((sum, r) => sum + (Number(r.receita_mt) || 0), 0);
    const custosProducaoMt = (expenses || []).reduce((sum, e) => sum + (Number(e.valor_mt) || 0) * (Number(e.quantidade) || 1), 0);
    const ivaMt = ((receitaMt - custosProducaoMt) * IVA_PERCENT) / 100;
    const lucroMt = receitaMt - custosProducaoMt - ivaMt;

    const { data, error } = await supabase
      .from('accounting_year_closings')
      .insert({
        year,
        receita_mt: receitaMt,
        custos_producao_mt: custosProducaoMt,
        iva_percent: IVA_PERCENT,
        iva_mt: ivaMt,
        lucro_mt: lucroMt,
        closed_by: auth.user.email ?? null,
      })
      .select()
      .single();
    if (error) throw error;

    return NextResponse.json({ success: true, fecho: data });
  } catch (error: any) {
    console.error('[admin/contabilidade/fechar POST] error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
