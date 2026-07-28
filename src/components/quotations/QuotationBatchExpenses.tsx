'use client'

import { useEffect, useState } from 'react'
import { Check, ChevronDown, ChevronRight, FileText, Plus, Trash2 } from 'lucide-react'
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
  const [collapsed, setCollapsed] = useState(true)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editDescricao, setEditDescricao] = useState('')
  const [editValor, setEditValor] = useState('')

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

  const startEditing = (d: Expense) => {
    setEditingId(d.id)
    setEditDescricao(d.descricao)
    setEditValor(String(d.valor_mt))
  }

  const commitEdit = async (id: string) => {
    const descricao = editDescricao.trim()
    const valorMt = Number(editValor) || 0
    setEditingId(null)
    setDespesas((prev) => prev?.map((d) => (d.id === id ? { ...d, descricao, valor_mt: valorMt } : d)) ?? null)
    try {
      await fetch(`/api/admin/cotacoes/${batchId}/despesas/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ descricao, valorMt }),
      })
    } catch (error) {
      console.error('Erro ao actualizar despesa:', error)
    }
  }

  if (!despesas) {
    return <p className="text-xs text-gray-400 dark:text-zinc-500">A carregar despesas de produção...</p>
  }

  const total = despesas.reduce((sum, d) => sum + (d.valor_mt || 0), 0)
  const totalLabel = total === 0 ? '00,00' : formatMt(total)
  const [first, ...rest] = despesas

  const renderExpenseFields = (d: Expense) => {
    if (editingId === d.id) {
      return (
        <>
          <input
            autoFocus
            type="text"
            value={editDescricao}
            onChange={(e) => setEditDescricao(e.target.value)}
            onClick={(e) => e.stopPropagation()}
            onKeyDown={(e) => {
              if (e.key === 'Enter') commitEdit(d.id)
              if (e.key === 'Escape') setEditingId(null)
            }}
            className={`${panelField} min-w-0 flex-1 py-1 text-right text-sm`}
          />
          <input
            type="number"
            step="0.01"
            value={editValor}
            onChange={(e) => setEditValor(e.target.value)}
            onClick={(e) => e.stopPropagation()}
            onKeyDown={(e) => {
              if (e.key === 'Enter') commitEdit(d.id)
              if (e.key === 'Escape') setEditingId(null)
            }}
            className={`${panelField} w-24 shrink-0 py-1 text-right text-sm`}
          />
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); commitEdit(d.id) }}
            className="ml-2 shrink-0 text-green-600 hover:text-green-700 dark:text-green-400 dark:hover:text-green-300 transition-colors"
            title="Guardar"
          >
            <Check className="w-3.5 h-3.5" />
          </button>
        </>
      )
    }
    return (
      <>
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); startEditing(d) }}
          className="min-w-0 flex-1 truncate text-right font-normal text-gray-700 hover:text-red-600 dark:text-zinc-300 dark:hover:text-red-400 transition-colors"
          title="Clique para editar"
        >
          {d.descricao}
        </button>
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); startEditing(d) }}
          className="w-24 shrink-0 whitespace-nowrap text-right font-normal text-gray-700 hover:text-red-600 dark:text-zinc-300 dark:hover:text-red-400 transition-colors"
          title="Clique para editar"
        >
          {formatMt(d.valor_mt)} MT
        </button>
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); removeExpense(d.id) }}
          className="ml-2 shrink-0 text-gray-300 hover:text-red-600 dark:text-zinc-600 dark:hover:text-red-500 transition-colors"
          title="Remover"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </>
    )
  }

  return (
    <div className="space-y-2">
      <div className="rounded-lg border border-gray-100 dark:border-zinc-800 overflow-hidden">
        <div className="divide-y divide-gray-100 dark:divide-zinc-800">
          <div
            role="button"
            tabIndex={0}
            onClick={() => setCollapsed((v) => !v)}
            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setCollapsed((v) => !v) } }}
            className="flex items-center gap-3 px-3 py-2.5 text-sm bg-white dark:bg-zinc-900 cursor-pointer"
            title={collapsed ? 'Expandir despesas' : 'Colapsar despesas'}
          >
            <span className="shrink-0 text-gray-400 dark:text-zinc-500">
              {collapsed ? <ChevronRight className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            </span>
            <span className="shrink-0 text-xs font-bold uppercase tracking-wide text-gray-600 dark:text-zinc-300 whitespace-nowrap">
              Adicionar material de produção
            </span>
            {collapsed ? (
              <>
                <span className="min-w-0 flex-1 truncate text-right text-xs font-bold uppercase tracking-wide text-gray-400 dark:text-zinc-500">
                  Total das despesas de produção
                </span>
                <span className="w-24 shrink-0 whitespace-nowrap text-right text-sm font-bold text-gray-900 dark:text-white">{totalLabel} MT</span>
                <span className="ml-2 w-3.5 shrink-0" aria-hidden="true" />
              </>
            ) : first ? (
              renderExpenseFields(first)
            ) : (
              <span className="flex-1" />
            )}
          </div>

          {!collapsed && rest.map((d) => (
            <div
              key={d.id}
              className="flex items-center gap-3 px-3 py-2.5 text-sm bg-white dark:bg-zinc-900"
            >
              {renderExpenseFields(d)}
            </div>
          ))}

          {!collapsed && (
            <div className="flex items-center gap-3 px-3 py-3 bg-gray-50 dark:bg-zinc-800/60">
              <span className="min-w-0 flex-1 truncate text-right text-sm font-bold text-gray-900 dark:text-white">
                Total das despesas de produção
              </span>
              <span className="w-24 shrink-0 whitespace-nowrap text-right text-sm font-bold text-gray-900 dark:text-white">
                {totalLabel} MT
              </span>
              <span className="ml-2 w-3.5 shrink-0" aria-hidden="true" />
            </div>
          )}
        </div>
      </div>

      {!collapsed && (
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
            className={`${panelField} min-w-0 w-[420px] shrink-0`}
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
      )}
    </div>
  )
}
