'use client'

import { useEffect, useState } from 'react'
import { Plus, Trash2 } from 'lucide-react'
import { panelField } from '@/lib/panel-ui'
import { formatMt } from '@/lib/pricing-catalog'

type Expense = {
  id: string
  descricao: string
  valor_mt: number
}

export function QuotationBatchExpenses({ batchId }: { batchId: string }) {
  const [despesas, setDespesas] = useState<Expense[] | null>(null)
  const [draftDescricao, setDraftDescricao] = useState('')
  const [draftValor, setDraftValor] = useState('')

  useEffect(() => {
    fetch(`/api/admin/cotacoes/${batchId}/despesas`)
      .then((r) => r.json())
      .then((data) => {
        if (data.success) setDespesas(data.despesas)
      })
      .catch((error) => console.error('Erro ao carregar despesas:', error))
  }, [batchId])

  const addExpense = async () => {
    const descricao = draftDescricao.trim()
    const valorMt = Number(draftValor) || 0
    if (!descricao && !valorMt) return

    try {
      const res = await fetch(`/api/admin/cotacoes/${batchId}/despesas`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ descricao, valorMt }),
      })
      const data = await res.json()
      if (data.success) {
        setDespesas((prev) => [...(prev ?? []), data.despesa])
        setDraftDescricao('')
        setDraftValor('')
      }
    } catch (error) {
      console.error('Erro ao adicionar despesa:', error)
    }
  }

  const removeExpense = async (id: string) => {
    setDespesas((prev) => prev?.filter((d) => d.id !== id) ?? null)
    try {
      await fetch(`/api/admin/cotacoes/${batchId}/despesas/${id}`, { method: 'DELETE' })
    } catch (error) {
      console.error('Erro ao remover despesa:', error)
    }
  }

  if (!despesas) {
    return <p className="text-xs text-gray-400 dark:text-zinc-500">A carregar despesas de produção...</p>
  }

  const total = despesas.reduce((sum, d) => sum + (d.valor_mt || 0), 0)

  return (
    <div className="space-y-1.5">
      <p className="text-xs font-bold uppercase tracking-wide text-gray-400 dark:text-zinc-500">
        Despesas de produção
      </p>

      {despesas.map((d) => (
        <div key={d.id} className="relative flex items-center gap-3 pr-3 text-sm">
          <span className="min-w-0 flex-1 truncate text-right font-normal text-gray-700 dark:text-zinc-300">{d.descricao}</span>
          <span className="w-24 shrink-0 whitespace-nowrap text-right font-normal text-gray-700 dark:text-zinc-300">{formatMt(d.valor_mt)} MT</span>
          <button
            type="button"
            onClick={() => removeExpense(d.id)}
            className="absolute right-[-14px] top-1/2 -translate-y-1/2 text-gray-300 hover:text-red-600 dark:text-zinc-600 dark:hover:text-red-500 transition-colors"
            title="Remover"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      ))}

      <div className="flex items-center gap-3 pr-3">
        <span className="min-w-0 flex-1 truncate text-right text-sm font-bold text-gray-900 dark:text-white">
          Total das despesas
        </span>
        <span className="w-24 shrink-0 whitespace-nowrap text-right text-sm font-bold text-gray-900 dark:text-white">
          {formatMt(total)} MT
        </span>
      </div>

      <div className="relative flex items-center gap-3 pr-3">
        <input
          type="text"
          placeholder="Material/gasto"
          value={draftDescricao}
          onChange={(e) => setDraftDescricao(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') addExpense() }}
          className={`${panelField} min-w-0 flex-1`}
        />
        <input
          type="number"
          step="0.01"
          placeholder="Valor"
          value={draftValor}
          onChange={(e) => setDraftValor(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') addExpense() }}
          className={`${panelField} w-24 shrink-0 text-right`}
        />
        <button
          type="button"
          onClick={addExpense}
          className="absolute right-[-14px] top-1/2 -translate-y-1/2 text-gray-400 hover:text-red-600 dark:text-zinc-500 dark:hover:text-red-500 transition-colors"
          title="Adicionar material"
        >
          <Plus className="w-4 h-4" />
        </button>
      </div>
    </div>
  )
}
