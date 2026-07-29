'use client'

import { useEffect, useState } from 'react'
import { X, Smartphone, Landmark, Check, Upload, Clock, CheckCircle2, XCircle } from 'lucide-react'
import { Spinner } from '@/components/ui/spinner'
import { MPESA_NUMBER, BANK_NAME, BANK_ACCOUNT, BANK_NIB, metodoPagamentoLabel } from '@/lib/quotation-payment-info'

type Pedido = {
  id: string
  valor_mt: number
  metodo_pagamento: string
  status: 'pending' | 'confirmed' | 'rejected'
  comprovativo_url: string | null
  rejection_reason: string | null
  created_at: string
}

function formatMt(v: number) {
  return new Intl.NumberFormat('pt-PT', { minimumFractionDigits: 0, maximumFractionDigits: 2 }).format(v)
}

const STATUS_META: Record<Pedido['status'], { label: string; className: string; icon: typeof Clock }> = {
  pending: { label: 'Aguarda confirmação', className: 'bg-amber-100 text-amber-700', icon: Clock },
  confirmed: { label: 'Confirmado', className: 'bg-green-100 text-green-700', icon: CheckCircle2 },
  rejected: { label: 'Rejeitado', className: 'bg-rose-100 text-rose-700', icon: XCircle },
}

