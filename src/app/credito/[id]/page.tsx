'use client'

import { use, useEffect, useState, useCallback, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { CheckCircle2, Clock, XCircle, Upload, CreditCard, Smartphone, Landmark } from 'lucide-react'
import { Spinner } from '@/components/ui/spinner'
import { MPESA_NUMBER, BANK_NAME, BANK_ACCOUNT, BANK_NIB } from '@/lib/quotation-payment-info'

type Pedido = {
  id: string
  da_username: string
  valor_mt: number
  metodo_pagamento: 'mpesa' | 'transferencia' | 'stripe'
  status: 'pending' | 'confirmed' | 'rejected'
  comprovativo_url: string | null
  rejection_reason: string | null
  created_at: string
}

function formatMt(v: number) {
  return new Intl.NumberFormat('pt-PT', { minimumFractionDigits: 0, maximumFractionDigits: 2 }).format(v)
}

const METODO_META: Record<Pedido['metodo_pagamento'], { label: string; icon: typeof Smartphone }> = {
  mpesa: { label: 'M-Pesa', icon: Smartphone },
  transferencia: { label: 'Transferência Bancária', icon: Landmark },
  stripe: { label: 'Cartão', icon: CreditCard },
}

const POLL_INTERVAL_MS = 1500
const MAX_ATTEMPTS = 20

function CreditoStatusContent({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const searchParams = useSearchParams()
  const justPaid = searchParams.get('success') === '1'

  const [pedido, setPedido] = useState<Pedido | null>(null)
  const [notFound, setNotFound] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [payingStripe, setPayingStripe] = useState(false)
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    try {
      const res = await fetch(`/api/reseller/credito/${id}`)
      const data = await res.json()
      if (!res.ok || !data.success) {
        setNotFound(true)
        return
      }
      setPedido(data.pedido)
    } catch {
      setNotFound(true)
    }
  }, [id])

  useEffect(() => {
    load()
  }, [load])

  // Voltou do Stripe — o webhook confirma de forma assíncrona, sondar até reflectir.
  useEffect(() => {
    if (!justPaid) return
    let attempts = 0
    let cancelled = false
    const poll = async () => {
      attempts += 1
      const res = await fetch(`/api/reseller/credito/${id}`)
      const data = await res.json()
      if (cancelled) return
      if (data.success) setPedido(data.pedido)
      if (data.success && data.pedido.status !== 'pending') return
      if (attempts < MAX_ATTEMPTS) setTimeout(poll, POLL_INTERVAL_MS)
    }
    poll()
    return () => { cancelled = true }
  }, [justPaid, id])

  const handleUpload = async (file: File) => {
    setUploading(true)
    setError('')
    try {
      const form = new FormData()
      form.append('file', file)
      const res = await fetch(`/api/reseller/credito/${id}/comprovativo`, { method: 'POST', body: form })
      const data = await res.json()
      if (!res.ok || !data.success) throw new Error(data.error || 'Não foi possível enviar o comprovativo.')
      setPedido(data.pedido)
    } catch (err: any) {
      setError(err.message || 'Falha ao enviar o comprovativo.')
    } finally {
      setUploading(false)
    }
  }

  const handlePayStripe = async () => {
    setPayingStripe(true)
    setError('')
    try {
      const res = await fetch(`/api/reseller/credito/${id}/stripe-session`, { method: 'POST' })
      const data = await res.json()
      if (!res.ok || !data.url) throw new Error(data.error || 'Não foi possível iniciar o pagamento.')
      window.location.href = data.url
    } catch (err: any) {
      setError(err.message || 'Falha ao comunicar com o servidor.')
      setPayingStripe(false)
    }
  }

  if (notFound) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-zinc-950 px-4">
        <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-lg p-10 text-center max-w-md w-full">
          <XCircle className="w-14 h-14 text-rose-500 mx-auto mb-4" />
          <h1 className="text-xl font-bold text-slate-800 dark:text-zinc-100">Pedido não encontrado</h1>
          <p className="text-sm text-slate-500 dark:text-zinc-400 mt-2">
            Verifica se tens sessão iniciada com a conta certa.
          </p>
        </div>
      </div>
    )
  }

  if (!pedido) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-zinc-950">
        <Spinner className="w-10 h-10" />
      </div>
    )
  }

  const MetodoIcon = METODO_META[pedido.metodo_pagamento].icon
  const steps: { key: string; label: string; done: boolean; current: boolean }[] = [
    { key: 'criado', label: 'Pedido Criado', done: true, current: false },
    {
      key: 'aguarda',
      label: pedido.status === 'rejected' ? 'Rejeitado' : pedido.status === 'confirmed' ? 'Confirmado' : 'Aguarda Confirmação',
      done: pedido.status !== 'pending',
      current: pedido.status === 'pending',
    },
    { key: 'confirmado', label: 'Saldo Creditado', done: pedido.status === 'confirmed', current: false },
  ]

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-zinc-950 px-4 py-12">
      <div className="max-w-md mx-auto space-y-4">
        <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-lg p-6 shadow-sm">
          <div className="flex items-start justify-between gap-3 mb-6">
            <div>
              <p className="text-xs font-bold uppercase tracking-wide text-slate-400 dark:text-zinc-500">Carregamento de Saldo</p>
              <h1 className="text-2xl font-bold text-slate-900 dark:text-white mt-1">MT {formatMt(pedido.valor_mt)}</h1>
            </div>
            <span
              className={`px-2.5 py-1 rounded-md text-xs font-bold ${
                pedido.status === 'confirmed'
                  ? 'bg-green-100 text-green-700 dark:bg-green-950/30 dark:text-green-400'
                  : pedido.status === 'rejected'
                    ? 'bg-rose-100 text-rose-700 dark:bg-rose-950/30 dark:text-rose-400'
                    : 'bg-amber-100 text-amber-700 dark:bg-amber-950/30 dark:text-amber-400'
              }`}
            >
              {pedido.status === 'confirmed' ? 'Confirmado' : pedido.status === 'rejected' ? 'Rejeitado' : 'Pendente'}
            </span>
          </div>

          {/* Stepper */}
          <div className="flex items-center mb-6">
            {steps.map((step, i) => (
              <div key={step.key} className="flex items-center flex-1 last:flex-none">
                <div className="flex flex-col items-center gap-1.5">
                  <div
                    className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 ${
                      step.done
                        ? pedido.status === 'rejected' && step.key === 'aguarda'
                          ? 'bg-rose-500 text-white'
                          : 'bg-green-500 text-white'
                        : step.current
                          ? 'bg-amber-400 text-white'
                          : 'bg-slate-200 dark:bg-zinc-700 text-slate-400 dark:text-zinc-500'
                    }`}
                  >
                    {step.done ? <CheckCircle2 className="w-4 h-4" /> : <Clock className="w-3.5 h-3.5" />}
                  </div>
                  <span className="text-[10px] text-center text-slate-500 dark:text-zinc-400 max-w-[70px]">{step.label}</span>
                </div>
                {i < steps.length - 1 && (
                  <div className={`h-0.5 flex-1 mx-1 ${step.done ? 'bg-green-500' : 'bg-slate-200 dark:bg-zinc-700'}`} />
                )}
              </div>
            ))}
          </div>

          <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-zinc-300 border-t border-slate-100 dark:border-zinc-800 pt-4">
            <MetodoIcon className="w-4 h-4 text-slate-400" />
            {METODO_META[pedido.metodo_pagamento].label}
          </div>
        </div>

        {error && (
          <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-sm text-red-800">{error}</div>
        )}

        {pedido.status === 'pending' && pedido.metodo_pagamento === 'stripe' && (
          <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-lg p-6 shadow-sm text-center space-y-3">
            <p className="text-sm text-slate-600 dark:text-zinc-300">
              {justPaid ? 'A confirmar o pagamento com o Stripe...' : 'Paga com cartão de forma segura via Stripe.'}
            </p>
            {justPaid ? (
              <Spinner className="w-8 h-8 mx-auto" />
            ) : (
              <button
                type="button"
                onClick={handlePayStripe}
                disabled={payingStripe}
                className="w-full px-4 py-3 bg-red-600 hover:bg-red-700 text-white rounded-md font-medium disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {payingStripe ? <Spinner className="w-4 h-4" /> : <CreditCard className="w-4 h-4" />}
                Pagar agora
              </button>
            )}
          </div>
        )}

        {pedido.status === 'pending' && pedido.metodo_pagamento !== 'stripe' && (
          <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-lg p-6 shadow-sm space-y-4">
            <div className="text-sm space-y-1.5">
              {pedido.metodo_pagamento === 'mpesa' ? (
                <p className="text-slate-700 dark:text-zinc-300">Número M-Pesa: <span className="font-mono font-bold">{MPESA_NUMBER}</span></p>
              ) : (
                <>
                  <p className="text-slate-700 dark:text-zinc-300">Titular: <span className="font-medium">{BANK_NAME}</span></p>
                  <p className="text-slate-700 dark:text-zinc-300">Nº Conta: <span className="font-mono font-bold">{BANK_ACCOUNT}</span></p>
                  <p className="text-slate-700 dark:text-zinc-300">NIB: <span className="font-mono font-bold">{BANK_NIB}</span></p>
                </>
              )}
            </div>

            {pedido.comprovativo_url ? (
              <div className="flex items-center gap-2 text-sm text-green-700 bg-green-50 border border-green-200 rounded-md p-3">
                <CheckCircle2 className="w-4 h-4 shrink-0" /> Comprovativo enviado — a aguardar confirmação da equipa.
              </div>
            ) : (
              <label className="flex items-center justify-center gap-2 w-full px-4 py-3 border-2 border-dashed border-slate-300 dark:border-zinc-700 rounded-md text-sm text-slate-600 dark:text-zinc-300 hover:border-red-400 hover:text-red-600 cursor-pointer transition-colors">
                {uploading ? <Spinner className="w-4 h-4" /> : <Upload className="w-4 h-4" />}
                {uploading ? 'A enviar...' : 'Anexar comprovativo de pagamento'}
                <input
                  type="file"
                  accept="image/*,.pdf"
                  className="hidden"
                  disabled={uploading}
                  onChange={(e) => { const f = e.target.files?.[0]; if (f) handleUpload(f) }}
                />
              </label>
            )}
          </div>
        )}

        {pedido.status === 'confirmed' && (
          <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-lg p-6 shadow-sm text-center">
            <CheckCircle2 className="w-10 h-10 text-green-500 mx-auto mb-2" />
            <p className="text-sm text-slate-600 dark:text-zinc-300">Saldo já disponível na conta.</p>
          </div>
        )}

        {pedido.status === 'rejected' && (
          <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-lg p-6 shadow-sm text-center">
            <XCircle className="w-10 h-10 text-rose-500 mx-auto mb-2" />
            <p className="text-sm text-slate-600 dark:text-zinc-300">
              {pedido.rejection_reason || 'Este pedido foi rejeitado pela equipa.'}
            </p>
          </div>
        )}
      </div>
    </div>
  )
}

export default function CreditoStatusPage({ params }: { params: Promise<{ id: string }> }) {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-zinc-950">
          <Spinner className="w-10 h-10" />
        </div>
      }
    >
      <CreditoStatusContent params={params} />
    </Suspense>
  )
}
