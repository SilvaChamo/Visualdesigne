'use client';

import { useEffect, useRef, useState } from 'react';
import { Send, Loader2, MessageSquare } from 'lucide-react';
import { panelField, panelBtnPrimary } from '@/lib/panel-ui';

type Message = {
  id: string;
  sender_role: 'client' | 'admin';
  message: string;
  created_at: string;
};

const POLL_INTERVAL_MS = 8000;

export function QuotationMessagesThread({
  quotationId,
  viewerRole,
}: {
  quotationId: string;
  viewerRole: 'client' | 'admin';
}) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  const fetchMessages = async () => {
    try {
      const res = await fetch(`/api/cotacoes/${quotationId}/mensagens`);
      const data = await res.json();
      if (data.success) setMessages(data.mensagens);
    } catch {
      /* silencioso — próximo poll tenta de novo */
    }
  };

  useEffect(() => {
    setLoading(true);
    fetchMessages().finally(() => setLoading(false));
    const interval = setInterval(fetchMessages, POLL_INTERVAL_MS);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [quotationId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length]);

  const handleSend = async () => {
    const text = draft.trim();
    if (!text || sending) return;
    setSending(true);
    try {
      const res = await fetch(`/api/cotacoes/${quotationId}/mensagens`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: text }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setMessages((prev) => [...prev, data.mensagem]);
        setDraft('');
      }
    } catch {
      /* falhou — o cliente pode tentar reenviar */
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="flex flex-col h-full min-h-[320px]">
      <div className="flex-1 overflow-y-auto space-y-2 p-1">
        {loading ? (
          <p className="text-sm text-gray-400 dark:text-zinc-500">A carregar mensagens...</p>
        ) : messages.length === 0 ? (
          <p className="text-sm text-gray-400 dark:text-zinc-500 flex items-center gap-1.5">
            <MessageSquare className="w-4 h-4" />
            Ainda sem mensagens — escreva à equipa sobre esta encomenda.
          </p>
        ) : (
          messages.map((m) => {
            const isOwn = m.sender_role === viewerRole;
            return (
              <div key={m.id} className={`flex ${isOwn ? 'justify-end' : 'justify-start'}`}>
                <div
                  className={`max-w-[80%] rounded-lg px-3 py-2 text-sm ${
                    isOwn
                      ? 'bg-red-600 text-white'
                      : 'bg-gray-100 dark:bg-zinc-800 text-gray-800 dark:text-zinc-200'
                  }`}
                >
                  <p className="whitespace-pre-line">{m.message}</p>
                  <p className={`text-[10px] mt-1 ${isOwn ? 'text-red-100' : 'text-gray-400 dark:text-zinc-500'}`}>
                    {m.sender_role === 'client' ? 'Cliente' : 'Equipa'} · {new Date(m.created_at).toLocaleString('pt-PT')}
                  </p>
                </div>
              </div>
            );
          })
        )}
        <div ref={bottomRef} />
      </div>

      <div className="flex items-center gap-2 pt-3 mt-2 border-t border-gray-100 dark:border-zinc-800">
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              handleSend();
            }
          }}
          placeholder="Escreva uma mensagem..."
          className={`${panelField} flex-1`}
          disabled={sending}
        />
        <button type="button" className={panelBtnPrimary} onClick={handleSend} disabled={sending || !draft.trim()}>
          {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
        </button>
      </div>
    </div>
  );
}
