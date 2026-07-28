import { NextResponse } from 'next/server';
import { requireAdminOrReseller } from '@/lib/panel-api-auth';
import { getSupabaseAdmin } from '@/lib/supabase-admin';

const IVA_PERCENT = 16;

type MonthRow = {
  month: string; // 'YYYY-MM-01'
  receitaMt: number;
  custosProducaoMt: number;
  ivaPercent: number;
  ivaMt: number;
  lucroMt: number;
};

function monthKey(dateStr: string): string {
  return `${dateStr.slice(0, 7)}-01`;
}

// Receita de contabilidade = soma de accounting_batch_snapshots (ver
// saveAccountingSnapshot em /api/admin/cotacoes) — a cópia fixa gravada uma
// única vez quando uma encomenda fica 'done', pelo mês em que isso aconteceu
// (done_at). Já não se recalcula a partir de quotation_requests +
// quotation_status_history a cada carregamento: essas duas tabelas crescem
// com TODAS as encomendas (qualquer estado, desde sempre) e obrigavam a
// trazer tudo para o servidor só para descobrir quais é que já chegaram a
// 'done' — exactamente o que o snapshot já guarda pronto. Custos de produção
// continuam a somar quotation_batch_expenses pelo mês em que a despesa foi
// lançada (independente do estado da encomenda — o dinheiro já saiu da
// caixa), porque essa tabela não cresce com o mesmo volume e não há um
// atalho equivalente sem mudar esse comportamento. IVA = (receita - custos)
// × 16% — sai depois de retirar os custos de produção, nunca sobre a receita
// bruta. Tudo aqui é automático: nada é editável, nem o IVA.
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
    const [
      { data: registos, error: registosError },
      { data: expenses, error: expensesError },
    ] = await Promise.all([
      supabase
        .from('accounting_batch_snapshots')
        .select('batch_id, primary_item_id, numero, advance_invoice_number, remainder_invoice_number, empresa, resumo, receita_mt, custos_producao_mt, iva_percent, iva_mt, lucro_mt, done_at')
        .order('done_at', { ascending: false }),
      supabase.from('quotation_batch_expenses').select('valor_mt, created_at'),
    ]);
    if (registosError) throw registosError;
    if (expensesError) throw expensesError;

    const custosByMonth = new Map<string, number>();
    for (const e of expenses || []) {
      const key = monthKey(e.created_at);
      custosByMonth.set(key, (custosByMonth.get(key) || 0) + (e.valor_mt || 0));
    }

    const revenueByMonth = new Map<string, number>();
    for (const r of registos || []) {
      const key = monthKey(r.done_at);
      revenueByMonth.set(key, (revenueByMonth.get(key) || 0) + (r.receita_mt || 0));
    }

    const allMonthKeys = new Set<string>([...revenueByMonth.keys(), ...custosByMonth.keys(), monthKey(new Date().toISOString())]);

    const meses: MonthRow[] = [...allMonthKeys].sort().reverse().map((month) => {
      const receitaMt = revenueByMonth.get(month) || 0;
      const custosProducaoMt = custosByMonth.get(month) || 0;
      const ivaMt = ((receitaMt - custosProducaoMt) * IVA_PERCENT) / 100;
      const lucroMt = receitaMt - custosProducaoMt - ivaMt;
      return { month, receitaMt, custosProducaoMt, ivaPercent: IVA_PERCENT, ivaMt, lucroMt };
    });

    return NextResponse.json({ success: true, meses, registos: registos || [] });
  } catch (error: any) {
    console.error('[admin/contabilidade GET] error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
