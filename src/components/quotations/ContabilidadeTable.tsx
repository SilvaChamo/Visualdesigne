'use client'

import { useEffect, useState } from 'react'
import { panelField, panelSectionCard } from '@/lib/panel-ui'
import { formatMt } from '@/lib/pricing-catalog'
import { Spinner } from '@/components/ui/spinner'

type MonthRow = {
  month: string
  receitaMt: number
  custosProducaoMt: number
  ivaPercent: number
  ivaMt: number
  lucroMt: number
}

const MES_LABEL = new Intl.DateTimeFormat('pt-PT', { month: 'long', timeZone: 'UTC' })

function mesLabel(month: string): string {
  const label = MES_LABEL.format(new Date(`${month}T00:00:00Z`))
  return label.charAt(0).toUpperCase() + label.slice(1)
}

function anoLabel(month: string): string {
  return month.slice(0, 4)
}

const valueClass = 'w-28 shrink-0 text-right whitespace-nowrap'

export function ContabilidadeTable() {
  const [meses, setMeses] = useState<MonthRow[] | null>(null)
  const [savingMonth, setSavingMonth] = useState<string | null>(null)

  const load = () => {
    fetch('/api/admin/contabilidade')
      .then((r) => r.json())
      .then((data) => {
        if (data.success) setMeses(data.meses)
      })
      .catch((error) => console.error('Erro ao carregar contabilidade:', error))
  }

  useEffect(() => {
    load()
  }, [])

  const saveField = async (month: string, field: 'ivaPercent', value: number) => {
    setSavingMonth(month)
    setMeses((prev) => prev?.map((m) => {
      if (m.month !== month) return m
      const updated = { ...m, [field]: value }
      updated.ivaMt = (updated.receitaMt * updated.ivaPercent) / 100
      updated.lucroMt = updated.receitaMt - updated.custosProducaoMt - updated.ivaMt
      return updated
    }) ?? null)

    try {
      await fetch('/api/admin/contabilidade', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ month, [field]: value }),
      })
    } catch (error) {
      console.error('Erro ao gravar contabilidade:', error)
    } finally {
      setSavingMonth(null)
    }
  }

  if (!meses) {
    return <div className="text-center py-12 text-sm text-gray-400 dark:text-zinc-500">A carregar contabilidade...</div>
  }

  return (
    <div className="space-y-4">
      {meses.map((m) => (
        <MonthAccountingCard key={m.month} m={m} saving={savingMonth === m.month} onSave={saveField} />
      ))}
    </div>
  )
}

function MonthAccountingCard({
  m,
  saving,
  onSave,
}: {
  m: MonthRow
  saving: boolean
  onSave: (month: string, field: 'ivaPercent', value: number) => void
}) {
  const [editingIva, setEditingIva] = useState(false)

  return (
    <div className={`${panelSectionCard} p-4`}>
      <div className="grid grid-cols-1 gap-x-4 gap-y-2 sm:grid-cols-[auto_1fr] sm:items-start">
        <div className="shrink-0 sm:row-span-3">
          <p className="font-bold text-gray-900 dark:text-white">Balanço mensal</p>
          <p className="text-xs text-gray-500 dark:text-zinc-400 whitespace-nowrap">Receita das encomendas entregues, menos custos e IVA.</p>
        </div>

        <div className="flex items-center justify-end gap-3 text-sm">
          <span className="font-bold text-gray-900 dark:text-white">
            {mesLabel(m.month)} de {anoLabel(m.month)}
            {saving && <Spinner className="w-3 h-3 inline-block ml-2 align-middle" />}
          </span>
          <span className={`${valueClass} font-bold text-gray-900 dark:text-white`}>{formatMt(m.receitaMt)} MT</span>
        </div>

        <div className="flex items-center justify-end gap-3 text-sm">
          <span className="text-gray-500 dark:text-zinc-400">Custos de produção</span>
          <span className={`${valueClass} text-gray-700 dark:text-zinc-300`}>{formatMt(m.custosProducaoMt)} MT</span>
        </div>

        <div className="flex items-center justify-end gap-3 text-sm">
          {editingIva ? (
            <span className="flex items-center gap-1 text-gray-500 dark:text-zinc-400">
              IVA (
              <input
                type="number"
                step="0.1"
                autoFocus
                defaultValue={m.ivaPercent}
                onBlur={(e) => {
                  const value = Number(e.target.value) || 0
                  setEditingIva(false)
                  if (value !== m.ivaPercent) onSave(m.month, 'ivaPercent', value)
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') e.currentTarget.blur()
                  if (e.key === 'Escape') setEditingIva(false)
                }}
                className={`${panelField} w-14 px-1.5 text-right`}
              />
              %)
            </span>
          ) : (
            <button
              type="button"
              onClick={() => setEditingIva(true)}
              className="text-gray-500 dark:text-zinc-400 hover:underline decoration-dotted underline-offset-2"
              title="Clique para alterar"
            >
              IVA ({m.ivaPercent}%)
            </button>
          )}
          <span className={`${valueClass} text-gray-700 dark:text-zinc-300`}>{formatMt(m.ivaMt)} MT</span>
        </div>

        <div className="border-t border-gray-200 dark:border-zinc-700 sm:col-span-2" />

        <div className="flex items-center justify-end gap-3 text-sm sm:col-start-2">
          <span className="font-bold text-gray-900 dark:text-white">Lucro</span>
          <span className={`${valueClass} font-bold text-base text-gray-900 dark:text-white`}>{formatMt(m.lucroMt)} MT</span>
        </div>
      </div>
    </div>
  )
}
