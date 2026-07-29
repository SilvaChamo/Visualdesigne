import { NextResponse } from 'next/server';
import { requireAdminOrReseller } from '@/lib/panel-api-auth';
import { getSupabaseAdmin } from '@/lib/supabase-admin';
import { isYearClosed } from '@/lib/accounting-year-lock';
import { refreshAccountingSnapshotCosts } from '@/lib/accounting-snapshot';

export async function PATCH(request: Request, { params }: { params: Promise<{ batchId: string; expenseId: string }> }) {
  const auth = await requireAdminOrReseller();
  if ('error' in auth) return auth.error;
  if (auth.user.role !== 'admin') {
    return NextResponse.json({ success: false, error: 'Acção restrita a administradores.' }, { status: 403 });
  }

  const supabase = getSupabaseAdmin();
  if (!supabase) {
    return NextResponse.json({ success: false, error: 'Supabase Service Role não configurado.' }, { status: 503 });
  }

  const { batchId, expenseId } = await params;

  try {
    const { data: existing, error: existingError } = await supabase
      .from('quotation_batch_expenses')
      .select('created_at')
      .eq('id', expenseId)
      .single();
    if (existingError || !existing) {
      return NextResponse.json({ success: false, error: 'Despesa não encontrada.' }, { status: 404 });
    }
    const expenseYear = new Date(existing.created_at).getFullYear();
    if (await isYearClosed(supabase, expenseYear)) {
      return NextResponse.json({ success: false, error: `O exercício de ${expenseYear} já está fechado — não é possível alterar esta despesa.` }, { status: 409 });
    }

    const body = await request.json();
    const update: Record<string, unknown> = { updated_at: new Date().toISOString() };
    if (body?.descricao !== undefined) update.descricao = body.descricao;
    if (body?.valorMt !== undefined) update.valor_mt = body.valorMt;
    if (body?.quantidade !== undefined) update.quantidade = body.quantidade;

    const { data, error } = await supabase
      .from('quotation_batch_expenses')
      .update(update)
      .eq('id', expenseId)
      .select()
      .single();
    if (error) throw error;

    await refreshAccountingSnapshotCosts(supabase, batchId);

    return NextResponse.json({ success: true, despesa: data });
  } catch (error: any) {
    console.error('[admin/cotacoes/despesas PATCH] error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ batchId: string; expenseId: string }> }) {
  const auth = await requireAdminOrReseller();
  if ('error' in auth) return auth.error;
  if (auth.user.role !== 'admin') {
    return NextResponse.json({ success: false, error: 'Acção restrita a administradores.' }, { status: 403 });
  }

  const supabase = getSupabaseAdmin();
  if (!supabase) {
    return NextResponse.json({ success: false, error: 'Supabase Service Role não configurado.' }, { status: 503 });
  }

  const { batchId, expenseId } = await params;

  try {
    const { data: existing, error: existingError } = await supabase
      .from('quotation_batch_expenses')
      .select('created_at')
      .eq('id', expenseId)
      .single();
    if (existingError || !existing) {
      return NextResponse.json({ success: false, error: 'Despesa não encontrada.' }, { status: 404 });
    }
    const expenseYear = new Date(existing.created_at).getFullYear();
    if (await isYearClosed(supabase, expenseYear)) {
      return NextResponse.json({ success: false, error: `O exercício de ${expenseYear} já está fechado — não é possível remover esta despesa.` }, { status: 409 });
    }

    const { error } = await supabase.from('quotation_batch_expenses').delete().eq('id', expenseId);
    if (error) throw error;

    await refreshAccountingSnapshotCosts(supabase, batchId);

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('[admin/cotacoes/despesas DELETE] error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
