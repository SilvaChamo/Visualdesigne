'use client';

import { useState } from 'react';
import { LogOut } from 'lucide-react';

// Aviso fixo no topo do painel quando um admin está a "entrar" como um
// cliente ou revendedor (impersonação por cookie — src/lib/client-impersonation.ts
// e src/lib/panel-api-context.ts) — a sessão continua a ser a do admin, por
// isso o botão só limpa a cookie e volta ao painel admin, não faz logout nenhum.
// `exitEndpoint`/`exitMethod`/`exitRedirect` em vez de um callback: este
// componente também é usado a partir de layouts servidor (encomendas), que
// não podem passar funções como prop a um componente cliente. Se
// `exitRedirect` não for passado, `exitEndpoint` é tratado como um URL de
// navegação directa (ex.: uma rota GET que já faz clear+redirect no servidor).
export function ImpersonationBanner({
  label,
  subject = 'cliente',
  exitEndpoint,
  exitMethod = 'DELETE',
  exitRedirect,
}: {
  label: string;
  subject?: string;
  exitEndpoint: string;
  exitMethod?: 'DELETE' | 'GET';
  exitRedirect?: string;
}) {
  const [exiting, setExiting] = useState(false);

  const handleExit = async () => {
    setExiting(true);
    if (!exitRedirect) {
      window.location.href = exitEndpoint;
      return;
    }
    try {
      await fetch(exitEndpoint, { method: exitMethod });
    } finally {
      window.location.href = exitRedirect;
    }
  };

  return (
    <div className="flex shrink-0 items-center justify-between gap-3 bg-amber-400 px-4 py-2 text-sm font-medium text-amber-950">
      <span>A ver o painel como <strong>{label}</strong> — isto é o que este {subject} vê.</span>
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
