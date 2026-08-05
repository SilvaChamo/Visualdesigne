'use client';

import { useState } from 'react';
import { ChevronDown, ChevronRight, Building2, Phone, MapPin, Paperclip, Check, X as XIcon } from 'lucide-react';
import { panelSectionCard } from '@/lib/panel-ui';
import { formatMt } from '@/lib/pricing-catalog';
import { ImageLightbox } from './ImageLightbox';

export type PedidoCliente = {
  nome?: string | null;
  email?: string | null;
  telefone?: string | null;
  empresa?: string | null;
  morada?: string | null;
  cidade?: string | null;
};

export type PedidoStatusMeta = { label: string; className: string };

/**
 * Linha colapsável genérica para um pedido de pagamento pendente de
 * confirmação (crédito, renovação, ou compra de domínio/hospedagem/e-mail).
 * Expandida: dados do cliente à esquerda, comprovativo à direita — clicar
 * no comprovativo abre a imagem em popup, com Confirmar/Rejeitar também lá
 * dentro. Os mesmos botões ficam sempre visíveis na própria linha também.
 */
export function PedidoAccordionRow({
  dataCreated,
  cliente,
  resumo,
  valorMt,
  metodoLabel,
  status,
  comprovativoUrl,
  rejectionReason,
  canAct,
  updating,
  onConfirm,
  onReject,
}: {
  dataCreated: string;
  cliente: PedidoCliente;
  resumo: string;
  valorMt: number;
  metodoLabel: string;
  status: PedidoStatusMeta;
  comprovativoUrl: string | null;
  rejectionReason?: string | null;
  canAct: boolean;
  updating: boolean;
  onConfirm: () => void;
  onReject: () => void;
}) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [lightboxOpen, setLightboxOpen] = useState(false);

  const actionButtons = (
    <>
      <button
        type="button"
        disabled={updating}
        onClick={onConfirm}
        className="inline-flex items-center gap-1.5 rounded-lg bg-green-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-green-700 disabled:opacity-50"
      >
        <Check className="w-3.5 h-3.5" /> Confirmar
      </button>
      <button
        type="button"
        disabled={updating}
        onClick={onReject}
        className="inline-flex items-center gap-1.5 rounded-lg bg-rose-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-rose-700 disabled:opacity-50"
      >
        <XIcon className="w-3.5 h-3.5" /> Rejeitar
      </button>
    </>
  );

  return (
    <div className={panelSectionCard}>
      <div
        role="button"
        tabIndex={0}
        onClick={() => setIsExpanded((v) => !v)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            setIsExpanded((v) => !v);
          }
        }}
        className="w-full flex items-center gap-3 p-4 text-left cursor-pointer"
      >
        <span className="shrink-0 text-gray-400 dark:text-zinc-500">
          {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
        </span>
        <div className="min-w-0 flex-1 grid grid-cols-1 gap-1 md:grid-cols-[1fr_auto_auto_auto] md:items-center md:gap-4">
          <div className="min-w-0">
            <p className="truncate font-bold text-gray-900 dark:text-white">{cliente.nome || cliente.empresa || cliente.email || 'Cliente'}</p>
            <p className="truncate text-xs text-gray-500 dark:text-zinc-400">{resumo}</p>
          </div>
          <span className="whitespace-nowrap text-xs text-gray-400 dark:text-zinc-500">{new Date(dataCreated).toLocaleDateString('pt-PT')}</span>
          <span className="whitespace-nowrap text-sm font-bold tabular-nums text-gray-900 dark:text-white">{formatMt(valorMt)} MT</span>
          <span className={`w-fit shrink-0 rounded-full px-2.5 py-1 text-xs font-bold whitespace-nowrap ${status.className}`}>{status.label}</span>
        </div>
      </div>

      {isExpanded && (
        <div className="border-t border-gray-100 dark:border-zinc-800 p-4 grid grid-cols-1 gap-4 md:grid-cols-2" onClick={(e) => e.stopPropagation()}>
          <div className="space-y-1.5 text-sm">
            <p className="text-xs font-bold uppercase text-gray-400 dark:text-zinc-500 mb-1.5">Dados do cliente</p>
            {cliente.empresa && (
              <p className="flex items-center gap-1.5 text-gray-700 dark:text-zinc-300">
                <Building2 className="w-3.5 h-3.5 shrink-0 text-gray-400" /> {cliente.empresa}
              </p>
            )}
            {cliente.telefone && (
              <p className="flex items-center gap-1.5 text-gray-500 dark:text-zinc-400">
                <Phone className="w-3.5 h-3.5 shrink-0 text-gray-400" /> {cliente.telefone}
              </p>
            )}
            {(cliente.morada || cliente.cidade) && (
              <p className="flex items-center gap-1.5 text-gray-500 dark:text-zinc-400">
                <MapPin className="w-3.5 h-3.5 shrink-0 text-gray-400" /> {[cliente.morada, cliente.cidade].filter(Boolean).join(', ')}
              </p>
            )}
            {cliente.email && <p className="text-gray-500 dark:text-zinc-400">{cliente.email}</p>}
            <p className="text-gray-500 dark:text-zinc-400">Método: {metodoLabel}</p>
            {rejectionReason && <p className="text-rose-600 dark:text-rose-400">Motivo da rejeição: {rejectionReason}</p>}
          </div>

          <div className="space-y-2">
            <p className="text-xs font-bold uppercase text-gray-400 dark:text-zinc-500 mb-1.5">Comprovativo</p>
            {comprovativoUrl ? (
              <button
                type="button"
                onClick={() => setLightboxOpen(true)}
                className="flex items-center gap-2 rounded-lg border border-gray-200 dark:border-zinc-800 p-3 hover:border-red-300 dark:hover:border-red-800 transition-colors w-full text-left"
              >
                <Paperclip className="w-4 h-4 shrink-0 text-gray-400" />
                <span className="text-sm font-medium text-gray-700 dark:text-zinc-300">Ver comprovativo</span>
              </button>
            ) : (
              <p className="text-sm text-gray-400 dark:text-zinc-500">Sem comprovativo enviado.</p>
            )}

            {canAct && <div className="flex items-center gap-2 pt-2">{actionButtons}</div>}
          </div>
        </div>
      )}

      {lightboxOpen && comprovativoUrl && (
        <ImageLightbox
          url={comprovativoUrl}
          onClose={() => setLightboxOpen(false)}
          actions={canAct ? actionButtons : undefined}
        />
      )}
    </div>
  );
}
