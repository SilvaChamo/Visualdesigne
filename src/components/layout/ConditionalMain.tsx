'use client'

import { useSearchParams } from 'next/navigation'

/**
 * O <main> normal ocupa sempre pelo menos o ecrã inteiro (min-h-screen), para
 * páginas curtas não deixarem o rodapé a meio do ecrã. Mas as páginas em modo
 * ?embed=1 (ex.: /cotacao dentro de um iframe no painel de encomendas) contam
 * com o documento ter exactamente a altura do próprio conteúdo — é assim que
 * o iframe que as mostra sabe a que altura crescer. Um min-h-screen aqui
 * criava um "chão" à força do tamanho do ecrã, impedindo o iframe de encolher
 * para facturas curtas (via ResizeObserver, ver EncomendaDetalhe.tsx).
 */
export function ConditionalMain({ children }: { children: React.ReactNode }) {
  const searchParams = useSearchParams()
  const isEmbedded = searchParams?.get('embed') === '1'

  return (
    <main className={`site-content bg-background text-foreground ${isEmbedded ? '' : 'min-h-screen'}`}>
      {children}
    </main>
  )
}
