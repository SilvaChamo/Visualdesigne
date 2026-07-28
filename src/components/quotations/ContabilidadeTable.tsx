'use client'

import { useEffect, useState } from 'react'
import {
  panelSectionCard,
  panelTabBar, panelTabBtn, panelTabBtnActive, panelTabBtnInactive,
} from '@/lib/panel-ui'
import { formatMt } from '@/lib/pricing-catalog'

type MonthRow = {
  month: string
  receitaMt: number
  custosProducaoMt: number
  ivaPercent: number
  ivaMt: number
  lucroMt: number
}

type RegistoRow = {
  batch_id: string
  primary_item_id: string
  numero: string
  advance_invoice_number: string | null
  remainder_invoice_number: string | null
  empresa: string
  resumo: string
  receita_mt: number
  custos_producao_mt: number
  iva_percent: number
  iva_mt: number
  lucro_mt: number
  done_at: string
}

const MES_LABEL = new Intl.DateTimeFormat('pt-PT', { month: 'long', timeZone: 'UTC' })

function mesLabel(month: string): string {
  const label = MES_LABEL.format(new Date(`${month}T00:00:00Z`))
  return label.charAt(0).toUpperCase() + label.slice(1)
}

function anoLabel(month: string): string {
  return month.slice(0, 4)
}

function openDocumentPopup(itemId: string, tipo?: 'factura', fase?: 'adiantamento' | 'remanescente') {
  const w = 900
  const h = 1000
  const left = window.screenX + Math.max(0, (window.outerWidth - w) / 2)
  const top = window.screenY + Math.max(0, (window.outerHeight - h) / 2)
  const query = tipo ? `?embed=1&tipo=${tipo}${fase ? `&fase=${fase}` : ''}` : '?embed=1'
  window.open(`/cotacao/${itemId}${query}`, `documento-${itemId}-${tipo ?? 'cotacao'}-${fase ?? ''}`, `width=${w},height=${h},left=${left},top=${top},resizable=yes,scrollbars=yes`)
}

type ContabilidadeTab = 'balanco' | 'cotacoes' | 'facturas'

const TABS: { id: ContabilidadeTab; label: string }[] = [
  { id: 'balanco', label: 'Balanço' },
  { id: 'cotacoes', label: 'Cotações' },
  { id: 'facturas', label: 'Facturas' },
]

