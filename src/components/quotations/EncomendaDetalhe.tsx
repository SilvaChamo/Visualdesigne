'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { Download, XCircle, Pencil, CreditCard, AlertCircle, Loader2, Trash2 } from 'lucide-react';
import { supabase } from '@/lib/supabase-client';
import { Spinner } from '@/components/ui/spinner';
import { formatMt } from '@/lib/pricing-catalog';
import { statusMeta, computeBatchStatus } from '@/lib/quotation-status-labels';
import { batchNumero } from '@/lib/quotation-batch';
import { panelTabBar, panelTabBtn, panelTabBtnActive, panelTabBtnInactive, panelBtnPrimary, panelBtnSecondary } from '@/lib/panel-ui';
import { QuotationHistoryTimeline } from '@/components/quotations/QuotationHistoryTimeline';
import { QuotationAttachmentsList } from '@/components/quotations/QuotationAttachmentsList';
import { EncomendaEditForm } from '@/components/quotations/EncomendaEditForm';

type QuotationRow = {
  id: string;
  batch_id: string;
  empresa: string;
  categoria_id: string;
  categoria_label: string;
  produto: string;
  preco_unitario_mt: number;
  quantidade: number;
  data_limite_entrega: string;
  total_mt: number;
  sob_consulta: boolean;
  status: string;
  notas: string | null;
  cancellation_reason: string | null;
  rejection_reason: string | null;
  created_at: string;
};

type Tab = 'detalhes' | 'historico' | 'anexos' | 'cotacao';

const TABS: { id: Tab; label: string }[] = [
  { id: 'detalhes', label: 'Detalhes da Encomenda' },
  { id: 'historico', label: 'Histórico' },
  { id: 'anexos', label: 'Anexos' },
  { id: 'cotacao', label: 'Cotação' },
];

