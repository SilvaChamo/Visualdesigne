'use client';

import { X } from 'lucide-react';
import type { ReactNode } from 'react';

/**
 * Popup de imagem em ecrã inteiro — mesmo padrão já usado em
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
      <img
        src={url}
        alt="Comprovativo"
        className="max-w-full max-h-[80vh] rounded-lg object-contain"
        onClick={(e) => e.stopPropagation()}
      />
      {actions && (
        <div className="flex items-center gap-3" onClick={(e) => e.stopPropagation()}>
          {actions}
        </div>
      )}
    </div>
  );
}
