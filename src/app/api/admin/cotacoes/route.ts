import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { requireAdminOrReseller } from '@/lib/panel-api-auth';
import { notifyQuoteClientStatusChange } from '@/lib/notify-quote-client';
import { computeBatchStatus } from '@/lib/quotation-status-labels';
import { QUOTATION_ATTACHMENTS_BUCKET } from '@/lib/quotation-attachments-bucket';
import { QUOTATION_LAYOUTS_BUCKET } from '@/lib/quotation-layouts-bucket';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

function getSupabaseAdmin() {
  if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error('Supabase Service Role não configurado.');
  }

  return createClient(supabaseUrl, supabaseServiceKey);
}

const VALID_STATUS = ['pending', 'payment_selected', 'approved', 'delivered', 'rejected', 'done', 'cancelled'];

// Lista todos os pedidos de cotação recebidos, para a equipa acompanhar no dashboard.
export async function GET(request: Request) {
  const auth = await requireAdminOrReseller();
  if ('error' in auth) return auth.error;
  if (auth.user.role !== 'admin') {
    return NextResponse.json({ success: false, error: 'Acção restrita a administradores.' }, { status: 403 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const supabase = getSupabaseAdmin();

    let query = supabase
      .from('quotation_requests')
      .select('*')
      .order('created_at', { ascending: false });

    if (status && VALID_STATUS.includes(status)) {
      query = query.eq('status', status);
    }

    const { data, error } = await query;
    if (error) throw error;

    return NextResponse.json({ success: true, cotacoes: data || [] });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// Actualiza o estado de um pedido de cotação (ex.: marcar como concluída ou cancelada).
export async function PATCH(request: Request) {
  const auth = await requireAdminOrReseller();
  if ('error' in auth) return auth.error;
  if (auth.user.role !== 'admin') {
    return NextResponse.json({ success: false, error: 'Acção restrita a administradores.' }, { status: 403 });
  }

  try {
    const body = await request.json();
    const { id, status, rejectionReason, batchId, dataLimiteEntrega } = body || {};

    // Alterar a data limite de entrega prevista — aplica-se a todos os itens da mesma
    // encomenda (batch), já que foram todos submetidos com o mesmo prazo original.
    if (batchId && dataLimiteEntrega) {
      const supabase = getSupabaseAdmin();
      const { data, error } = await supabase
        .from('quotation_requests')
        .update({ data_limite_entrega: dataLimiteEntrega, updated_at: new Date().toISOString() })
        .eq('batch_id', batchId)
        .select();

      if (error) throw error;
      return NextResponse.json({ success: true, cotacoes: data });
    }

    if (!id || !status) {
      return NextResponse.json({ success: false, error: 'id e status são obrigatórios.' }, { status: 400 });
    }
    if (!VALID_STATUS.includes(status)) {
      return NextResponse.json({ success: false, error: 'Status inválido.' }, { status: 400 });
    }

    const supabase = getSupabaseAdmin();
    const update: Record<string, unknown> = { status, updated_at: new Date().toISOString() };
    if (status === 'rejected') {
      update.rejection_reason = rejectionReason || null;
    }

    const { data, error } = await supabase
      .from('quotation_requests')
      .update(update)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    try {
      await supabase.from('quotation_status_history').insert({
        quotation_id: id,
        status,
        note: status === 'rejected' ? (rejectionReason || null) : null,
        changed_by: 'admin',
      });
    } catch (historyError) {
      console.error('[admin/cotacoes] falha ao registar histórico:', historyError);
    }

    // Emite o número de factura (série própria, sequencial, imutável) na
    // primeira vez que a encomenda é aprovada — é o momento em que a aba
    // "Factura" passa a ficar visível para o cliente. Idempotente: chamadas
    // repetidas devolvem sempre o mesmo número, nunca criam outro.
    let invoiceNumber: string | null = null;
    if (status === 'approved') {
      try {
        const { data: rpcData, error: rpcError } = await supabase.rpc('assign_quotation_invoice_number', {
          p_batch_id: data.batch_id,
        });
        if (rpcError) throw rpcError;
        invoiceNumber = rpcData as string;
      } catch (invoiceError) {
        console.error('[admin/cotacoes] falha ao emitir número de factura:', invoiceError);
      }
    }

    // Livro de pagamentos: regista o valor confirmado nos dois momentos em
    // que o admin efectivamente confirma dinheiro recebido — 'approved'
    // (adiantamento, 70%) e 'done' (remanescente, 30%). Como o estado é
    // actualizado item-a-item (uma encomenda com vários serviços pode
    // disparar este PATCH várias vezes para o mesmo lote), o upsert com
    // `ignoreDuplicates` garante um único registo por fase, sem sobrescrever
    // um valor já confirmado/corrigido manualmente.
    if (status === 'approved' || status === 'done') {
      try {
        const { data: siblings, error: siblingsError } = await supabase
          .from('quotation_requests')
          .select('total_mt, sob_consulta')
          .eq('batch_id', data.batch_id);
        if (siblingsError) throw siblingsError;

        const batchTotal = (siblings || []).reduce(
          (sum, row) => sum + (row.sob_consulta ? 0 : Number(row.total_mt) || 0),
          0,
        );
        const phase = status === 'approved' ? 'advance' : 'remainder';
        const valorMt = Math.round(batchTotal * (phase === 'advance' ? 0.7 : 0.3) * 100) / 100;
        const metodo = phase === 'advance' ? data.metodo_pagamento : data.remanescente_metodo_pagamento;

        const { error: paymentError } = await supabase
          .from('quotation_payments')
          .upsert(
            { batch_id: data.batch_id, phase, metodo, valor_mt: valorMt },
            { onConflict: 'batch_id,phase', ignoreDuplicates: true },
          );
        if (paymentError) throw paymentError;
      } catch (paymentError) {
        console.error('[admin/cotacoes] falha ao registar pagamento:', paymentError);
      }
    }

    // Não aguardar o envio do email (ver /api/cotacoes) — a actualização de
    // estado já ficou gravada, não pode falhar por causa de um SMTP lento.
    if (status === 'approved' || status === 'rejected') {
      notifyQuoteClientStatusChange({
        to: data.email,
        clientName: data.responsavel || data.empresa,
        produto: data.produto,
        status,
        rejectionReason: data.rejection_reason,
      }).catch((err) => console.error('[admin/cotacoes] falha ao notificar cliente:', err));
    }

    return NextResponse.json({ success: true, cotacao: data, invoiceNumber });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// Elimina definitivamente uma encomenda (todas as linhas do batch) — só
// depois de concluída, mesma regra usada do lado do cliente (ver
// /api/cotacoes/[id] DELETE). Mensagens/anexos/histórico saem juntos via ON
// DELETE CASCADE; os ficheiros no bucket têm de ser removidos à parte.
export async function DELETE(request: Request) {
  const auth = await requireAdminOrReseller();
  if ('error' in auth) return auth.error;
  if (auth.user.role !== 'admin') {
    return NextResponse.json({ success: false, error: 'Acção restrita a administradores.' }, { status: 403 });
  }

  try {
    const { batchId } = (await request.json()) || {};
    if (!batchId) {
      return NextResponse.json({ success: false, error: 'batchId é obrigatório.' }, { status: 400 });
    }

    const supabase = getSupabaseAdmin();

    const { data: batchItems, error: batchError } = await supabase
      .from('quotation_requests')
      .select('id, status')
      .eq('batch_id', batchId);

    if (batchError || !batchItems || batchItems.length === 0) {
      return NextResponse.json({ success: false, error: 'Encomenda não encontrada.' }, { status: 404 });
    }

    if (computeBatchStatus(batchItems) !== 'done') {
      return NextResponse.json(
        { success: false, error: 'Só é possível eliminar encomendas já concluídas.' },
        { status: 409 },
      );
    }

    // Uma factura emitida (número sequencial imutável) nunca pode desaparecer
    // silenciosamente — bloqueia a eliminação em vez de apagar o registo.
    const { data: existingInvoice } = await supabase
      .from('quotation_invoices')
      .select('invoice_number')
      .eq('batch_id', batchId)
      .maybeSingle();

    if (existingInvoice) {
      return NextResponse.json(
        { success: false, error: `Não é possível eliminar: já tem a factura ${existingInvoice.invoice_number} emitida.` },
        { status: 409 },
      );
    }

    const ids = batchItems.map((i) => i.id);

    const { data: attachments } = await supabase
      .from('quotation_attachments')
      .select('file_url')
      .in('quotation_id', ids);

    if (attachments && attachments.length > 0) {
      const paths = attachments
        .map((a) => a.file_url.split(`${QUOTATION_ATTACHMENTS_BUCKET}/`)[1])
        .filter((p): p is string => Boolean(p));
      if (paths.length > 0) {
        await supabase.storage.from(QUOTATION_ATTACHMENTS_BUCKET).remove(paths);
      }
    }

    const { data: layouts } = await supabase
      .from('quotation_layouts')
      .select('file_url')
      .in('quotation_id', ids);

    if (layouts && layouts.length > 0) {
      const paths = layouts
        .map((l) => l.file_url.split(`${QUOTATION_LAYOUTS_BUCKET}/`)[1])
        .filter((p): p is string => Boolean(p));
      if (paths.length > 0) {
        await supabase.storage.from(QUOTATION_LAYOUTS_BUCKET).remove(paths);
      }
    }

    const { error: deleteError } = await supabase.from('quotation_requests').delete().in('id', ids);
    if (deleteError) throw deleteError;

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('[admin/cotacoes DELETE] error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
