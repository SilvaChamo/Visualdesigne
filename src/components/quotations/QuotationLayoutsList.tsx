'use client';

import { useEffect, useRef, useState } from 'react';
import { Layers, Download, Loader2, Paperclip, Send, Check, X } from 'lucide-react';
import { panelBtnPrimary, panelBtnSecondary, panelField } from '@/lib/panel-ui';
import { Spinner } from '@/components/ui/spinner';

type Layout = {
  id: string;
  fase: number;
  descricao: string;
  file_name: string;
  file_url: string;
  file_size_bytes: number | null;
  status: 'pending' | 'approved' | 'rejected';
  client_feedback: string | null;
  created_at: string;
};

const LAYOUT_STATUS_LABELS: Record<Layout['status'], { label: string; color: string }> = {
  pending: { label: 'Aguarda a sua aprovação', color: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/30 dark:text-amber-400 dark:border-amber-900/30' },
  approved: { label: 'Aprovado', color: 'bg-teal-50 text-teal-700 border-teal-200 dark:bg-teal-950/30 dark:text-teal-400 dark:border-teal-900/30' },
  rejected: { label: 'Rejeitado — a corrigir', color: 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/30 dark:text-rose-400 dark:border-rose-900/30' },
};

function formatBytes(bytes: number | null): string {
  if (!bytes) return '';
  const units = ['B', 'KB', 'MB'];
  let v = bytes;
  let i = 0;
  while (v >= 1024 && i < units.length - 1) {
    v /= 1024;
    i += 1;
  }
  return `${v < 10 && i > 0 ? v.toFixed(1) : Math.round(v)} ${units[i]}`;
}

export function QuotationLayoutsList({
  quotationId,
  viewerRole,
}: {
  quotationId: string;
  viewerRole: 'client' | 'admin';
}) {
  const [layouts, setLayouts] = useState<Layout[]>([]);
  const [loading, setLoading] = useState(true);
  const [descricao, setDescricao] = useState('');
  const [mensagem, setMensagem] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Decisão do cliente (aprovar/rejeitar) por fase — rejectingId marca qual
  // layout tem a caixa de comentário aberta; deciding evita duplo-clique.
  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [rejectFeedback, setRejectFeedback] = useState('');
  const [decidingId, setDecidingId] = useState<string | null>(null);
  const [decisionError, setDecisionError] = useState('');

  const fetchLayouts = () => {
    setLoading(true);
    fetch(`/api/cotacoes/${quotationId}/layouts`)
      .then((r) => r.json())
      .then((data) => {
        if (data.success) setLayouts(data.layouts);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchLayouts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [quotationId]);

  const handleEnviar = async () => {
    if (!file || !descricao.trim() || uploading) return;
    setUploading(true);
    setError('');
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('descricao', descricao.trim());
      if (mensagem.trim()) formData.append('mensagem', mensagem.trim());
      const res = await fetch(`/api/cotacoes/${quotationId}/layouts`, { method: 'POST', body: formData });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || 'Falha no envio.');
      setLayouts((prev) => [...prev, data.layout]);
      setDescricao('');
      setMensagem('');
      setFile(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
    } catch (err: any) {
      setError(err.message || 'Não foi possível enviar o layout.');
    } finally {
      setUploading(false);
    }
  };

  const handleDecision = async (layoutId: string, status: 'approved' | 'rejected', feedback?: string) => {
    if (decidingId) return;
    if (status === 'rejected' && !feedback?.trim()) {
      setDecisionError('Descreva o que precisa de ser corrigido.');
      return;
    }
    setDecidingId(layoutId);
    setDecisionError('');
    try {
      const res = await fetch(`/api/cotacoes/${quotationId}/layouts/${layoutId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status, feedback: feedback?.trim() }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || 'Não foi possível registar a sua decisão.');
      setLayouts((prev) => prev.map((l) => (l.id === layoutId ? data.layout : l)));
      setRejectingId(null);
      setRejectFeedback('');
    } catch (err: any) {
      setDecisionError(err.message || 'Não foi possível registar a sua decisão.');
    } finally {
      setDecidingId(null);
    }
  };

  const listBlock = (
    <>
      {loading ? (
        <p className="text-sm text-gray-400 dark:text-zinc-500">A carregar layouts...</p>
      ) : layouts.length === 0 ? (
        <p className="text-sm text-gray-400 dark:text-zinc-500">Ainda sem layouts enviados.</p>
      ) : (
        <ol>
          {layouts.map((l, index) => (
            <li key={l.id} className="flex gap-3">
              <div className="flex flex-col items-center pt-1">
                <span className="w-7 h-7 rounded-full bg-red-600 text-white text-xs font-bold flex items-center justify-center shrink-0">
                  {l.fase}
                </span>
                {index < layouts.length - 1 && <span className="w-px flex-1 bg-gray-200 dark:bg-zinc-700 my-1" />}
              </div>
              <div className="flex-1 min-w-0 pb-4">
                <div className="flex items-center justify-between gap-3 p-3 bg-white dark:bg-zinc-900 border border-gray-100 dark:border-zinc-800 rounded-lg">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-8 h-8 rounded bg-slate-100 dark:bg-zinc-800 flex items-center justify-center shrink-0">
                      <Layers className="w-4 h-4 text-red-500" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-bold uppercase text-gray-400 dark:text-zinc-500">Fase {l.fase}</p>
                      <p className="text-sm font-bold text-gray-900 dark:text-white truncate">{l.descricao}</p>
                      <p className="text-xs text-gray-400 dark:text-zinc-500 truncate">
                        {l.file_name}
                        {l.file_size_bytes ? ` · ${formatBytes(l.file_size_bytes)}` : ''}
                      </p>
                    </div>
                  </div>
                  <a
                    href={l.file_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="shrink-0 text-gray-400 hover:text-red-600 dark:text-zinc-500 dark:hover:text-red-500 transition-colors p-1"
                    title="Descarregar"
                  >
                    <Download className="w-4 h-4" />
                  </a>
                </div>

                <div className="mt-2 flex items-center gap-2">
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${LAYOUT_STATUS_LABELS[l.status].color}`}>
                    {LAYOUT_STATUS_LABELS[l.status].label}
                  </span>
                </div>

                {l.status === 'rejected' && l.client_feedback && (
                  <p className="mt-2 text-xs text-rose-700 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-900/30 rounded-md p-2">
                    <span className="font-bold">Correcções pedidas:</span> {l.client_feedback}
                  </p>
                )}

                {viewerRole === 'client' && l.status === 'pending' && (
                  <div className="mt-2 space-y-2">
                    {rejectingId === l.id ? (
                      <div className="space-y-2">
                        <textarea
                          value={rejectFeedback}
                          onChange={(e) => setRejectFeedback(e.target.value)}
                          placeholder="Descreva o que precisa de ser corrigido neste layout..."
                          rows={2}
                          className={`${panelField} w-full h-auto py-2`}
                          disabled={decidingId === l.id}
                        />
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            className={panelBtnSecondary}
                            onClick={() => { setRejectingId(null); setRejectFeedback(''); setDecisionError(''); }}
                            disabled={decidingId === l.id}
                          >
                            Cancelar
                          </button>
                          <button
                            type="button"
                            className="inline-flex items-center gap-2 bg-rose-600 hover:bg-rose-700 text-white font-bold px-4 py-2 rounded-md text-sm transition-colors disabled:opacity-60"
                            onClick={() => handleDecision(l.id, 'rejected', rejectFeedback)}
                            disabled={decidingId === l.id || !rejectFeedback.trim()}
                          >
                            {decidingId === l.id ? <Spinner className="w-4 h-4" /> : <X className="w-4 h-4" />}
                            Confirmar rejeição
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          className="inline-flex items-center gap-2 bg-teal-600 hover:bg-teal-700 text-white font-bold px-4 py-2 rounded-md text-sm transition-colors disabled:opacity-60"
                          onClick={() => handleDecision(l.id, 'approved')}
                          disabled={decidingId === l.id}
                        >
                          {decidingId === l.id ? <Spinner className="w-4 h-4" /> : <Check className="w-4 h-4" />}
                          Aprovar
                        </button>
                        <button
                          type="button"
                          className={panelBtnSecondary}
                          onClick={() => { setRejectingId(l.id); setDecisionError(''); }}
                          disabled={decidingId === l.id}
                        >
                          <X className="w-4 h-4" />
                          Rejeitar
                        </button>
                      </div>
                    )}
                    {decisionError && rejectingId === l.id && (
                      <p className="text-xs text-rose-600 dark:text-rose-400">{decisionError}</p>
                    )}
                  </div>
                )}
              </div>
            </li>
          ))}
        </ol>
      )}
    </>
  );

  if (viewerRole !== 'admin') {
    return <div className="space-y-3">{listBlock}</div>;
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 lg:items-stretch">
      <div className="lg:h-full overflow-y-auto rounded-lg border border-gray-200 dark:border-zinc-800 p-3 space-y-3">
        {listBlock}
      </div>

      <div className="lg:h-full flex flex-col gap-2 rounded-lg border border-gray-200 dark:border-zinc-800 p-3 bg-gray-50/50 dark:bg-zinc-900/50">
        <p className="text-xs font-bold uppercase text-gray-500 dark:text-zinc-400">Enviar layout para aprovação</p>

        <input
          type="text"
          value={descricao}
          onChange={(e) => setDescricao(e.target.value)}
          placeholder="Descrição da fase (ex: Rascunho inicial)"
          className={`${panelField} w-full`}
          disabled={uploading}
        />

        <input
          type="file"
          ref={fileInputRef}
          onChange={(e) => setFile(e.target.files?.[0] || null)}
          className="hidden"
          disabled={uploading}
        />

        <div className="flex-1 flex items-stretch gap-2 min-h-[7rem]">
          <button
            type="button"
            title={file ? file.name : 'Anexar ficheiro'}
            className="shrink-0 w-11 flex flex-col items-center justify-center gap-1 rounded border border-gray-300 bg-white text-gray-500 hover:bg-gray-100 hover:text-red-600 transition-colors disabled:opacity-50 dark:border-zinc-700 dark:bg-transparent dark:text-zinc-400 dark:hover:text-red-400"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
          >
            <Paperclip className="w-4 h-4" />
          </button>
          <textarea
            value={mensagem}
            onChange={(e) => setMensagem(e.target.value)}
            placeholder="Mensagem para o cliente (opcional) — aparece na conversa desta encomenda"
            className={`${panelField} flex-1 h-full py-2 resize-none`}
            disabled={uploading}
          />
        </div>

        <div className="flex items-center justify-between gap-2">
          <span className="text-xs text-gray-500 dark:text-zinc-400 truncate">
            {file ? file.name : 'Nenhum ficheiro seleccionado'}
          </span>
          <button
            type="button"
            className={panelBtnPrimary}
            onClick={handleEnviar}
            disabled={uploading || !file || !descricao.trim()}
          >
            {uploading ? <Spinner className="w-4 h-4" /> : <Send className="w-4 h-4" />}
            Enviar
          </button>
        </div>

        {error && <p className="text-xs text-red-600 dark:text-red-400">{error}</p>}
      </div>
    </div>
  );
}
