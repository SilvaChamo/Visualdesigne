import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { requireAdminOrReseller } from '@/lib/panel-api-auth';
import {
  setImpersonateClientCookie,
  clearImpersonateClientCookie,
  readImpersonateClientUserId,
} from '@/lib/client-impersonation';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

function getSupabaseAdmin() {
  if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error('Supabase Service Role não configurado.');
  }
  return createClient(supabaseUrl, supabaseServiceKey);
}

async function requireAdmin() {
  const auth = await requireAdminOrReseller();
  if ('error' in auth) return auth;
  if (auth.user.role !== 'admin') {
    return { error: NextResponse.json({ success: false, error: 'Acção restrita a administradores.' }, { status: 403 }) };
  }
  return auth;
}

// Entrar como cliente no painel /encomendas — mesmo princípio da
// impersonação de revendedor (cookie, sessão do admin nunca é tocada). Ver
// src/lib/client-impersonation.ts.
export async function POST(request: NextRequest) {
  const auth = await requireAdmin();
  if ('error' in auth) return auth.error;

  try {
    const body = await request.json().catch(() => ({}));
    const userId = String(body?.userId || '').trim();
    if (!userId) {
      return NextResponse.json({ success: false, error: 'userId obrigatório.' }, { status: 400 });
    }

    const supabase = getSupabaseAdmin();
    const { data: existingUser, error: getUserError } = await supabase.auth.admin.getUserById(userId);
    if (getUserError || !existingUser?.user) {
      return NextResponse.json({ success: false, error: 'Conta não encontrada.' }, { status: 404 });
    }

    await setImpersonateClientCookie(userId);

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('[admin/cotacoes/clientes/entrar] erro:', error);
    return NextResponse.json({ success: false, error: error?.message || 'Erro interno' }, { status: 500 });
  }
}

// Estado actual da impersonação — usado pelo layout de /encomendas para
// decidir se mostra o aviso "a ver como cliente X".
export async function GET() {
  const auth = await requireAdmin();
  if ('error' in auth) return auth.error;

  const userId = await readImpersonateClientUserId();
  return NextResponse.json({ success: true, active: !!userId, userId });
}

// Sair da impersonação — volta a mostrar o próprio painel do admin.
export async function DELETE() {
  const auth = await requireAdmin();
  if ('error' in auth) return auth.error;

  await clearImpersonateClientCookie();
  return NextResponse.json({ success: true });
}
