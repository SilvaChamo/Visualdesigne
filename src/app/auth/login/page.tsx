import { redirect } from 'next/navigation'
import { buildPanelLoginUrl, getPublicSiteOrigin } from '@/lib/panel-origin'

/** Legado — tudo passa por /login. Só o path/query do destino importa
 * (o redirect abaixo é sempre relativo), por isso a origem usada aqui é só
 * um valor válido para construir a URL — não depende de cabeçalhos de proxy. */
export default async function AuthLoginRedirect({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const params = await searchParams
  const qs = new URLSearchParams()
  for (const key of ['error', 'error_description', 'reason', 'reset', 'redirect', 'next'] as const) {
    const value = params[key]
    if (typeof value === 'string') qs.set(key, value)
  }
  const dest = buildPanelLoginUrl(getPublicSiteOrigin(), qs)
  redirect(`${dest.pathname}${dest.search}`)
}
