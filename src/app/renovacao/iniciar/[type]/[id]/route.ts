import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { getSupabaseAdmin } from '@/lib/supabase-admin';

const VALID_TYPES = ['domain', 'hosting'];

// Ponte mínima entre o link de notificação/email e a página de pagamento
// já existente (/renovacao/[id]): cria o pedido (método M-Pesa por omissão,
// o cliente pode trocar depois na página) e redirecciona. Mesma lógica de
// POST /api/renewals/pagamento, usada hoje só pelos revendedores.
export async function GET(
  request: Request,
  { params }: { params: Promise<{ type: string; id: string }> }
) {
  const { type, id } = await params;
  const { origin } = new URL(request.url);

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.redirect(`${origin}/login?redirect=/renovacao/iniciar/${type}/${id}`);
  }
  if (!VALID_TYPES.includes(type)) {
    return NextResponse.redirect(`${origin}/dashboard?section=renewals`);
  }

  const admin = getSupabaseAdmin();
  if (!admin) {
    return NextResponse.redirect(`${origin}/dashboard?section=renewals`);
  }

  const table = type === 'domain' ? 'domain_renewals' : 'hosting_renewals';
  const { data: renewal, error: renewalError } = await admin
    .from(table)
    .select('id, user_id, domain_name, renewal_price')
    .eq('id', id)
    .single();
  if (renewalError || !renewal || renewal.user_id !== user.id) {
    return NextResponse.redirect(`${origin}/dashboard?section=renewals`);
  }

  const { data: existing } = await admin
    .from('renewal_payment_requests')
    .select('id')
    .eq('renewal_type', type)
    .eq('renewal_id', id)
    .eq('status', 'pending')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (existing) {
    return NextResponse.redirect(`${origin}/renovacao/${existing.id}`);
  }

  const valorMt = Number(renewal.renewal_price);
  if (!Number.isFinite(valorMt) || valorMt <= 0) {
    return NextResponse.redirect(`${origin}/dashboard?section=renewals`);
  }

  const { data: pedido, error } = await admin
    .from('renewal_payment_requests')
    .insert({
      user_id: user.id,
      renewal_type: type,
      renewal_id: id,
      service_name: renewal.domain_name,
      valor_mt: valorMt,
      metodo_pagamento: 'mpesa',
      status: 'pending',
    })
    .select()
    .single();
  if (error || !pedido) {
    return NextResponse.redirect(`${origin}/dashboard?section=renewals`);
  }

  return NextResponse.redirect(`${origin}/renovacao/${pedido.id}`);
}
