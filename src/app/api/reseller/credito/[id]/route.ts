import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { getSupabaseAdmin } from '@/lib/supabase-admin';
import { resolveRoleForAuthUser } from '@/lib/server-auth-role';
import { getResellerDaUsername } from '@/lib/directadmin-credentials';
import { loadResellerCredentialsByUserId } from '@/lib/da-credential-store';
import { getAttachmentSignedUrl } from '@/lib/quotation-attachments-bucket';

// Estado de um único pedido de carregamento — usado pela página /credito/[id]
// (link do email de notificação e do sucesso do Stripe). Acessível pelo
// próprio revendedor dono do pedido ou por um admin, tal como /cotacao/[id].
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
    .from('reseller_credit_requests')
    .select('*')
    .eq('id', id)
    .single();
  if (error || !pedido) {
    return NextResponse.json({ error: 'Pedido não encontrado.' }, { status: 404 });
  }

  const role = await resolveRoleForAuthUser(supabase, user);
  if (role !== 'admin') {
    const stored = await loadResellerCredentialsByUserId(user.id);
    const daUsername = stored?.user || (await getResellerDaUsername({ id: user.id, email: user.email, role: 'reseller' }));
    if (!daUsername || daUsername !== pedido.da_username) {
      return NextResponse.json({ error: 'Não tem permissão para ver este pedido.' }, { status: 403 });
    }
  }

  const signedUrl = await getAttachmentSignedUrl(pedido.comprovativo_url);
  return NextResponse.json({ success: true, pedido: { ...pedido, comprovativo_url: signedUrl } });
}
