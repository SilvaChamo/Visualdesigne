'use client'

import { useEffect, useState } from 'react'
import { FileText, Plus, Trash2 } from 'lucide-react'
import { panelBtnPrimary, panelField } from '@/lib/panel-ui'
import { formatMt } from '@/lib/pricing-catalog'

type Expense = {
  id: string
  descricao: string
  valor_mt: number
}

export function QuotationBatchExpenses({ batchId, onVerCotacao }: { batchId: string; onVerCotacao: () => void }) {
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
    <div className="space-y-2">
      <div className="rounded-lg border border-gray-100 dark:border-zinc-800">
        <div className="rounded-t-lg px-3 py-2 text-xs font-bold uppercase tracking-wide text-gray-400 dark:text-zinc-500">
          Despesas de produção
        </div>

        <div className="divide-y divide-gray-100 dark:divide-zinc-800">
          {despesas.map((d) => (
            <div
              key={d.id}
              className="flex items-center gap-3 px-3 py-2.5 text-sm bg-white dark:bg-zinc-900"
            >
              <span className="min-w-0 flex-1 truncate text-right font-normal text-gray-700 dark:text-zinc-300">{d.descricao}</span>
              <span className="w-24 shrink-0 whitespace-nowrap text-right font-normal text-gray-700 dark:text-zinc-300">{formatMt(d.valor_mt)} MT</span>
              <button
                type="button"
                onClick={() => removeExpense(d.id)}
                className="ml-2 shrink-0 text-gray-300 hover:text-red-600 dark:text-zinc-600 dark:hover:text-red-500 transition-colors"
                title="Remover"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}

          <div className="rounded-b-lg flex items-center gap-3 px-3 py-3 bg-gray-50 dark:bg-zinc-800/60">
            <span className="min-w-0 flex-1 truncate text-right text-sm font-bold text-gray-900 dark:text-white">
              Total das despesas
            </span>
            <span className="w-24 shrink-0 whitespace-nowrap text-right text-sm font-bold text-gray-900 dark:text-white">
              {formatMt(total)} MT
            </span>
            <span className="ml-2 w-3.5 shrink-0" aria-hidden="true" />
          </div>
        </div>
      </div>

      <div className="flex items-center gap-3 pr-3">
        <button type="button" onClick={onVerCotacao} className={panelBtnPrimary}>
          <FileText className="w-3.5 h-3.5" />
          <span>Ver cotação</span>
        </button>
        <span className="flex-1" />
        <input
          type="text"
          placeholder="Material/gasto"
          value={draftDescricao}
          onChange={(e) => setDraftDescricao(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') addExpense() }}
          className={`${panelField} min-w-0 w-[306px] shrink-0`}
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
          className="ml-2 shrink-0 text-gray-400 hover:text-red-600 dark:text-zinc-500 dark:hover:text-red-500 transition-colors"
          title="Adicionar material"
        >
          <Plus className="w-4 h-4" />
        </button>
      </div>
    </div>
  )
}
