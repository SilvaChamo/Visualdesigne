'use client';

import { useEffect, useRef, useState } from 'react';
import { Paperclip, FileText, FileArchive, File as FileIcon, Loader2 } from 'lucide-react';
import { panelBtnSecondary } from '@/lib/panel-ui';
import { Spinner } from '@/components/ui/spinner';

type Attachment = {
  id: string;
  file_name: string;
  file_url: string;
  file_size_bytes: number | null;
  uploaded_by_role: 'client' | 'admin';
  created_at: string;
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

function iconFor(fileName: string) {
  if (/\.(jpg|jpeg|png|gif|webp)$/i.test(fileName)) return <FileIcon className="w-4 h-4 text-slate-500" />;
  if (/\.pdf$/i.test(fileName)) return <FileText className="w-4 h-4 text-red-500" />;
  if (/\.(zip|rar)$/i.test(fileName)) return <FileArchive className="w-4 h-4 text-yellow-600" />;
  return <FileIcon className="w-4 h-4 text-slate-500" />;
}

export function QuotationAttachmentsList({
  quotationId,
  viewerRole,
}: {
  quotationId: string;
  viewerRole: 'client' | 'admin';
}) {
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchAttachments = () => {
    setLoading(true);
    fetch(`/api/cotacoes/${quotationId}/anexos`)
      .then((r) => r.json())
      .then((data) => {
        if (data.success) setAttachments(data.anexos);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchAttachments();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [quotationId]);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setError('');
    try {
      const formData = new FormData();
      formData.append('file', file);
      const res = await fetch(`/api/cotacoes/${quotationId}/anexos`, { method: 'POST', body: formData });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || 'Falha no upload.');
      setAttachments((prev) => [data.anexo, ...prev]);
    } catch (err: any) {
      setError(err.message || 'Não foi possível enviar o ficheiro.');
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  return (
    <div className="space-y-3">
      {loading ? (
        <p className="text-sm text-gray-400 dark:text-zinc-500">A carregar anexos...</p>
      ) : attachments.length === 0 ? (
        <p className="text-sm text-gray-400 dark:text-zinc-500">Ainda sem anexos.</p>
      ) : (
        <div className="space-y-2">
          {attachments.map((a) => (
            <div
              key={a.id}
              className="flex items-center justify-between gap-3 p-3 bg-white dark:bg-zinc-900 border border-gray-100 dark:border-zinc-800 rounded-lg"
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-8 h-8 rounded bg-slate-100 dark:bg-zinc-800 flex items-center justify-center shrink-0">
                  {iconFor(a.file_name)}
                </div>
                <div className="min-w-0">
                  <a
                    href={a.file_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm font-medium text-blue-600 hover:underline truncate block"
                  >
                    {a.file_name}
                  </a>
                  <p className="text-xs text-gray-400 dark:text-zinc-500">
                    {a.uploaded_by_role === 'client' ? 'Enviado por: Cliente' : 'Enviado por: Equipa'}
                    {a.file_size_bytes ? ` · ${formatBytes(a.file_size_bytes)}` : ''}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {error && <p className="text-xs text-red-600 dark:text-red-400">{error}</p>}

      <input type="file" ref={fileInputRef} onChange={handleFileSelect} className="hidden" disabled={uploading} />
      <button
        type="button"
        className={panelBtnSecondary}
        onClick={() => !uploading && fileInputRef.current?.click()}
        disabled={uploading}
      >
        {uploading ? <Spinner className="w-4 h-4" /> : <Paperclip className="w-4 h-4" />}
        {uploading ? 'A enviar...' : 'Anexar ficheiro'}
      </button>
    </div>
  );
}
