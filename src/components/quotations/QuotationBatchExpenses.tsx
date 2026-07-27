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
    <div className="flex flex-col gap-1.5 sm:flex-row sm:items-start sm:gap-3">
      <p className="hidden shrink-0 whitespace-nowrap text-xs font-bold uppercase tracking-wide text-gray-400 dark:text-zinc-500 sm:block">
        Despesas de produção
      </p>

      <div className="min-w-0 flex-1 space-y-1.5">
        {despesas.map((d) => (
          <div key={d.id} className="flex items-center gap-2 text-sm sm:gap-0">
            <span className="min-w-0 flex-1 truncate text-left font-normal text-gray-700 dark:text-zinc-300 sm:mr-3 sm:text-right">{d.descricao}</span>
            <span className="shrink-0 text-right font-normal text-gray-700 dark:text-zinc-300 sm:mr-[10px] sm:w-24">{formatMt(d.valor_mt)} MT</span>
            <div className="flex shrink-0 justify-start sm:w-24">
              <button
                type="button"
                onClick={() => removeExpense(d.id)}
                className="shrink-0 text-gray-300 hover:text-red-600 dark:text-zinc-600 dark:hover:text-red-500 transition-colors p-1"
                title="Remover"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        ))}

        <div className="flex items-center gap-2 sm:gap-0">
          <span className="min-w-0 flex-1 truncate text-left text-sm font-bold text-gray-900 dark:text-white sm:mr-3 sm:text-right">
            Total das despesas
          </span>
          <span className="shrink-0 text-right text-sm font-bold text-gray-900 dark:text-white sm:mr-[10px] sm:w-24">
            {formatMt(total)} MT
          </span>
          <span className="hidden shrink-0 sm:block sm:w-24" aria-hidden="true" />
        </div>

        <div className="flex flex-col gap-1.5 sm:flex-row sm:items-center sm:gap-0">
          <input
            type="text"
            placeholder="Material/gasto"
            value={draftDescricao}
            onChange={(e) => setDraftDescricao(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') addExpense() }}
            className={`${panelField} min-w-0 w-full sm:ml-auto sm:mr-3 sm:w-1/2 sm:flex-none`}
          />
          <div className="flex items-center gap-2 sm:contents">
            <input
              type="number"
              step="0.01"
              placeholder="Valor"
              value={draftValor}
              onChange={(e) => setDraftValor(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') addExpense() }}
              className={`${panelField} min-w-0 flex-1 text-right sm:mr-[10px] sm:w-24 sm:flex-none sm:shrink-0`}
            />
            <div className="flex shrink-0 justify-start sm:w-24">
              <button
                type="button"
                onClick={addExpense}
                className="shrink-0 text-gray-400 hover:text-red-600 dark:text-zinc-500 dark:hover:text-red-500 transition-colors p-1"
                title="Adicionar material"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>
      <span className="hidden w-[175px] shrink-0 sm:block" aria-hidden="true" />
    </div>
  )
}
