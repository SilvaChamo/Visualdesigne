import { NextRequest, NextResponse } from 'next/server';
import { createClient as createAdminClient } from '@supabase/supabase-js';
import { requireAdmin } from '@/lib/admin-api-auth';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

/**
 * #19 (3.1) — a acção que a maioria dos admins procura ao pensar em "eliminar"
 * um domínio não é apagá-lo (nunca se apaga o registo real), é desligar a
 * renovação automática. Faltava um sítio para o fazer.
 */
export async function POST(req: NextRequest) {
  const auth = await requireAdmin();
  if ('error' in auth) return auth.error;

  try {
    const { domain, autoRenew } = (await req.json()) as { domain?: string; autoRenew?: boolean };
    const domainName = (domain || '').toLowerCase().trim();
    if (!domainName || typeof autoRenew !== 'boolean') {
      return NextResponse.json({ success: false, error: 'domain e autoRenew (boolean) são obrigatórios.' }, { status: 400 });
    }
    if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
      return NextResponse.json({ success: false, error: 'Supabase Service Role não configurado.' }, { status: 500 });
    }
    const admin = createAdminClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

    const { data: existing } = await admin
      .from('domain_renewals')
      .select('id')
      .eq('domain_name', domainName)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!existing?.id) {
      return NextResponse.json(
        { success: false, error: `Não há registo de renovação para ${domainName} — nada para actualizar.` },
        { status: 404 },
      );
    }

    const { error: updateError } = await admin
      .from('domain_renewals')
      .update({ auto_renew: autoRenew })
      .eq('id', existing.id);
    if (updateError) {
      return NextResponse.json({ success: false, error: updateError.message }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: `Renovação automática ${autoRenew ? 'activada' : 'desactivada'} para ${domainName}.`,
    });
  } catch (error: unknown) {
    console.error('[admin/domains/auto-renew] POST:', error);
    const message = error instanceof Error ? error.message : 'Erro ao actualizar renovação automática';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
