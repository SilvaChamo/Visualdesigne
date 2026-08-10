/**
 * Cache genérica em sessionStorage para listas do painel — evita mostrar
 * spinner de carregamento sempre que se reabre uma secção já visitada nesta
 * sessão do browser: mostra logo os dados guardados e o load() normal
 * actualiza por trás.
 */
export function readListCache<T>(key: string): T | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = sessionStorage.getItem(key);
    if (!raw) return null;
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

export function writeListCache<T>(key: string, data: T): void {
  if (typeof window === 'undefined') return;
  try {
    sessionStorage.setItem(key, JSON.stringify(data));
  } catch {
    /* quota */
  }
}
