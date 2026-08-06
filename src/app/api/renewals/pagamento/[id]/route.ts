import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { getSupabaseAdmin } from '@/lib/supabase-admin';
import { resolveRoleForAuthUser } from '@/lib/server-auth-role';
import { getAttachmentSignedUrl } from '@/lib/quotation-attachments-bucket';

// Estado de um único pedido de pagamento de renovação — usado pela página
// /renovacao/[id] (link do email e do sucesso do Stripe). Acessível pelo
// próprio dono do pedido ou por um admin.
export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Faça login para continuar.' }, { status: 401 });
  }

  const admin = getSupabaseAdmin();
  if (!admin) {
    return NextResponse.json({ error: 'Serviço indisponível.' }, { status: 503 });
  }

  const { data: pedido, error } = await admin
    .from('renewal_payment_requests')
    .select('*')
    .eq('id', id)
    .single();
  if (error || !pedido) {
    return NextResponse.json({ error: 'Pedido não encontrado.' }, { status: 404 });
  }

  if (pedido.user_id !== user.id) {
    const role = await resolveRoleForAuthUser(supabase, user);
    if (role !== 'admin') {
      return NextResponse.json({ error: 'Não tem permissão para ver este pedido.' }, { status: 403 });
    }
  }

  // Número da factura do ciclo (se já tiver sido atribuído pelo cron de
  // renovações — ver assign_renewal_invoice_number em supabase-renewal-invoices.sql).
  // Melhor esforço: a página de checkout funciona igualmente sem isto.
  let invoiceNumber: string | null = null;
  let invoiceDate: string | null = null;
  let expirationDate: string | null = null;
  try {
    const table = pedido.renewal_type === 'domain' ? 'domain_renewals' : 'hosting_renewals';
    const { data: renewal } = await admin
      .from(table)
      .select('expiration_date')
      .eq('id', pedido.renewal_id)
      .maybeSingle();
    if (renewal?.expiration_date) {
      expirationDate = renewal.expiration_date;
      const { data: invoiceRow } = await admin
        .from('renewal_invoices')
        .select('invoice_number, issued_at')
        .eq('service_type', pedido.renewal_type)
        .eq('service_id', pedido.renewal_id)
        .eq('expiration_date', renewal.expiration_date)
        .maybeSingle();
      if (invoiceRow) {
        invoiceNumber = invoiceRow.invoice_number;
        invoiceDate = invoiceRow.issued_at;
      }
    }
  } catch (invoiceErr) {
    console.error('[renewals/pagamento] Falha ao obter nº de factura:', invoiceErr);
  }

  const comprovativoSignedUrl = await getAttachmentSignedUrl(pedido.comprovativo_url);

  return NextResponse.json({
    success: true,
    pedido: {
      ...pedido,
      comprovativo_url: comprovativoSignedUrl,
      invoice_number: invoiceNumber,
      invoice_date: invoiceDate,
      expiration_date: expirationDate,
    },
  });
}
