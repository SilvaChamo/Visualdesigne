import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { getSupabaseAdmin } from '@/lib/supabase-admin';

const VALID_METODOS = ['mpesa', 'emola', 'transferencia', 'stripe'];

// Troca do método de pagamento de um pedido ainda pendente — usado pelo
// selector de método na página /checkout (ver "renewalId"). Só o dono do
// pedido pode trocar, e só enquanto ainda estiver pendente: depois de
// confirmado/rejeitado o método fica congelado com o que foi realmente usado.
export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Faça login para continuar.' }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const metodo = body?.metodo_pagamento;
  if (!metodo || !VALID_METODOS.includes(metodo)) {
    return NextResponse.json({ error: 'Método de pagamento inválido.' }, { status: 400 });
  }

  const admin = getSupabaseAdmin();
  if (!admin) {
    return NextResponse.json({ error: 'Serviço indisponível.' }, { status: 503 });
  }

  const { data: pedido, error: pedidoError } = await admin
    .from('renewal_payment_requests')
    .select('id, user_id, status')
    .eq('id', id)
    .single();
  if (pedidoError || !pedido) {
    return NextResponse.json({ error: 'Pedido não encontrado.' }, { status: 404 });
  }
  if (pedido.user_id !== user.id) {
    return NextResponse.json({ error: 'Não tem permissão para editar este pedido.' }, { status: 403 });
  }
  if (pedido.status !== 'pending') {
    return NextResponse.json({ error: 'Este pedido já foi respondido pela equipa — não é possível trocar o método.' }, { status: 409 });
  }

  const { data: updated, error: updateError } = await admin
    .from('renewal_payment_requests')
    .update({ metodo_pagamento: metodo })
    .eq('id', id)
    .select()
    .single();
  if (updateError) {
    console.error('[renewals/pagamento metodo] update error:', updateError);
    return NextResponse.json({ error: 'Não foi possível actualizar o método de pagamento.' }, { status: 500 });
  }

  return NextResponse.json({ success: true, pedido: updated });
}
