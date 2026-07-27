import { BRANDS, findCategory } from '@/lib/pricing-catalog';
import { computeBatchStatus, statusBucket, type StatusBucket } from '@/lib/quotation-status-labels';

export type BatchItem = {
  id: string;
  batch_id: string;
  categoria_id: string;
  total_mt: number;
  sob_consulta: boolean;
  status: string;
  created_at: string;
};

export type QuotationBatch<T extends BatchItem = BatchItem> = {
  batchId: string;
  items: T[];
  /** Soma dos itens com preço fixo — itens sob consulta não entram no total. */
  totalMt: number;
  /** true só quando TODOS os itens são sob consulta (sem nenhum total fixo). */
  sobConsulta: boolean;
  /** true quando PELO MENOS UM item é sob consulta (total misto). */
  hasSobConsultaItem: boolean;
  status: string;
  createdAt: string;
  primaryItem: T;
};

/** Agrupa linhas de quotation_requests por batch_id — cada grupo é "uma encomenda". */
export function groupIntoBatches<T extends BatchItem>(rows: T[]): QuotationBatch<T>[] {
  const byBatch = new Map<string, T[]>();
  for (const row of rows) {
    const list = byBatch.get(row.batch_id) ?? [];
    list.push(row);
    byBatch.set(row.batch_id, list);
  }

  const batches: QuotationBatch<T>[] = [];
  for (const [batchId, items] of byBatch) {
    const sorted = [...items].sort((a, b) => a.id.localeCompare(b.id));
    const totalMt = items.reduce((sum, i) => sum + (i.sob_consulta ? 0 : i.total_mt), 0);
    const createdAt = items.reduce((min, i) => (i.created_at < min ? i.created_at : min), items[0].created_at);
    batches.push({
      batchId,
      items: sorted,
      totalMt,
      sobConsulta: items.every((i) => i.sob_consulta),
      hasSobConsultaItem: items.some((i) => i.sob_consulta),
      status: computeBatchStatus(items),
      createdAt,
      primaryItem: sorted[0],
    });
  }

  return batches.sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
}

const OUTROS_LABEL = 'Outros';

/**
 * Agrupa encomendas por categoria de serviço (marca). Uma encomenda mista
 * (ex.: cartões + webdesign) aparece em todas as secções relevantes — nunca
 * é dividida, só pode repetir-se em mais que um grupo.
 */
export function groupBatchesByBrand<T extends BatchItem>(
  batches: QuotationBatch<T>[],
): { label: string; batches: QuotationBatch<T>[] }[] {
  const byBrand = new Map<string, QuotationBatch<T>[]>();
  for (const batch of batches) {
    const labels = new Set<string>();
    for (const item of batch.items) {
      const brandId = findCategory(item.categoria_id)?.brand;
      const label = brandId ? BRANDS.find((b) => b.id === brandId)?.label ?? OUTROS_LABEL : OUTROS_LABEL;
      labels.add(label);
    }
    for (const label of labels) {
      const list = byBrand.get(label) ?? [];
      list.push(batch);
      byBrand.set(label, list);
    }
  }

  const order = [...BRANDS.map((b) => b.label), OUTROS_LABEL];
  return order
    .map((label) => ({ label, batches: byBrand.get(label) ?? [] }))
    .filter((g) => g.batches.length > 0);
}

/** Número da encomenda/fatura — igual ao "Cotação Nº" mostrado no documento. */
export function batchNumero(batchId: string): string {
  return batchId.split('-')[0].toUpperCase();
}

/** Filtra encomendas pelo atalho de estado do menu admin (Pendentes/Em produção/Concluídas/Entregues/Canceladas). */
export function filterBatchesByBucket<T extends BatchItem>(
  batches: QuotationBatch<T>[],
  bucket: StatusBucket,
): QuotationBatch<T>[] {
  return batches.filter((b) => statusBucket(b.status) === bucket);
}
