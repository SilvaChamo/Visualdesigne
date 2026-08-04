import { redirect } from 'next/navigation'

// Página de pagamento de renovação absorvida por /checkout (mesmo pedido,
// carregado ali via ?renewalId=). Mantida como redirect para não quebrar
// links antigos (emails já enviados, marcadores) — ver
// src/app/renovacao/iniciar/[type]/[id]/route.ts para o ponto de entrada actual.
export default async function RenovacaoRedirectPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>
  searchParams: Promise<{ success?: string }>
}) {
  const { id } = await params
  const { success } = await searchParams
  const query = success === '1' ? `renewalId=${id}&success=1` : `renewalId=${id}`
  redirect(`/checkout?${query}`)
}
