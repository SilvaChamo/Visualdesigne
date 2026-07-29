'use client'

import { useEffect, useState } from 'react'
import { ChevronDown, ChevronRight } from 'lucide-react'
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

type FechoRow = {
  year: number
  receita_mt: number
  custos_producao_mt: number
  iva_percent: number
  iva_mt: number
  lucro_mt: number
  closed_at: string
  closed_by: string | null
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

function monthKey(dateStr: string): string {
  return `${dateStr.slice(0, 7)}-01`
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
  const [fechos, setFechos] = useState<FechoRow[] | null>(null)
  const [activeTab, setActiveTab] = useState<ContabilidadeTab>('balanco')

  const load = () => {
    fetch('/api/admin/contabilidade')
      .then((r) => r.json())
      .then((data) => {
        if (data.success) {
          setMeses(data.meses)
          setRegistos(data.registos ?? [])
          setFechos(data.fechos ?? [])
        }
      })
      .catch((error) => console.error('Erro ao carregar contabilidade:', error))
  }

  useEffect(() => {
    load()
  }, [])

  if (!meses || !registos || !fechos) {
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

      {activeTab === 'balanco' && (
        <div className="space-y-4">
          <BalancoTable meses={meses} registos={registos} />
          <FechoAnualCard meses={meses} fechos={fechos} onClosed={load} />
        </div>
      )}
      {activeTab === 'cotacoes' && <RegistosTable registos={registos} variant="cotacao" />}
      {activeTab === 'facturas' && <RegistosTable registos={registos} variant="factura" />}
    </div>
  )
}

function BalancoTable({ meses, registos }: { meses: MonthRow[]; registos: RegistoRow[] }) {
  // Aberto por omissão — o objectivo é ver logo as encomendas de cada mês,
  // não escondê-las atrás de mais um clique.
  const [collapsedMonths, setCollapsedMonths] = useState<Set<string>>(new Set())

  if (meses.length === 0) {
    return <div className={`${panelSectionCard} p-8 text-center text-sm text-gray-500 dark:text-zinc-400`}>Ainda não há dados de contabilidade.</div>
  }

  const toggleMonth = (month: string) => {
    setCollapsedMonths((prev) => {
      const next = new Set(prev)
      if (next.has(month)) next.delete(month)
      else next.add(month)
      return next
    })
  }

  return (
    <div className={`${panelSectionCard} overflow-hidden`}>
      <div className="border-b border-gray-200 bg-gray-50 px-4 py-3 dark:border-zinc-700 dark:bg-zinc-800/50">
        <p className="font-bold text-gray-900 dark:text-white">Balanço mensal</p>
        <p className="text-xs text-gray-500 dark:text-zinc-400">Receita das encomendas entregues, menos custos e IVA — actualiza-se sozinho assim que uma encomenda é concluída.</p>
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
              <th className="px-4 py-2 text-right whitespace-nowrap"> </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-zinc-800">
            {meses.flatMap((m) => {
              const encomendasDoMes = registos
                .filter((r) => monthKey(r.done_at) === m.month)
                .sort((a, b) => b.numero.localeCompare(a.numero))
              const isCollapsed = collapsedMonths.has(m.month)

              const rows = [
                <tr
                  key={m.month}
                  className="cursor-pointer hover:bg-gray-50 dark:hover:bg-zinc-800/30"
                  onClick={() => toggleMonth(m.month)}
                >
                  <td className="whitespace-nowrap px-4 py-2.5 font-bold text-gray-900 dark:text-white">
                    <span className="inline-flex items-center gap-1.5">
                      <span className="shrink-0 text-gray-400 dark:text-zinc-500">
                        {isCollapsed ? <ChevronRight className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                      </span>
                      {mesLabel(m.month)} de {anoLabel(m.month)}
                    </span>
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
                  <td className="whitespace-nowrap px-4 py-2.5 text-right text-xs text-gray-400 dark:text-zinc-500">
                    {encomendasDoMes.length > 0 ? `${encomendasDoMes.length} encomenda${encomendasDoMes.length === 1 ? '' : 's'}` : '—'}
                  </td>
                </tr>,
              ]

              if (!isCollapsed) {
                if (encomendasDoMes.length === 0) {
                  rows.push(
                    <tr key={`${m.month}-vazio`}>
                      <td colSpan={6} className="px-4 py-2 pl-10 text-xs text-gray-400 dark:text-zinc-500">
                        Nenhuma encomenda concluída neste mês.
                      </td>
                    </tr>,
                  )
                } else {
                  rows.push(
                    ...encomendasDoMes.map((r, idx) => (
                      <tr key={r.batch_id} className="hover:bg-gray-50 dark:hover:bg-zinc-800/30">
                        <td className="px-4 py-1.5 text-xs text-gray-500 dark:text-zinc-400">
                          <span className="inline-flex items-baseline gap-2">
                            <span className="w-3.5 shrink-0 text-right tabular-nums text-gray-400 dark:text-zinc-500">{idx + 1}</span>
                            <span className="min-w-0">
                              <span className="font-mono font-bold text-red-600 dark:text-red-400">{r.numero}</span>
                              {' · '}
                              <span className="font-medium text-gray-700 dark:text-zinc-300">{r.empresa}</span>
                              {' — '}
                              <span className="truncate">{r.resumo}</span>
                            </span>
                          </span>
                        </td>
                        <td className="whitespace-nowrap px-4 py-1.5 text-right text-xs tabular-nums text-gray-500 dark:text-zinc-400">{formatMt(r.receita_mt)} MT</td>
                        <td className="whitespace-nowrap px-4 py-1.5 text-right text-xs tabular-nums text-gray-500 dark:text-zinc-400">{formatMt(r.custos_producao_mt)} MT</td>
                        <td className="whitespace-nowrap px-4 py-1.5 text-right text-xs tabular-nums text-gray-500 dark:text-zinc-400">{formatMt(r.iva_mt)} MT</td>
                        <td className="whitespace-nowrap px-4 py-1.5 text-right text-xs tabular-nums text-gray-500 dark:text-zinc-400">{formatMt(r.lucro_mt)} MT</td>
                        <td className="whitespace-nowrap px-4 py-1.5" />
                      </tr>
                    )),
                  )
                }
              }

              return rows
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function FechoAnualCard({
  meses,
  fechos,
  onClosed,
}: {
  meses: MonthRow[]
  fechos: FechoRow[]
  onClosed: () => void
}) {
  const [open, setOpen] = useState(false)
  const [closing, setClosing] = useState<number | null>(null)
  const [error, setError] = useState('')

  const years = [...new Set(meses.map((m) => Number(anoLabel(m.month))))].sort((a, b) => b - a)
  if (years.length === 0) return null

  const closeYear = async (year: number) => {
    const monthsInYear = meses.filter((m) => Number(anoLabel(m.month)) === year).length
    const confirmMsg = monthsInYear < 12
      ? `Este ano só tem ${monthsInYear} ${monthsInYear === 1 ? 'mês' : 'meses'} com movimento — tens a certeza que já pode ser fechado?`
      : `Fechar o exercício de ${year}? Os valores ficam congelados e as despesas desse ano deixam de poder ser editadas.`
    if (!window.confirm(confirmMsg)) return

    setClosing(year)
    setError('')
    try {
      const res = await fetch('/api/admin/contabilidade/fechar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ year }),
      })
      const data = await res.json()
      if (!res.ok || !data.success) throw new Error(data.error || 'Não foi possível fechar o ano.')
      onClosed()
    } catch (err: any) {
      setError(err.message || 'Falha ao comunicar com o servidor.')
    } finally {
      setClosing(null)
    }
  }

  return (
    <div className={`${panelSectionCard} overflow-hidden`}>
      <div className="border-b border-gray-200 bg-gray-50 px-4 py-3 dark:border-zinc-700 dark:bg-zinc-800/50 flex items-start justify-between gap-3">
        <div>
          <p className="font-bold text-gray-900 dark:text-white">Fecho de exercício anual</p>
          <p className="text-xs text-gray-500 dark:text-zinc-400">Revê os 12 meses antes de fechar — depois de fechado, o ano fica congelado e não pode voltar a mudar.</p>
        </div>
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="shrink-0 whitespace-nowrap text-sm font-bold text-red-600 hover:underline dark:text-red-400"
        >
          Fechar o ano {open ? '▾' : '▸'}
        </button>
      </div>

      {/* Desliza para baixo em vez de aparecer instantaneamente — mesmo
          truque de grid-rows já usado em /precos para os acordeões. */}
      <div className={`grid transition-all duration-300 ease-in-out ${open ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'}`}>
        <div className="overflow-hidden">
          {error && <p className="px-4 pt-3 text-xs text-rose-600 dark:text-rose-400">{error}</p>}
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 text-xs font-bold uppercase tracking-wide text-gray-500 dark:border-zinc-700 dark:text-zinc-400">
                  <th className="px-4 py-2 text-left whitespace-nowrap">Ano / Mês</th>
                  <th className="px-4 py-2 text-right whitespace-nowrap">Receita</th>
                  <th className="px-4 py-2 text-right whitespace-nowrap">Custo de produção</th>
                  <th className="px-4 py-2 text-right whitespace-nowrap">IVA (16%)</th>
                  <th className="px-4 py-2 text-right whitespace-nowrap">Lucro</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-zinc-800">
                {years.flatMap((year) => {
                  const fecho = fechos.find((f) => f.year === year)
                  const monthsInYear = meses.filter((m) => Number(anoLabel(m.month)) === year)
                  const receitaMt = fecho ? fecho.receita_mt : monthsInYear.reduce((sum, m) => sum + m.receitaMt, 0)
                  const custosProducaoMt = fecho ? fecho.custos_producao_mt : monthsInYear.reduce((sum, m) => sum + m.custosProducaoMt, 0)
                  const ivaMt = fecho ? fecho.iva_mt : monthsInYear.reduce((sum, m) => sum + m.ivaMt, 0)
                  const lucroMt = fecho ? fecho.lucro_mt : monthsInYear.reduce((sum, m) => sum + m.lucroMt, 0)

                  const rows = [
                    <tr key={`${year}-total`} className="bg-gray-50 dark:bg-zinc-800/40">
                      <td className="whitespace-nowrap px-4 py-2.5">
                        {fecho ? (
                          <a
                            href={`/contabilidade/fecho/${year}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="font-bold text-gray-900 hover:underline dark:text-white"
                            title="Ver documento do fecho"
                          >
                            {year} · Fechado em {new Date(fecho.closed_at).toLocaleDateString('pt-PT')}
                          </a>
                        ) : (
                          <span className="font-bold text-gray-900 dark:text-white">{year}</span>
                        )}
                      </td>
                      <td className="whitespace-nowrap px-4 py-2.5 text-right font-bold tabular-nums text-gray-900 dark:text-white">{formatMt(receitaMt)} MT</td>
                      <td className="whitespace-nowrap px-4 py-2.5 text-right tabular-nums text-gray-700 dark:text-zinc-300">{formatMt(custosProducaoMt)} MT</td>
                      <td className="whitespace-nowrap px-4 py-2.5 text-right tabular-nums text-gray-700 dark:text-zinc-300">{formatMt(ivaMt)} MT</td>
                      <td className="whitespace-nowrap px-4 py-2.5 text-right font-bold tabular-nums text-gray-900 dark:text-white">{formatMt(lucroMt)} MT</td>
                    </tr>,
                    ...monthsInYear.map((m) => (
                      <tr key={m.month}>
                        <td className="whitespace-nowrap py-1.5 pl-8 pr-4 text-xs text-gray-500 dark:text-zinc-400">{mesLabel(m.month)}</td>
                        <td className="whitespace-nowrap px-4 py-1.5 text-right text-xs tabular-nums text-gray-500 dark:text-zinc-400">{formatMt(m.receitaMt)} MT</td>
                        <td className="whitespace-nowrap px-4 py-1.5 text-right text-xs tabular-nums text-gray-500 dark:text-zinc-400">{formatMt(m.custosProducaoMt)} MT</td>
                        <td className="whitespace-nowrap px-4 py-1.5 text-right text-xs tabular-nums text-gray-500 dark:text-zinc-400">{formatMt(m.ivaMt)} MT</td>
                        <td className="whitespace-nowrap px-4 py-1.5 text-right text-xs tabular-nums text-gray-500 dark:text-zinc-400">{formatMt(m.lucroMt)} MT</td>
                      </tr>
                    )),
                  ]

                  if (!fecho) {
                    rows.push(
                      <tr key={`${year}-fechar`}>
                        <td colSpan={5} className="px-4 py-2.5 text-right">
                          <button
                            type="button"
                            onClick={() => closeYear(year)}
                            disabled={closing === year}
                            className="text-xs font-bold text-red-600 hover:underline disabled:opacity-50 dark:text-red-400"
                          >
                            {closing === year ? 'A fechar...' : `Fechar o ano ${year}`}
                          </button>
                        </td>
                      </tr>,
                    )
                  }

                  return rows
                })}
              </tbody>
            </table>
          </div>
        </div>
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
                <th className="px-4 py-2 text-right whitespace-nowrap">#</th>
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
              {docs.map((d, idx) => (
                <tr key={d.key} className="hover:bg-gray-50 dark:hover:bg-zinc-800/30">
                  <td className="whitespace-nowrap px-4 py-2.5 text-right tabular-nums text-gray-400 dark:text-zinc-500">{idx + 1}</td>
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
              <th className="px-4 py-2 text-right whitespace-nowrap">#</th>
              <th className="px-4 py-2 text-left whitespace-nowrap">Cotação Nº</th>
              <th className="px-4 py-2 text-left">Empresa</th>
              <th className="px-4 py-2 text-left">Resumo</th>
              <th className="px-4 py-2 text-right whitespace-nowrap">Data</th>
              <th className="px-4 py-2 text-right whitespace-nowrap">Valor</th>
              <th className="px-4 py-2 text-right whitespace-nowrap"> </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-zinc-800">
            {registos.map((r, idx) => (
              <tr key={r.batch_id} className="hover:bg-gray-50 dark:hover:bg-zinc-800/30">
                <td className="whitespace-nowrap px-4 py-2.5 text-right tabular-nums text-gray-400 dark:text-zinc-500">{idx + 1}</td>
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