export function EncomendaDetalhe({
  quotationId,
  onChanged,
  onDeleted,
}: {
  quotationId: string;
  onChanged: () => void;
  onDeleted?: () => void;
}) {
  const [items, setItems] = useState<QuotationRow[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<Tab>('detalhes');
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [cancelling, setCancelling] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [actionError, setActionError] = useState('');
  const iframeRef = useRef<HTMLIFrameElement>(null);

  const fetchQuotation = useCallback(async () => {
    setLoading(true);
    const { data: row } = await supabase.from('quotation_requests').select('*').eq('id', quotationId).single();
    if (!row) {
      setItems(null);
      setLoading(false);
      return;
    }
    const { data: siblings } = await supabase
      .from('quotation_requests')
      .select('*')
      .eq('batch_id', row.batch_id)
      .order('created_at', { ascending: true });
    setItems((siblings && siblings.length > 0 ? siblings : [row]) as QuotationRow[]);
    setLoading(false);
  }, [quotationId]);

  useEffect(() => {
    setTab('detalhes');
    setEditingItemId(null);
    setActionError('');
    fetchQuotation();
  }, [quotationId, fetchQuotation]);

  const handleCancelar = async () => {
    if (!window.confirm('Tem a certeza que quer cancelar esta encomenda?')) return;
    const motivo = window.prompt('Motivo do cancelamento (opcional):', '') || '';
    setCancelling(true);
    setActionError('');
    try {
      const res = await fetch(`/api/cotacoes/${quotationId}/cancelar`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ motivo }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || 'Não foi possível cancelar a encomenda.');
      await fetchQuotation();
      onChanged();
    } catch (err: any) {
      setActionError(err.message || 'Falha ao comunicar com o servidor.');
    } finally {
      setCancelling(false);
    }
  };

  const handleEliminar = async () => {
    if (!window.confirm('Eliminar esta encomenda concluída? Esta ação não pode ser desfeita.')) return;
    setDeleting(true);
    setActionError('');
    try {
      const res = await fetch(`/api/cotacoes/${quotationId}`, { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || 'Não foi possível eliminar a encomenda.');
      onChanged();
      onDeleted?.();
    } catch (err: any) {
      setActionError(err.message || 'Falha ao comunicar com o servidor.');
      setDeleting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full min-h-[400px]">
        <Spinner className="w-6 h-6" />
      </div>
    );
  }

  if (!items || items.length === 0) {
    return (
      <div className="flex items-center justify-center h-full min-h-[400px] text-sm text-gray-400 dark:text-zinc-500">
        Não foi possível carregar esta encomenda.
      </div>
    );
  }

  const primary = items[0];
  const status = computeBatchStatus(items);
  const totalMt = items.reduce((sum, i) => sum + (i.sob_consulta ? 0 : i.total_mt), 0);
  const allSobConsulta = items.every((i) => i.sob_consulta);
  const meta = statusMeta(status, allSobConsulta);
  const rejectionReason = items.find((i) => i.rejection_reason)?.rejection_reason;
  const cancellationReason = items.find((i) => i.cancellation_reason)?.cancellation_reason;

  const canEditOrCancel = status === 'pending';
  const canCancelOnly = status === 'payment_selected';
  const canPay = status === 'pending' && !allSobConsulta;
  const canPayRemainder = status === 'delivered';
  const canDelete = status === 'done';

  return (
    <div className="flex flex-col h-full">
      <div className="p-4 border-b border-gray-100 dark:border-zinc-800">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h3 className="font-bold text-gray-900 dark:text-white">Encomenda Nº {batchNumero(primary.batch_id)}</h3>
            <p className="text-sm text-gray-500 dark:text-zinc-400 mt-0.5">
              {allSobConsulta ? 'Sob Consulta' : `${formatMt(totalMt)} MT`}
            </p>
          </div>

          {/* Quando há uma ação disponível (pagar/cancelar), mostra os
              botões aqui em vez do badge passivo — o badge só aparece
              quando não há nada para o cliente fazer agora. */}
          {canPay || canPayRemainder || canEditOrCancel || canCancelOnly ? (
            <div className="flex flex-wrap items-center gap-2 shrink-0">
              {canPay && (
                <a href={`/cotacao/${primary.id}/pagamento`} className={panelBtnPrimary}>
                  <CreditCard className="w-4 h-4" /> Continuar para Pagamento
                </a>
              )}
              {canPayRemainder && (
                <a href={`/cotacao/${primary.id}/pagamento`} className={panelBtnPrimary}>
                  <CreditCard className="w-4 h-4" /> Pagar Remanescente
                </a>
              )}
              {(canEditOrCancel || canCancelOnly) && (
                <button type="button" className={panelBtnSecondary} onClick={handleCancelar} disabled={cancelling}>
                  {cancelling ? <Spinner className="w-4 h-4" /> : <XCircle className="w-4 h-4" />}
                  Cancelar
                </button>
              )}
            </div>
          ) : (
            <span className={`px-2.5 py-1 rounded-full text-xs font-bold border shrink-0 ${meta.color}`}>{meta.label}</span>
          )}
        </div>

        {rejectionReason && (
          <p className="text-sm text-rose-600 dark:text-rose-400 mt-2">Motivo da rejeição: {rejectionReason}</p>
        )}
        {cancellationReason && (
          <p className="text-sm text-gray-500 dark:text-zinc-400 mt-2">Motivo do cancelamento: {cancellationReason}</p>
        )}

        {actionError && (
          <div className="flex items-start gap-2 mt-3 p-2.5 rounded-lg bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900/50 text-xs text-red-800 dark:text-red-300">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <p>{actionError}</p>
          </div>
        )}

        {canDelete && (
          <div className="mt-3">
            <button type="button" className={panelBtnSecondary} onClick={handleEliminar} disabled={deleting}>
              {deleting ? <Spinner className="w-4 h-4" /> : <Trash2 className="w-4 h-4" />}
              Eliminar
            </button>
          </div>
        )}
      </div>

      <div className={`${panelTabBar} px-4 pt-3`}>
        <div className="flex items-end justify-between gap-3">
          <div className="flex gap-5">
            {TABS.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => setTab(t.id)}
                className={`${panelTabBtn} ${tab === t.id ? panelTabBtnActive : panelTabBtnInactive}`}
              >
                {t.label}
              </button>
            ))}
          </div>
          {tab === 'cotacao' && (
            <button
              type="button"
              onClick={() => iframeRef.current?.contentWindow?.print()}
              className={`${panelBtnSecondary} shrink-0`}
            >
              <Download className="w-4 h-4" /> Baixar PDF
            </button>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {tab === 'detalhes' && (
          <div className="p-4 space-y-2">
            {items.map((item) => {
              const isEditing = editingItemId === item.id;
              return (
                <div key={item.id} className="rounded-lg border border-gray-200 dark:border-zinc-800 p-3">
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-bold text-sm text-gray-900 dark:text-white truncate">{item.categoria_label}</p>
                      <p className="text-xs text-gray-500 dark:text-zinc-400 truncate">
                        {item.produto} · Qtd: {item.quantidade} · {item.sob_consulta ? 'Sob Consulta' : `${formatMt(item.total_mt)} MT`}
                      </p>
                    </div>
                    {item.status === 'pending' && !isEditing && (
                      <button
                        type="button"
                        className={`${panelBtnSecondary} shrink-0`}
                        onClick={() => setEditingItemId(item.id)}
                      >
                        <Pencil className="w-4 h-4" /> Editar
                      </button>
                    )}
                  </div>

                  {isEditing && (
                    <div className="mt-3">
                      <EncomendaEditForm
                        quotation={item}
                        onCancel={() => setEditingItemId(null)}
                        onSaved={async () => {
                          setEditingItemId(null);
                          await fetchQuotation();
                          onChanged();
                        }}
                      />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
        {tab === 'cotacao' && (
          <iframe
            key={primary.id}
            ref={iframeRef}
            src={`/cotacao/${primary.id}?embed=1`}
            className="w-full h-full min-h-[600px] border-0"
            title="Cotação"
          />
        )}
        {tab === 'historico' && <div className="p-4"><QuotationHistoryTimeline quotationId={primary.id} /></div>}
        {tab === 'anexos' && <div className="p-4"><QuotationAttachmentsList quotationId={primary.id} viewerRole="client" /></div>}
      </div>
    </div>
  );
}
