/**
 * Rastreamento de erros "caseiro" — sem serviço externo (Sentry, etc.).
 * Escreve uma notificação para o admin ver no painel sempre que algo falha
 * de forma inesperada no servidor. Reaproveitado por instrumentation.ts
 * (rede de segurança global) e disponível para qualquer rota chamar
 * directamente em pontos críticos.
 */
import { createClient } from '@supabase/supabase-js';
import { sendEmail } from '@/lib/email-service';
import { emailHeader, emailGreeting, emailFooter } from '@/lib/renewal-templates';

// Caixa de sistema dedicada — antes ia para o email pessoal do admin
// (silva.chamo@gmail.com), o que misturava alertas de servidor com correio
// normal e passava despercebido.
const TEAM_EMAIL = 'servidor@visualdesignmoz.com';
const SUPPORT_EMAIL = 'suporte@visualdesignmoz.com';
const SUPPORT_PHONE = '+258 85 242 5525';
const COMPANY_NAME = 'VisualDesign';

function buildErrorEmailHtml(context: string, message: string) {
  const body = `
    <div style="background: #fef2f2; border: 1px solid #fecaca; border-radius: 8px; padding: 20px; font-family: 'Exo 2', sans-serif;">
      <p style="margin: 0 0 8px 0; color: #991b1b; font-weight: bold;">Erro inesperado no servidor</p>
      <p style="margin: 0 0 8px 0; color: #374151; font-size: 14px;"><strong>Onde:</strong> ${context}</p>
      <pre style="white-space: pre-wrap; word-break: break-word; background: #ffffff; border: 1px solid #e5e7eb; border-radius: 6px; padding: 12px; font-size: 12px; color: #374151;">${message}</pre>
    </div>
  `;
  return `
<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"></head>
<body style="margin: 0; padding: 0; font-family: 'Exo 2', sans-serif; background: #f3f4f6;">
  <table width="100%" cellpadding="0" cellspacing="0" border="0">
    ${emailHeader(COMPANY_NAME)}
    <tr>
      <td align="center" style="padding: 24px 12px; background: #f3f4f6;">
        <table width="600" cellpadding="0" cellspacing="0" border="0" style="max-width: 600px; width: 100%; background: #ffffff; border: 1px solid #e5e7eb;">
          <tr><td>${emailGreeting('Equipa')}</td></tr>
          <tr><td style="padding: 20px 24px;">${body}</td></tr>
          <tr><td>${emailFooter(SUPPORT_EMAIL, SUPPORT_PHONE, COMPANY_NAME)}</td></tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim();
}

function adminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key);
}

// Evita inundar a tabela notifications quando um erro entra em ciclo (ex.:
// uncaughtException repetido antes do pm2 conseguir reiniciar) — no máximo
// uma notificação por contexto a cada minuto. Em memória de propósito: o
// pior cenário de perder isto num restart é, no máximo, um log a mais.
const recentContexts = new Map<string, number>();
const DEDUP_WINDOW_MS = 60_000;

function shouldSkip(context: string): boolean {
  const now = Date.now();
  const last = recentContexts.get(context);
  if (last && now - last < DEDUP_WINDOW_MS) return true;
  recentContexts.set(context, now);
  if (recentContexts.size > 500) recentContexts.clear();
  return false;
}

export async function logServerError(context: string, error: unknown): Promise<void> {
  console.error(`[error-log] ${context}:`, error);

  if (shouldSkip(context)) return;

  try {
    const admin = adminClient();
    if (!admin) return;

    const { data: adminProfile } = await admin
      .from('profiles')
      .select('id')
      .eq('role', 'admin')
      .limit(1)
      .maybeSingle();
    if (!adminProfile?.id) return;

    const message = error instanceof Error ? error.message : String(error);
    const stack = error instanceof Error ? error.stack : undefined;

    const fullMessage = stack ? `${message}\n\n${stack.slice(0, 1500)}` : message;

    await admin.from('notifications').insert({
      user_id: adminProfile.id,
      title: `Erro: ${context}`,
      message: fullMessage,
      type: 'error',
      category: 'system',
    });

    // Uma notificação por si só facilmente passa despercebida — um erro
    // deste tipo é raro o suficiente para merecer sempre um email.
    await sendEmail({
      to: TEAM_EMAIL,
      subject: `Erro: ${context}`,
      html: buildErrorEmailHtml(context, fullMessage),
      category: 'transactional',
    }).catch((emailErr) => console.error('[error-log] falha ao enviar email de erro:', emailErr));
  } catch {
    /* um alerta falhado nunca deve propagar */
  }
}