export function ContabilidadeTable() {
  const [meses, setMeses] = useState<MonthRow[] | null>(null)
  const [registos, setRegistos] = useState<RegistoRow[] | null>(null)
  const [activeTab, setActiveTab] = useState<ContabilidadeTab>('balanco')

  const load = () => {
    fetch('/api/admin/contabilidade')
      .then((r) => r.json())
      .then((data) => {
        if (data.success) {
          setMeses(data.meses)
          setRegistos(data.registos ?? [])
        }
      })
      .catch((error) => console.error('Erro ao carregar contabilidade:', error))
  }

  useEffect(() => {
    load()
  }, [])

  if (!meses || !registos) {
    return <div className="text-center py-12 text-sm text-gray-400 dark:text-zinc-500">A carregar contabilidade...</div>
  }

  return (
    <div>
      <div className={`${panelTabBar} mb-4`}>
        <div className="flex flex-wrap items-end gap-5">
          {TABS.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setActiveTab(t.id)}
              className={`${panelTabBtn} ${activeTab === t.id ? panelTabBtnActive : panelTabBtnInactive}`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {activeTab === 'balanco' && <BalancoTable meses={meses} />}
      {activeTab === 'cotacoes' && <RegistosTable registos={registos} variant="cotacao" />}
      {activeTab === 'facturas' && <RegistosTable registos={registos} variant="factura" />}
    </div>
  )
}

function BalancoTable({ meses }: { meses: MonthRow[] }) {
  if (meses.length === 0) {
    return <div className={`${panelSectionCard} p-8 text-center text-sm text-gray-500 dark:text-zinc-400`}>Ainda não há dados de contabilidade.</div>
  }

  return (
    <div className={`${panelSectionCard} overflow-hidden`}>
      <div className="border-b border-gray-200 bg-gray-50 px-4 py-3 dark:border-zinc-700 dark:bg-zinc-800/50">
        <p className="font-bold text-gray-900 dark:text-white">Balanço mensal</p>
        <p className="text-xs text-gray-500 dark:text-zinc-400">Receita das encomendas entregues, menos custos e IVA.</p>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-200 text-xs font-bold uppercase tracking-wide text-gray-500 dark:border-zinc-700 dark:text-zinc-400">
              <th className="px-4 py-2 text-left whitespace-nowrap">Mês</th>
              <th className="px-4 py-2 text-right whitespace-nowrap">Valor total</th>
              <th className="px-4 py-2 text-right whitespace-nowrap">Custo de produção</th>
              <th className="px-4 py-2 text-right whitespace-nowrap">IVA (16%)</th>
              <th className="px-4 py-2 text-right whitespace-nowrap">Lucro</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-zinc-800">
            {meses.map((m) => (
              <tr key={m.month} className="hover:bg-gray-50 dark:hover:bg-zinc-800/30">
                <td className="whitespace-nowrap px-4 py-2.5 font-bold text-gray-900 dark:text-white">
                  {mesLabel(m.month)} de {anoLabel(m.month)}
                </td>
                <td className="whitespace-nowrap px-4 py-2.5 text-right font-bold tabular-nums text-gray-900 dark:text-white">
                  {formatMt(m.receitaMt)} MT
                </td>
                <td className="whitespace-nowrap px-4 py-2.5 text-right tabular-nums text-gray-700 dark:text-zinc-300">
                  {formatMt(m.custosProducaoMt)} MT
                </td>
                <td className="whitespace-nowrap px-4 py-2.5 text-right tabular-nums text-gray-700 dark:text-zinc-300">
                  {formatMt(m.ivaMt)} MT
                </td>
                <td className="whitespace-nowrap px-4 py-2.5 text-right font-bold tabular-nums text-gray-900 dark:text-white">
                  {formatMt(m.lucroMt)} MT
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

type FacturaDoc = {
  key: string
  numero: string
  empresa: string
  resumo: string
  valorMt: number
  done_at: string
  primary_item_id: string
  fase: 'adiantamento' | 'remanescente'
}

function toFacturaDocs(registos: RegistoRow[]): FacturaDoc[] {
  const docs: FacturaDoc[] = []
  for (const r of registos) {
    if (r.advance_invoice_number) {
      docs.push({
        key: `${r.batch_id}-adiantamento`,
        numero: r.advance_invoice_number,
        empresa: r.empresa,
        resumo: r.resumo,
        valorMt: Math.round(r.receita_mt * 0.7 * 100) / 100,
        done_at: r.done_at,
        primary_item_id: r.primary_item_id,
        fase: 'adiantamento',
      })
    }
    if (r.remainder_invoice_number) {
      docs.push({
        key: `${r.batch_id}-remanescente`,
        numero: r.remainder_invoice_number,
        empresa: r.empresa,
        resumo: r.resumo,
        valorMt: Math.round(r.receita_mt * 0.3 * 100) / 100,
        done_at: r.done_at,
        primary_item_id: r.primary_item_id,
        fase: 'remanescente',
      })
    }
  }
  return docs
}

function RegistosTable({ registos, variant }: { registos: RegistoRow[]; variant: 'cotacao' | 'factura' }) {
  if (variant === 'factura') {
    const docs = toFacturaDocs(registos)
    if (docs.length === 0) {
      return <div className={`${panelSectionCard} p-8 text-center text-sm text-gray-500 dark:text-zinc-400`}>Ainda não há facturas emitidas.</div>
    }
    return (
      <div className={`${panelSectionCard} overflow-hidden`}>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200 text-xs font-bold uppercase tracking-wide text-gray-500 dark:border-zinc-700 dark:text-zinc-400">
                <th className="px-4 py-2 text-left whitespace-nowrap">Factura Nº</th>
                <th className="px-4 py-2 text-left whitespace-nowrap">Fase</th>
                <th className="px-4 py-2 text-left">Empresa</th>
                <th className="px-4 py-2 text-left">Resumo</th>
                <th className="px-4 py-2 text-right whitespace-nowrap">Data</th>
                <th className="px-4 py-2 text-right whitespace-nowrap">Valor</th>
                <th className="px-4 py-2 text-right whitespace-nowrap"> </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-zinc-800">
              {docs.map((d) => (
                <tr key={d.key} className="hover:bg-gray-50 dark:hover:bg-zinc-800/30">
                  <td className="whitespace-nowrap px-4 py-2.5 font-mono text-xs font-bold text-red-600 dark:text-red-400">{d.numero}</td>
                  <td className="whitespace-nowrap px-4 py-2.5 text-gray-500 dark:text-zinc-400">
                    {d.fase === 'adiantamento' ? 'Adiantamento (70%)' : 'Remanescente (30%)'}
                  </td>
                  <td className="max-w-[14rem] truncate px-4 py-2.5 font-medium text-gray-900 dark:text-white">{d.empresa}</td>
                  <td className="max-w-[16rem] truncate px-4 py-2.5 text-gray-500 dark:text-zinc-400">{d.resumo}</td>
                  <td className="whitespace-nowrap px-4 py-2.5 text-right text-gray-500 dark:text-zinc-400">
                    {new Date(d.done_at).toLocaleDateString('pt-PT')}
                  </td>
                  <td className="whitespace-nowrap px-4 py-2.5 text-right font-bold tabular-nums text-gray-900 dark:text-white">
                    {formatMt(d.valorMt)} MT
                  </td>
                  <td className="whitespace-nowrap px-4 py-2.5 text-right">
                    <button
                      type="button"
                      onClick={() => openDocumentPopup(d.primary_item_id, 'factura', d.fase)}
                      className="text-xs font-medium text-red-600 hover:underline dark:text-red-400"
                    >
                      Ver factura
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    )
  }

  if (registos.length === 0) {
    return <div className={`${panelSectionCard} p-8 text-center text-sm text-gray-500 dark:text-zinc-400`}>Ainda não há cotações concluídas.</div>
  }

  return (
    <div className={`${panelSectionCard} overflow-hidden`}>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-200 text-xs font-bold uppercase tracking-wide text-gray-500 dark:border-zinc-700 dark:text-zinc-400">
              <th className="px-4 py-2 text-left whitespace-nowrap">Cotação Nº</th>
              <th className="px-4 py-2 text-left">Empresa</th>
              <th className="px-4 py-2 text-left">Resumo</th>
              <th className="px-4 py-2 text-right whitespace-nowrap">Data</th>
              <th className="px-4 py-2 text-right whitespace-nowrap">Valor</th>
              <th className="px-4 py-2 text-right whitespace-nowrap"> </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-zinc-800">
            {registos.map((r) => (
              <tr key={r.batch_id} className="hover:bg-gray-50 dark:hover:bg-zinc-800/30">
                <td className="whitespace-nowrap px-4 py-2.5 font-mono text-xs font-bold text-red-600 dark:text-red-400">{r.numero}</td>
                <td className="max-w-[14rem] truncate px-4 py-2.5 font-medium text-gray-900 dark:text-white">{r.empresa}</td>
                <td className="max-w-[16rem] truncate px-4 py-2.5 text-gray-500 dark:text-zinc-400">{r.resumo}</td>
                <td className="whitespace-nowrap px-4 py-2.5 text-right text-gray-500 dark:text-zinc-400">
                  {new Date(r.done_at).toLocaleDateString('pt-PT')}
                </td>
                <td className="whitespace-nowrap px-4 py-2.5 text-right font-bold tabular-nums text-gray-900 dark:text-white">
                  {formatMt(r.receita_mt)} MT
                </td>
                <td className="whitespace-nowrap px-4 py-2.5 text-right">
                  <button
                    type="button"
                    onClick={() => openDocumentPopup(r.primary_item_id)}
                    className="text-xs font-medium text-red-600 hover:underline dark:text-red-400"
                  >
                    Ver cotação
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
