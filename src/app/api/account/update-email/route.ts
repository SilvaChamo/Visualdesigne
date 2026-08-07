import { NextRequest, NextResponse } from 'next/server';
import { createClient as createAdminClient } from '@supabase/supabase-js';
import { createClient as createServerClient } from '@/utils/supabase/server';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * #22: trocar o email da própria conta a partir do checkout, sem interromper
 * a compra. Um update directo via cliente Supabase (RLS) dispararia o fluxo
 * normal de confirmação por email do Auth — aqui usamos a service role com
 * email_confirm:true para confirmar já, e escrevemos Auth + profiles juntos
 * (nunca só um dos dois, para não reproduzir a divergência dos #15/#16/#17).
 */
export async function POST(req: NextRequest) {
  try {
    const serverClient = await createServerClient();
    const {
      data: { user: sessionUser },
    } = await serverClient.auth.getUser();

    if (!sessionUser) {
      return NextResponse.json({ success: false, error: 'Sessão não encontrada.' }, { status: 401 });
    }

    const { newEmail } = (await req.json()) as { newEmail?: string };
    const normalizedEmail = String(newEmail || '').toLowerCase().trim();

    if (!EMAIL_REGEX.test(normalizedEmail)) {
      return NextResponse.json({ success: false, error: 'Email inválido.' }, { status: 400 });
    }

    if (normalizedEmail === (sessionUser.email || '').toLowerCase()) {
      return NextResponse.json({ success: true, email: normalizedEmail, unchanged: true });
    }

    if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
      return NextResponse.json({ success: false, error: 'Serviço indisponível.' }, { status: 500 });
    }
    const admin = createAdminClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

    const { data: existingProfile } = await admin
      .from('profiles')
      .select('user_id')
      .eq('email', normalizedEmail)
      .maybeSingle();
    if (existingProfile && existingProfile.user_id !== sessionUser.id) {
      return NextResponse.json(
        { success: false, error: 'Já existe outra conta com este email.' },
        { status: 409 },
      );
    }

    const { error: updateAuthError } = await admin.auth.admin.updateUserById(sessionUser.id, {
      email: normalizedEmail,
      email_confirm: true,
    });
    if (updateAuthError) {
      const msg = updateAuthError.message.toLowerCase();
      if (msg.includes('already') || msg.includes('registered') || msg.includes('exists')) {
        return NextResponse.json(
          { success: false, error: 'Já existe outra conta com este email.' },
          { status: 409 },
        );
      }
      return NextResponse.json({ success: false, error: updateAuthError.message }, { status: 400 });
    }

    const { error: updateProfileError } = await admin
      .from('profiles')
      .update({ email: normalizedEmail })
      .eq('user_id', sessionUser.id);
    if (updateProfileError) {
      // Reverte o Auth para não deixar Auth e profiles a discordar (#15/#17).
      await admin.auth.admin.updateUserById(sessionUser.id, { email: sessionUser.email });
      return NextResponse.json(
        { success: false, error: `Falha ao actualizar perfil: ${updateProfileError.message}` },
        { status: 500 },
      );
    }

    return NextResponse.json({ success: true, email: normalizedEmail });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Erro ao trocar email';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
