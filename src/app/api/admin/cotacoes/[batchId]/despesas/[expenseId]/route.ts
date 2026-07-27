import { NextResponse } from 'next/server';
import { requireAdminOrReseller } from '@/lib/panel-api-auth';
import { getSupabaseAdmin } from '@/lib/supabase-admin';

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

  const { expenseId } = await params;

  try {
    const body = await request.json();
    const update: Record<string, unknown> = { updated_at: new Date().toISOString() };
    if (body?.descricao !== undefined) update.descricao = body.descricao;
    if (body?.valorMt !== undefined) update.valor_mt = body.valorMt;

    const { data, error } = await supabase
      .from('quotation_batch_expenses')
      .update(update)
      .eq('id', expenseId)
      .select()
      .single();
    if (error) throw error;

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

  const { expenseId } = await params;

  try {
    const { error } = await supabase.from('quotation_batch_expenses').delete().eq('id', expenseId);
    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('[admin/cotacoes/despesas DELETE] error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
