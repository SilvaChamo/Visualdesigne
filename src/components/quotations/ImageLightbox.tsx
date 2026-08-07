'use client';

import { Download, ExternalLink, X } from 'lucide-react';
import type { ReactNode } from 'react';
import { PdfThumbnail } from './PdfThumbnail';

/** #28: URLs assinadas trazem query string (token) depois do nome do ficheiro. */
export function isPdfUrl(url: string): boolean {
  return url.split('?')[0].toLowerCase().endsWith('.pdf');
}

/**
 * Popup de imagem/PDF em ecrã inteiro — mesmo padrão já usado em
 * QuotationMessagesThread.tsx, aqui partilhado para reutilizar noutros sítios
 * (ex: comprovativos de pagamento na Contabilidade). `actions` (opcional)
 * aparece por baixo da imagem — usado para os botões Confirmar/Rejeitar,
 * para poder decidir sem fechar o popup.
 */
export function ImageLightbox({
  url,
  onClose,
  actions,
}: {
  url: string;
  onClose: () => void;
  actions?: ReactNode;
}) {
  const isPdf = isPdfUrl(url);
  return (
    <div
      className="fixed inset-0 z-[200] bg-black/80 flex flex-col items-center justify-center gap-4 p-4"
      onClick={onClose}
    >
      <button
        type="button"
        className="absolute top-4 right-4 text-white/80 hover:text-white"
        onClick={onClose}
      >
        <X className="w-7 h-7" />
      </button>
      {isPdf ? (
        <div
          className="max-h-[80vh] w-full max-w-2xl overflow-y-auto rounded-lg bg-white p-2"
          onClick={(e) => e.stopPropagation()}
        >
          <PdfThumbnail url={url} targetWidth={600} className="mx-auto" />
        </div>
      ) : (
        <img
          src={url}
          alt="Comprovativo"
          className="max-w-full max-h-[80vh] rounded-lg object-contain"
          onClick={(e) => e.stopPropagation()}
        />
      )}
      {isPdf && (
        <div className="flex items-center gap-4 text-sm" onClick={(e) => e.stopPropagation()}>
          <a href={url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 text-white/80 hover:text-white">
            <ExternalLink className="w-4 h-4" /> Abrir noutro separador
          </a>
          <a href={url} download className="flex items-center gap-1.5 text-white/80 hover:text-white">
            <Download className="w-4 h-4" /> Descarregar
          </a>
        </div>
      )}
      {actions && (
        <div className="flex items-center gap-3" onClick={(e) => e.stopPropagation()}>
          {actions}
        </div>
      )}
    </div>
  );
}
