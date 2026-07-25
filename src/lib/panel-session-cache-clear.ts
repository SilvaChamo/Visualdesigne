/**
 * Todas as caches do painel (pacotes, DNS, sites, contas, backups, webmail, etc.) usam
 * sessionStorage com chaves "vd_*" ou "panel_*"/"panel-*", sem qualquer marca de utilizador.
 * sessionStorage sobrevive a navegações e a signOut()+redirect na mesma aba, por isso, sem
 * esta limpeza, dados de uma conta (ex.: DNS da VisualDesign) ficam visíveis para a próxima
 * conta que fizer login na mesma aba (ex.: um cliente). Chamar sempre que uma sessão termina.
 */
export function clearAllPanelClientCaches(): void {
  if (typeof window === 'undefined') return;
  try {
    const keys = Object.keys(sessionStorage);
    for (const key of keys) {
      if (key.startsWith('vd_') || key.startsWith('panel_') || key.startsWith('panel-')) {
        sessionStorage.removeItem(key);
      }
    }
  } catch {
    /* sessionStorage indisponível */
  }
}
