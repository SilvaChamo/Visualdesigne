import { findCategory } from '@/lib/pricing-catalog';

/** Uma letra por marca — usada no número prático da encomenda (ex.: 252026D001). */
const BRAND_LETTERS: Record<string, string> = {
  visualdesign: 'D', // Design Gráfico
  web: 'W', // Web Design
  producoes: 'P', // Produção Audiovisual (vídeo)
  transporte: 'T',
  eventos: 'E',
  brindes: 'B',
};

const FALLBACK_LETTER = 'O';

function letterForCategoria(categoriaId: string): string {
  const brand = findCategory(categoriaId)?.brand;
  return (brand && BRAND_LETTERS[brand]) || FALLBACK_LETTER;
}

type NumeroRow = { id: string; batch_id: string; categoria_id: string; created_at: string };

/**
 * Número prático da encomenda: dia + ano da submissão + letra da categoria
 * (D=Design, W=Web Design, P=Produção de vídeo, ...) + sequência que cresce
 * por categoria (ex.: 252026D001). Calculado a partir de todas as encomendas
 * já submetidas, para o número nunca se repetir e crescer sempre.
 */
export function computeNumeroMap(rows: NumeroRow[]): Map<string, string> {
  const batches = new Map<string, NumeroRow[]>();
  for (const row of rows) {
    const list = batches.get(row.batch_id) ?? [];
    list.push(row);
    batches.set(row.batch_id, list);
  }

  type BatchInfo = { batchId: string; createdAt: string; letter: string };
  const infos: BatchInfo[] = [];
  for (const [batchId, items] of batches) {
    const sorted = [...items].sort((a, b) => a.id.localeCompare(b.id));
    const createdAt = items.reduce((min, i) => (i.created_at < min ? i.created_at : min), items[0].created_at);
    infos.push({ batchId, createdAt, letter: letterForCategoria(sorted[0].categoria_id) });
  }

  infos.sort((a, b) => {
    if (a.createdAt < b.createdAt) return -1;
    if (a.createdAt > b.createdAt) return 1;
    return a.batchId.localeCompare(b.batchId);
  });

  const counters: Record<string, number> = {};
  const result = new Map<string, string>();
  for (const info of infos) {
    counters[info.letter] = (counters[info.letter] ?? 0) + 1;
    const date = new Date(info.createdAt);
    const dd = String(date.getUTCDate()).padStart(2, '0');
    const yyyy = String(date.getUTCFullYear());
    const seq = String(counters[info.letter]).padStart(3, '0');
    result.set(info.batchId, `${dd}${yyyy}${info.letter}${seq}`);
  }
  return result;
}
