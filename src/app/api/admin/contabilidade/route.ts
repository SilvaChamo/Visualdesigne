import { NextResponse } from 'next/server';
import { requireAdminOrReseller } from '@/lib/panel-api-auth';
import { getSupabaseAdmin } from '@/lib/supabase-admin';
import { groupIntoBatches } from '@/lib/quotation-batch';
import { computeBatchStatus } from '@/lib/quotation-status-labels';

const DEFAULT_IVA_PERCENT = 16;

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

// Receita de contabilidade = soma das encomendas que chegaram a "Entregue" (status
// 'done', o estado final — remanescente já pago), pelo mês em que isso aconteceu de
// facto (histórico real de mudança de estado), não pelo mês em que a encomenda foi
// criada. Custos de produção = soma das despesas lançadas por encomenda
// (quotation_batch_expenses, ver QuotationBatchExpenses), pelo mês em que a despesa
// foi lançada — o dinheiro sai da caixa nesse momento, independentemente de a
// encomenda em causa já estar ou não totalmente concluída. Só a % de IVA é
// editável nesta tabela; a receita, os custos e o lucro nunca são guardados, são
// sempre recalculados a partir dos dados reais.
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
    const { data: items, error: itemsError } = await supabase
      .from('quotation_requests')
      .select('id, batch_id, categoria_id, total_mt, sob_consulta, status, created_at, updated_at');
    if (itemsError) throw itemsError;

    const { data: doneHistory, error: historyError } = await supabase
      .from('quotation_status_history')
      .select('quotation_id, created_at')
      .eq('status', 'done');
    if (historyError) throw historyError;

    const { data: expenses, error: expensesError } = await supabase
      .from('quotation_batch_expenses')
      .select('valor_mt, created_at');
    if (expensesError) throw expensesError;

    const custosByMonth = new Map<string, number>();
    for (const e of expenses || []) {
      const key = monthKey(e.created_at);
      custosByMonth.set(key, (custosByMonth.get(key) || 0) + (e.valor_mt || 0));
    }

    const doneAtByItem = new Map<string, string>();
    for (const h of doneHistory || []) {
      const prev = doneAtByItem.get(h.quotation_id);
      if (!prev || h.created_at > prev) doneAtByItem.set(h.quotation_id, h.created_at);
    }

    const revenueByMonth = new Map<string, number>();
    const batches = groupIntoBatches(items || []);
    for (const batch of batches) {
      if (computeBatchStatus(batch.items) !== 'done') continue;

      let doneAt = '';
      for (const item of batch.items) {
        const itemDoneAt = doneAtByItem.get(item.id) || item.updated_at || item.created_at;
        if (itemDoneAt > doneAt) doneAt = itemDoneAt;
      }
      if (!doneAt) continue;

      const key = monthKey(doneAt);
      revenueByMonth.set(key, (revenueByMonth.get(key) || 0) + batch.totalMt);
    }

    const { data: savedMonths, error: savedError } = await supabase
      .from('monthly_accounting')
      .select('month, iva_percent');
    if (savedError) throw savedError;

    const savedByMonth = new Map((savedMonths || []).map((m) => [monthKey(m.month), m]));

    const allMonthKeys = new Set<string>([...revenueByMonth.keys(), ...custosByMonth.keys(), ...savedByMonth.keys(), monthKey(new Date().toISOString())]);

    const meses: MonthRow[] = [...allMonthKeys].sort().reverse().map((month) => {
      const saved = savedByMonth.get(month);
      const receitaMt = revenueByMonth.get(month) || 0;
      const custosProducaoMt = custosByMonth.get(month) || 0;
      const ivaPercent = saved?.iva_percent ?? DEFAULT_IVA_PERCENT;
      const ivaMt = (receitaMt * ivaPercent) / 100;
      const lucroMt = receitaMt - custosProducaoMt - ivaMt;
      return { month, receitaMt, custosProducaoMt, ivaPercent, ivaMt, lucroMt };
    });

    return NextResponse.json({ success: true, meses });
  } catch (error: any) {
    console.error('[admin/contabilidade GET] error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// Grava a % de IVA de um mês (upsert) — o único valor desta tabela que não é
// calculado automaticamente (custos de produção vêm de quotation_batch_expenses).
export async function PATCH(request: Request) {
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
    const { month, ivaPercent } = body || {};
    if (!month) {
      return NextResponse.json({ success: false, error: 'month é obrigatório.' }, { status: 400 });
    }

    const update: Record<string, unknown> = { month, updated_at: new Date().toISOString() };
    if (ivaPercent !== undefined) update.iva_percent = ivaPercent;

    const { data, error } = await supabase
      .from('monthly_accounting')
      .upsert(update, { onConflict: 'month' })
      .select()
      .single();
    if (error) throw error;

    return NextResponse.json({ success: true, mes: data });
  } catch (error: any) {
    console.error('[admin/contabilidade PATCH] error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