export function ResellerAddCreditModal({ onClose, onCredited }: { onClose: () => void; onCredited: () => void }) {
  const [pedidos, setPedidos] = useState<Pedido[] | null>(null)
  const [valor, setValor] = useState('')
  const [metodo, setMetodo] = useState<'mpesa' | 'transferencia'>('mpesa')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [activePedido, setActivePedido] = useState<Pedido | null>(null)
  const [uploading, setUploading] = useState(false)

  const load = () => {
    fetch('/api/reseller/credito')
      .then((r) => r.json())
      .then((data) => {
        if (data.success) setPedidos(data.pedidos)
      })
      .catch(() => {})
  }

  useEffect(() => {
    load()
  }, [])

  const handleSubmit = async () => {
    const valorMt = Number(valor)
    if (!Number.isFinite(valorMt) || valorMt <= 0) {
      setError('Indica um valor válido.')
      return
    }
    setSubmitting(true)
    setError('')
    try {
      const res = await fetch('/api/reseller/credito', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ valorMt, metodoPagamento: metodo }),
      })
      const data = await res.json()
      if (!res.ok || !data.success) throw new Error(data.error || 'Não foi possível criar o pedido.')
      setActivePedido(data.pedido)
      setValor('')
      load()
    } catch (err: any) {
      setError(err.message || 'Falha ao comunicar com o servidor.')
    } finally {
      setSubmitting(false)
    }
  }

  const handleUpload = async (file: File) => {
    if (!activePedido) return
    setUploading(true)
    setError('')
    try {
      const form = new FormData()
      form.append('file', file)
      const res = await fetch(`/api/reseller/credito/${activePedido.id}/comprovativo`, { method: 'POST', body: form })
      const data = await res.json()
      if (!res.ok || !data.success) throw new Error(data.error || 'Não foi possível enviar o comprovativo.')
      setActivePedido(data.pedido)
      load()
      onCredited()
    } catch (err: any) {
      setError(err.message || 'Falha ao enviar o comprovativo.')
    } finally {
      setUploading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl max-w-md w-full p-6 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-xl font-bold text-gray-900">Adicionar Fundos</h3>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full">
            <X className="w-5 h-5" />
          </button>
        </div>

        {error && (
          <div className="mb-4 p-3 rounded-lg bg-red-50 border border-red-200 text-sm text-red-800">{error}</div>
        )}

        {activePedido ? (
          <div className="space-y-4">
            <p className="text-sm text-gray-600">
              Pedido de <span className="font-bold text-gray-900">{formatMt(activePedido.valor_mt)} MT</span> registado.
              Faz o pagamento pelo método abaixo e envia o comprovativo — a equipa confirma e o saldo entra na conta.
            </p>

            <div className="rounded-lg border border-gray-200 p-4 text-sm space-y-1.5">
              {activePedido.metodo_pagamento === 'mpesa' ? (
                <>
                  <p className="font-bold text-gray-900">M-Pesa</p>
                  <p className="text-gray-700">Número: <span className="font-mono font-bold">{MPESA_NUMBER}</span></p>
                </>
              ) : (
                <>
                  <p className="font-bold text-gray-900">Transferência Bancária</p>
                  <p className="text-gray-700">Titular: <span className="font-medium">{BANK_NAME}</span></p>
                  <p className="text-gray-700">Nº Conta: <span className="font-mono font-bold">{BANK_ACCOUNT}</span></p>
                  <p className="text-gray-700">NIB: <span className="font-mono font-bold">{BANK_NIB}</span></p>
                </>
              )}
            </div>

            {activePedido.comprovativo_url ? (
              <div className="flex items-center gap-2 text-sm text-green-700 bg-green-50 border border-green-200 rounded-lg p-3">
                <Check className="w-4 h-4 shrink-0" /> Comprovativo enviado — a aguardar confirmação da equipa.
              </div>
            ) : (
              <label className="flex items-center justify-center gap-2 w-full px-4 py-3 border-2 border-dashed border-gray-300 rounded-lg text-sm text-gray-600 hover:border-red-400 hover:text-red-600 cursor-pointer transition-colors">
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

            <button
              type="button"
              onClick={() => setActivePedido(null)}
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm text-gray-700 hover:bg-gray-50"
            >
              Fazer outro pedido
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Valor a carregar (MT)</label>
              <input
                type="number"
                min="1"
                step="1"
                placeholder="Ex: 5000"
                value={valor}
                onChange={(e) => setValor(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Método de pagamento</label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setMetodo('mpesa')}
                  className={`flex flex-col items-center p-4 rounded-xl border-2 transition-colors ${
                    metodo === 'mpesa' ? 'border-red-600 bg-red-50' : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <Smartphone className={`w-6 h-6 mb-2 ${metodo === 'mpesa' ? 'text-red-600' : 'text-gray-500'}`} />
                  <span className="text-sm font-medium">M-Pesa</span>
                </button>
                <button
                  type="button"
                  onClick={() => setMetodo('transferencia')}
                  className={`flex flex-col items-center p-4 rounded-xl border-2 transition-colors ${
                    metodo === 'transferencia' ? 'border-red-600 bg-red-50' : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <Landmark className={`w-6 h-6 mb-2 ${metodo === 'transferencia' ? 'text-red-600' : 'text-gray-500'}`} />
                  <span className="text-sm font-medium">Transferência</span>
                </button>
              </div>
            </div>

            <button
              type="button"
              onClick={handleSubmit}
              disabled={submitting}
              className="w-full px-4 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 flex items-center justify-center gap-2 font-medium"
            >
              {submitting ? <Spinner className="w-4 h-4" /> : <Check className="w-4 h-4" />}
              {submitting ? 'A registar...' : 'Continuar'}
            </button>
          </div>
        )}

        {pedidos && pedidos.length > 0 && !activePedido && (
          <div className="mt-6 pt-4 border-t border-gray-100">
            <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Pedidos anteriores</p>
            <div className="space-y-1.5 max-h-40 overflow-y-auto">
              {pedidos.map((p) => {
                const meta = STATUS_META[p.status]
                const Icon = meta.icon
                return (
                  <div key={p.id} className="flex items-center justify-between gap-2 text-xs py-1">
                    <span className="text-gray-600">
                      {formatMt(p.valor_mt)} MT · {metodoPagamentoLabel(p.metodo_pagamento)}
                    </span>
                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full font-medium ${meta.className}`}>
                      <Icon className="w-3 h-3" /> {meta.label}
                    </span>
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
