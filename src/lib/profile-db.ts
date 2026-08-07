import type { SupabaseClient } from '@supabase/supabase-js';

export type ProfileRow = {
  id?: string;
  user_id?: string | null;
  email?: string | null;
  role?: string | null;
  name?: string | null;
  da_username?: string | null;
  da_password_encrypted?: string | null;
  da_domain?: string | null;
  da_provisioned_at?: string | null;
  reseller_tier?: string | null;
};

const PROFILE_COLUMNS =
  'id, user_id, email, role, name, da_username, da_password_encrypted, da_domain, da_provisioned_at, reseller_tier';

/** Campos WHOIS obrigatórios antes de deixar comprar um domínio (ver dynadot-adapter.ts). */
const WHOIS_REQUIRED_FIELDS = ['telefone', 'morada', 'cidade'] as const;

/** Confirma que o perfil tem os dados mínimos para um registo WHOIS real (não genérico). */
export async function isProfileWhoisComplete(admin: SupabaseClient, authUserId: string): Promise<boolean> {
  const { data } = await admin
    .from('profiles')
    .select('telefone, morada, cidade')
    .or(profileAuthOrFilter(authUserId))
    .maybeSingle();
  if (!data) return false;
  return WHOIS_REQUIRED_FIELDS.every((f) => {
    const value = (data as Record<string, unknown>)[f];
    return typeof value === 'string' && value.trim().length > 0;
  });
}

/** Filtro PostgREST para perfil ligado ao Auth (suporta `user_id` e legado `id`). */
export function profileAuthOrFilter(authUserId: string): string {
  return `user_id.eq.${authUserId},id.eq.${authUserId}`;
}

/** Nome legível — aceita `name` (Supabase) ou `nome` legado em metadata/UI. */
export function profileName(
  profile?: { name?: string | null; nome?: string | null } | null,
  fallback = '',
): string {
  return (profile?.name as string) || (profile?.nome as string) || fallback;
}

export async function getProfileForAuthUser(
  admin: SupabaseClient,
  authUserId: string,
  email?: string | null,
): Promise<ProfileRow | null> {
  // #27: normaliza aqui para a procura por email nunca falhar por causa de
  // maiúsculas/espaços que um chamador tenha deixado passar (o insert que
  // criou a linha original também normaliza, mas não é garantido que todos
  // os chamadores façam o mesmo antes de aqui chegar).
  const normalizedEmail = email ? email.toLowerCase().trim() : email;
  const { data: byUserId } = await admin
    .from('profiles')
    .select(PROFILE_COLUMNS)
    .eq('user_id', authUserId)
    .maybeSingle();
  if (byUserId) return byUserId as ProfileRow;

  const { data: byId } = await admin
    .from('profiles')
    .select(PROFILE_COLUMNS)
    .eq('id', authUserId)
    .maybeSingle();
  if (byId) return byId as ProfileRow;

  // Fallback: perfis antigos/duplicados podem ter user_id/id desalinhados com o auth.users
  // actual — sem isto, o insert seguinte viola profiles_email_key em vez de actualizar a linha certa.
  if (normalizedEmail) {
    const { data: byEmail } = await admin
      .from('profiles')
      .select(PROFILE_COLUMNS)
      .eq('email', normalizedEmail)
      .maybeSingle();
    if (byEmail) return byEmail as ProfileRow;
  }

  return null;
}

export async function saveProfileForAuthUser(
  admin: SupabaseClient,
  authUserId: string,
  fields: {
    email?: string;
    role?: string;
    name?: string | null;
    /** Alias legado — grava em `name`. */
    nome?: string | null;
    da_username?: string | null;
    da_password_encrypted?: string | null;
    da_domain?: string | null;
    da_provisioned_at?: string | null;
    reseller_tier?: string | null;
    telefone?: string | null;
    empresa?: string | null;
    morada?: string | null;
    cidade?: string | null;
  },
): Promise<void> {
  const displayName = fields.name ?? fields.nome ?? undefined;
  const normalizedEmail = fields.email !== undefined ? fields.email.toLowerCase().trim() : undefined;
  const existing = await getProfileForAuthUser(admin, authUserId, normalizedEmail);
  const payload: Record<string, unknown> = { user_id: authUserId };

  if (normalizedEmail !== undefined) payload.email = normalizedEmail;
  if (fields.role !== undefined) payload.role = fields.role;
  if (displayName !== undefined) payload.name = displayName || fields.email?.split('@')[0] || null;
  if (fields.da_username !== undefined) payload.da_username = fields.da_username;
  if (fields.da_password_encrypted !== undefined) {
    payload.da_password_encrypted = fields.da_password_encrypted;
  }
  if (fields.da_domain !== undefined) payload.da_domain = fields.da_domain;
  if (fields.da_provisioned_at !== undefined) payload.da_provisioned_at = fields.da_provisioned_at;
  if (fields.reseller_tier !== undefined) payload.reseller_tier = fields.reseller_tier;
  if (fields.telefone !== undefined) payload.telefone = fields.telefone;
  if (fields.empresa !== undefined) payload.empresa = fields.empresa;
  if (fields.morada !== undefined) payload.morada = fields.morada;
  if (fields.cidade !== undefined) payload.cidade = fields.cidade;

  if (existing?.id) {
    const { error } = await admin.from('profiles').update(payload).eq('id', existing.id);
    if (error) throw toProfileDbError('profiles.update', error);
    return;
  }

  const { error } = await admin.from('profiles').insert(payload);
  if (!error) return;

  // #27: se o chamador não tinha o email à mão para a procura acima (ou por
  // qualquer outra razão a linha existente não foi encontrada por user_id/id),
  // o insert acima colide com profiles_email_key em vez de rebentar em
  // silêncio — antes de desistir, tenta uma última vez actualizar a linha
  // real pelo email, que é exactamente a que a constraint está a apontar.
  if (error.code === '23505' && normalizedEmail) {
    const { data: byEmail } = await admin
      .from('profiles')
      .select('id')
      .eq('email', normalizedEmail)
      .maybeSingle();
    if (byEmail?.id) {
      const { error: retryError } = await admin.from('profiles').update(payload).eq('id', byEmail.id);
      if (!retryError) return;
      throw toProfileDbError('profiles.update (retry)', retryError);
    }
  }

  throw toProfileDbError('profiles.insert', error);
}

/**
 * #16: PostgrestError é um objecto simples, não uma instância de Error — quem
 * apanha com `error instanceof Error` (padrão comum no projecto) descartava
 * sempre a mensagem real e mostrava um texto genérico. Normaliza aqui, na
 * origem, para todos os chamadores beneficiarem sem repetir isto em cada um.
 */
function toProfileDbError(context: string, error: { message?: string; code?: string; details?: string; hint?: string }): Error {
  const parts = [error.message, error.code && `code=${error.code}`, error.details, error.hint].filter(Boolean);
  return new Error(`${context}: ${parts.join(' | ') || 'erro desconhecido'}`);
}
