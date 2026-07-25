/**
 * Todas as caches do painel (pacotes, DNS, sites, contas, backups, webmail, etc.) usam
 * sessionStorage ou localStorage com chaves "vd_*"/"vd-*", "panel_*"/"panel-*" ou "webmail_*",
 * sem qualquer marca de utilizador. Esses storages sobrevivem a navegações e a
 * signOut()+redirect na mesma aba, por isso, sem esta limpeza, dados de uma conta (ex.: DNS da
 * VisualDesign, assinaturas/contas importadas de Webmail) ficam visíveis para a próxima conta
 * que fizer login na mesma aba (ex.: um cliente). Chamar sempre que uma sessão termina.
 */
const PANEL_CACHE_PREFIXES = ['vd_', 'vd-', 'panel_', 'panel-', 'webmail_'];

function sweepStorage(storage: Storage): void {
  const keys = Object.keys(storage);
  for (const key of keys) {
    if (PANEL_CACHE_PREFIXES.some((prefix) => key.startsWith(prefix))) {
      storage.removeItem(key);
    }
  }
}

export function clearAllPanelClientCaches(): void {
  if (typeof window === 'undefined') return;
  try {
    sweepStorage(sessionStorage);
  } catch {
    /* sessionStorage indisponível */
  }
  try {
    sweepStorage(localStorage);
  } catch {
    /* localStorage indisponível */
  }
}
