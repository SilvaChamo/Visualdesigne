'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
import { FileText, Trash2, Loader2 } from 'lucide-react';
import { formatMt } from '@/lib/pricing-catalog';
import { statusMeta } from '@/lib/quotation-status-labels';
import { groupIntoBatches, batchNumero, type BatchItem } from '@/lib/quotation-batch';
import { EncomendaDetalhe } from '@/components/quotations/EncomendaDetalhe';

type Quotation = BatchItem & {
  categoria_label: string;
  produto: string;
  quantidade: number;
};

export function EncomendasListSection() {
  const [quotations, setQuotations] = useState<Quotation[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [deletingBatchId, setDeletingBatchId] = useState<string | null>(null);

  const fetchQuotations = useCallback(async () => {
    try {
      const res = await fetch('/api/cotacoes');
      const data = await res.json();
      if (data.success) {
        setQuotations(data.quotations);
        setSelectedId((prev) => prev ?? (data.quotations[0]?.id ?? null));
      }
    } catch {
      /* silencioso */
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchQuotations();
  }, [fetchQuotations]);

  // Cada encomenda é um lote (batch_id) — pode ter vários serviços de
  // categorias diferentes, tal como foi submetida. Uma lista só, uma vez
  // cada encomenda — nunca repetida por categoria (isso confundia quando a
  // mesma encomenda tinha serviços mistos).
  const batches = useMemo(() => groupIntoBatches(quotations), [quotations]);

  const selectedBatch = batches.find((b) => b.items.some((i) => i.id === selectedId));

  const handleDeleteFromCard = async (e: React.MouseEvent, anchorId: string) => {
    e.stopPropagation();
    if (!window.confirm('Eliminar esta encomenda concluída? Esta ação não pode ser desfeita.')) return;
    const batch = batches.find((b) => b.items.some((i) => i.id === anchorId));
    setDeletingBatchId(batch?.batchId ?? anchorId);
    try {
      const res = await fetch(`/api/cotacoes/${anchorId}`, { method: 'DELETE' });
      const data = await res.json();
      if (res.ok && data.success) {
        const removedIds = new Set(batch?.items.map((i) => i.id) ?? [anchorId]);
        setQuotations((prev) => prev.filter((q) => !removedIds.has(q.id)));
        setSelectedId((prev) => (prev && removedIds.has(prev) ? null : prev));
      }
    } catch {
      /* silencioso — o botão dentro do painel de detalhe dá o erro completo */
    } finally {
      setDeletingBatchId(null);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[320px_1fr] gap-4 lg:gap-6 min-h-0 h-full">
      <div className="space-y-3 lg:overflow-y-auto">
        {loading && (
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg p-5 text-sm text-gray-500 dark:text-zinc-400">
            A carregar...
          </div>
        )}

        {!loading && quotations.length === 0 && (
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg p-5 text-sm text-gray-500 dark:text-zinc-400">
            Ainda não tem encomendas submetidas.
          </div>
        )}

        {batches.map((batch) => {
          const meta = statusMeta(batch.status, batch.sobConsulta);
          const isSelected = batch.items.some((i) => i.id === selectedId);
          const anchor = batch.primaryItem;
          const resumo =
            batch.items.length === 1
              ? `${anchor.categoria_label} — ${anchor.produto}`
              : `${batch.items.length} serviços`;
          return (
            <button
              key={batch.batchId}
              type="button"
              onClick={() => setSelectedId(anchor.id)}
              className={`w-full text-left flex items-start gap-3 p-4 rounded-lg border transition-all ${
                isSelected
                  ? 'border-red-400 bg-red-50/50 dark:bg-red-950/10 dark:border-red-900/50'
                  : 'border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 hover:border-red-300 dark:hover:border-red-500'
              }`}
            >
              <div className="w-9 h-9 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900/30 rounded-lg flex items-center justify-center flex-shrink-0">
                <FileText className="w-4 h-4 text-red-600 dark:text-red-500" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="font-bold text-sm text-gray-900 dark:text-white truncate">Encomenda Nº {batchNumero(batch.batchId)}</p>
                <p className="text-xs text-gray-500 dark:text-zinc-400 mt-0.5 truncate">{resumo}</p>
                <p className="text-xs text-gray-500 dark:text-zinc-400 mt-0.5">
                  {batch.sobConsulta ? 'Sob Consulta' : `${formatMt(batch.totalMt)} MT`}
                </p>
                <span className={`inline-block mt-2 px-2 py-0.5 rounded-md text-[10px] font-bold border ${meta.color}`}>
                  {meta.label}
                </span>
              </div>
              {batch.status === 'done' && (
                <button
                  type="button"
                  onClick={(e) => handleDeleteFromCard(e, anchor.id)}
                  disabled={deletingBatchId === batch.batchId}
                  className="shrink-0 text-gray-300 hover:text-red-600 dark:text-zinc-600 dark:hover:text-red-500 transition-colors p-1"
                  title="Eliminar encomenda"
                >
                  {deletingBatchId === batch.batchId ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                </button>
              )}
            </button>
          );
        })}
      </div>

      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg overflow-hidden min-h-[500px]">
        {selectedBatch ? (
          <EncomendaDetalhe
            quotationId={selectedBatch.primaryItem.id}
            onChanged={fetchQuotations}
            onDeleted={() => setSelectedId(null)}
          />
        ) : (
          !loading && (
            <div className="flex items-center justify-center h-full min-h-[500px] text-sm text-gray-400 dark:text-zinc-500">
              Seleccione uma encomenda para ver os detalhes.
            </div>
          )
        )}
      </div>
    </div>
  );
}
