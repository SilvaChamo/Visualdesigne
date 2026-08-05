'use client';

import { useEffect, useState } from 'react';
import { Paperclip, Download } from 'lucide-react';
import { Spinner } from '@/components/ui/spinner';

type Anexo = {
  id: string;
  uploaded_by_role: 'client' | 'admin';
  file_name: string;
  file_url: string;
  file_size_bytes: number | null;
  created_at: string;
};

function formatSize(bytes: number | null): string {
  if (!bytes) return '';
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/**
 * Anexos (comprovativos de pagamento, sobretudo) de uma encomenda — mesmos
 * dados que já apareciam misturados na aba "Mensagem", aqui isolados numa
 * lista dedicada para a equipa nunca perder um comprovativo por estar
 * enterrado numa conversa longa.
 */
export function QuotationAttachmentsPanel({ quotationId }: { quotationId: string }) {
  const [anexos, setAnexos] = useState<Anexo[] | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/cotacoes/${quotationId}/anexos`)
      .then((r) => r.json())
      .then((data) => {
        if (cancelled) return;
        if (data?.success) setAnexos(data.anexos || []);
        else setError(data?.error || 'Não foi possível carregar os anexos.');
      })
      .catch(() => !cancelled && setError('Não foi possível carregar os anexos.'));
    return () => {
      cancelled = true;
    };
  }, [quotationId]);

  if (error) {
    return <p className="text-sm text-rose-600 dark:text-rose-400">{error}</p>;
  }

  if (!anexos) {
    return (
      <div className="flex justify-center py-8">
        <Spinner className="w-6 h-6" />
      </div>
    );
  }

  if (anexos.length === 0) {
    return (
      <p className="text-sm text-gray-400 dark:text-zinc-500 flex items-center gap-1.5">
        <Paperclip className="w-4 h-4" /> Ainda sem anexos (ex: comprovativo de pagamento) nesta encomenda.
      </p>
    );
  }

  return (
    <div className="space-y-2">
      {anexos.map((a) => (
        <a
          key={a.id}
          href={a.file_url}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-3 rounded-lg border border-gray-200 dark:border-zinc-800 p-3 hover:border-red-300 dark:hover:border-red-800 transition-colors"
        >
          <Paperclip className="w-4 h-4 shrink-0 text-gray-400" />
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-gray-800 dark:text-zinc-200">{a.file_name}</p>
            <p className="text-xs text-gray-400 dark:text-zinc-500">
              {a.uploaded_by_role === 'client' ? 'Enviado pelo cliente' : 'Enviado pela equipa'}
              {' · '}
              {new Date(a.created_at).toLocaleString('pt-PT')}
              {a.file_size_bytes ? ` · ${formatSize(a.file_size_bytes)}` : ''}
            </p>
          </div>
          <Download className="w-4 h-4 shrink-0 text-gray-400" />
        </a>
      ))}
    </div>
  );
}
