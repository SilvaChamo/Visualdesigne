import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase-admin';
import { resolveQuotationAccess } from '@/lib/quotation-access';
import { notifyQuoteTeam } from '@/lib/notify-quote-team';
import { notifyQuoteClientNewMessage } from '@/lib/notify-quote-client';

// Chat por encomenda, partilhado entre o painel do cliente e o painel admin.
// resolveQuotationAccess decide se quem pede é o dono ('client') ou a equipa
// ('admin'), e isso define o sender_role gravado.
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const access = await resolveQuotationAccess(id);
  if (!access.ok) return access.response;

  const admin = getSupabaseAdmin();
  if (!admin) {
    return NextResponse.json({ error: 'Serviço indisponível.' }, { status: 503 });
  }

  const { data, error } = await admin
    .from('quotation_messages')
    .select('*')
    .in('quotation_id', access.batchQuotationIds)
    .order('created_at', { ascending: true });

  if (error) {
    console.error('[cotacoes/[id]/mensagens] list error:', error);
    return NextResponse.json({ error: 'Não foi possível carregar as mensagens.' }, { status: 500 });
  }

  return NextResponse.json({ success: true, mensagens: data || [] });
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const access = await resolveQuotationAccess(id);
  if (!access.ok) return access.response;

  const body = await request.json().catch(() => ({}));
  const message = typeof body?.message === 'string' ? body.message.trim() : '';

  if (!message) {
    return NextResponse.json({ error: 'Escreva uma mensagem.' }, { status: 400 });
  }
  if (message.length > 2000) {
    return NextResponse.json({ error: 'Mensagem demasiado longa (máx. 2000 caracteres).' }, { status: 400 });
  }

  const admin = getSupabaseAdmin();
  if (!admin) {
    return NextResponse.json({ error: 'Serviço indisponível.' }, { status: 503 });
  }

  const { data: inserted, error } = await admin
    .from('quotation_messages')
    .insert({
      quotation_id: id,
      sender_role: access.role,
      sender_user_id: access.userId,
      message,
    })
    .select()
    .single();

  if (error) {
    console.error('[cotacoes/[id]/mensagens] insert error:', error);
    return NextResponse.json({ error: 'Não foi possível enviar a mensagem.' }, { status: 500 });
  }

  const quotation = access.quotation;
  if (access.role === 'client') {
    notifyQuoteTeam({
      title: 'Nova mensagem do cliente',
      message: `${quotation.empresa} escreveu sobre "${quotation.produto}": "${message}"`,
      link: `${process.env.NEXT_PUBLIC_SITE_URL || ''}/dashboard?section=cotacoes`,
    }).catch((err) => console.error('[cotacoes/[id]/mensagens] falha ao notificar equipa:', err));
  } else {
    notifyQuoteClientNewMessage({
      to: quotation.email,
      clientName: quotation.responsavel || quotation.empresa,
      produto: quotation.produto,
      message,
    }).catch((err) => console.error('[cotacoes/[id]/mensagens] falha ao notificar cliente:', err));
  }

  return NextResponse.json({ success: true, mensagem: inserted });
}
