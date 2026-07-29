import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { getSupabaseAdmin } from '@/lib/supabase-admin';
import { resolveRoleForAuthUser } from '@/lib/server-auth-role';

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

  return NextResponse.json({ success: true, pedido });
}
