'use client'

import { useState } from 'react'
import { X, Smartphone, Landmark, CreditCard, Check } from 'lucide-react'
import { Spinner } from '@/components/ui/spinner'

function formatMt(v: number) {
  return new Intl.NumberFormat('pt-PT', { minimumFractionDigits: 0, maximumFractionDigits: 2 }).format(v)
}

// Cria o pedido de pagamento e entrega logo à página dedicada
// (/renovacao/[id]) para pagar/anexar comprovativo — mesmo padrão do
// carregamento de saldo do revendedor.
export function ResellerPayRenewalModal({
  renewalType,
  renewalId,
  serviceName,
  valorMt,
  onClose,
}: {
  renewalType: 'domain' | 'hosting'
  renewalId: string
  serviceName: string
  valorMt: number
  onClose: () => void
}) {
  const [metodo, setMetodo] = useState<'mpesa' | 'emola' | 'transferencia' | 'stripe'>('mpesa')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async () => {
    setSubmitting(true)
    setError('')
    try {
      const res = await fetch('/api/renewals/pagamento', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ renewalType, renewalId, metodoPagamento: metodo }),
      })
      const data = await res.json()
      if (!res.ok || !data.success) throw new Error(data.error || 'Não foi possível criar o pedido.')

      if (metodo === 'stripe') {
        const stripeRes = await fetch(`/api/renewals/pagamento/${data.pedido.id}/stripe-session`, { method: 'POST' })
        const stripeData = await stripeRes.json()
        if (!stripeRes.ok || !stripeData.url) throw new Error(stripeData.error || 'Não foi possível iniciar o pagamento.')
        window.location.href = stripeData.url
        return
      }

      window.location.href = `/renovacao/${data.pedido.id}`
    } catch (err: any) {
      setError(err.message || 'Falha ao comunicar com o servidor.')
      setSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-md w-full p-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-xl font-bold text-gray-900">Pagar Renovação</h3>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-md">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="mb-5 p-3 rounded-md bg-gray-50 border border-gray-200">
          <p className="text-sm font-bold text-gray-900 truncate">{serviceName}</p>
          <p className="text-lg font-bold text-gray-900 mt-0.5">MT {formatMt(valorMt)}</p>
        </div>

        {error && (
          <div className="mb-4 p-3 rounded-md bg-red-50 border border-red-200 text-sm text-red-800">{error}</div>
        )}

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Método de pagamento</label>
            <div className="grid grid-cols-4 gap-2">
              <button
                type="button"
                onClick={() => setMetodo('mpesa')}
                className={`flex flex-col items-center p-3 rounded-md border-2 transition-colors ${
                  metodo === 'mpesa' ? 'border-red-600 bg-red-50' : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <Smartphone className={`w-5 h-5 mb-1.5 ${metodo === 'mpesa' ? 'text-red-600' : 'text-gray-500'}`} />
                <span className="text-xs font-medium">M-Pesa</span>
              </button>
              <button
                type="button"
                onClick={() => setMetodo('emola')}
                className={`flex flex-col items-center p-3 rounded-md border-2 transition-colors ${
                  metodo === 'emola' ? 'border-red-600 bg-red-50' : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <Smartphone className={`w-5 h-5 mb-1.5 ${metodo === 'emola' ? 'text-red-600' : 'text-gray-500'}`} />
                <span className="text-xs font-medium">e-Mola</span>
              </button>
              <button
                type="button"
                onClick={() => setMetodo('transferencia')}
                className={`flex flex-col items-center p-3 rounded-md border-2 transition-colors ${
                  metodo === 'transferencia' ? 'border-red-600 bg-red-50' : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <Landmark className={`w-5 h-5 mb-1.5 ${metodo === 'transferencia' ? 'text-red-600' : 'text-gray-500'}`} />
                <span className="text-xs font-medium">Transferência</span>
              </button>
              <button
                type="button"
                onClick={() => setMetodo('stripe')}
                className={`flex flex-col items-center p-3 rounded-md border-2 transition-colors ${
                  metodo === 'stripe' ? 'border-red-600 bg-red-50' : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <CreditCard className={`w-5 h-5 mb-1.5 ${metodo === 'stripe' ? 'text-red-600' : 'text-gray-500'}`} />
                <span className="text-xs font-medium">Cartão</span>
              </button>
            </div>
          </div>

          <button
            type="button"
            onClick={handleSubmit}
            disabled={submitting}
            className="w-full px-4 py-3 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:opacity-50 flex items-center justify-center gap-2 font-medium"
          >
            {submitting ? <Spinner className="w-4 h-4" /> : <Check className="w-4 h-4" />}
            {submitting ? 'A processar...' : 'Continuar'}
          </button>
        </div>
      </div>
    </div>
  )
}
