/**
 * Password padrão para contas legadas (espelho download ↔ login).
 * Lazy de propósito — só lê/valida a env var quando é mesmo usada, para não
 * rebentar o build ou qualquer import que não chegue a precisar dela.
 */
export function getStandardPanelPassword(): string {
  const value = process.env.STANDARD_EMAIL_PASSWORD;
  if (!value) {
    throw new Error('STANDARD_EMAIL_PASSWORD não configurada.');
  }
  return value;
}
