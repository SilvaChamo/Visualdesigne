'use client';

import { useState } from 'react';
import { LogOut } from 'lucide-react';

// Aviso fixo no topo de /encomendas quando um admin está a "entrar" como um
// cliente (src/lib/client-impersonation.ts) — a sessão continua a ser a do
// admin, por isso este botão só limpa a cookie e volta ao painel admin, não
// faz logout nenhum.
export function ImpersonationBanner({ label }: { label: string }) {
  const [exiting, setExiting] = useState(false);

  const handleExit = async () => {
    setExiting(true);
    try {
      await fetch('/api/admin/cotacoes/clientes/entrar', { method: 'DELETE' });
    } finally {
      window.location.href = '/dashboard?section=cotacoes-contas';
    }
  };

  return (
    <div className="flex shrink-0 items-center justify-between gap-3 bg-amber-400 px-4 py-2 text-sm font-medium text-amber-950">
      <span>A ver o painel como <strong>{label}</strong> — isto é o que este cliente vê.</span>
      <button
        type="button"
        onClick={handleExit}
        disabled={exiting}
        className="flex shrink-0 items-center gap-1.5 rounded bg-amber-950/10 px-3 py-1 font-bold hover:bg-amber-950/20 transition-colors disabled:opacity-50"
      >
        <LogOut className="h-3.5 w-3.5" />
        {exiting ? 'A sair...' : 'Voltar ao painel admin'}
      </button>
    </div>
  );
}
