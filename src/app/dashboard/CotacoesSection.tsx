'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import {
  RefreshCw, FileText, Building2, Phone, Mail, Calendar,
  Inbox, Clock, Factory, PackageCheck, XCircle, CheckCircle2, MessageCircle, X,
} from 'lucide-react'
import {
  panelBtnPrimary, panelBtnSecondary, panelField,
  panelTabBar, panelTabBtn, panelTabBtnActive, panelTabBtnInactive, panelSectionCard,
} from '@/lib/panel-ui'
import { formatMt, BRANDS } from '@/lib/pricing-catalog'
import { statusMeta, type StatusBucket } from '@/lib/quotation-status-labels'
import { groupIntoBatches, groupBatchesByBrand, filterBatchesByBucket, batchNumero, type BatchItem, type QuotationBatch } from '@/lib/quotation-batch'
import { QuotationHistoryTimeline } from '@/components/quotations/QuotationHistoryTimeline'
import { QuotationAttachmentsList } from '@/components/quotations/QuotationAttachmentsList'
import { QuotationMessagesThread } from '@/components/quotations/QuotationMessagesThread'
import { QuotationLayoutsList } from '@/components/quotations/QuotationLayoutsList'

interface QuotationRequest extends BatchItem {
  empresa: string
  nif: string | null
  responsavel: string
  cargo: string | null
  telefone: string
  email: string
  categoria_label: string
  produto: string
  preco_unitario_mt: number
  quantidade: number
  data_limite_entrega: string
  metodo_pagamento: string | null
  remanescente_metodo_pagamento: string | null
  notas: string | null
  rejection_reason: string | null
}

const STATUS_OPTIONS: { value: QuotationRequest['status']; label: string; badge: string }[] = [
  { value: 'pending', label: 'Pendente', badge: 'bg-amber-100 text-amber-700 dark:bg-amber-950/30 dark:text-amber-400' },
  { value: 'payment_selected', label: 'Pago', badge: 'bg-blue-100 text-blue-700 dark:bg-blue-950/30 dark:text-blue-400' },
  { value: 'approved', label: 'Em Produção', badge: 'bg-teal-100 text-teal-700 dark:bg-teal-950/30 dark:text-teal-400' },
  { value: 'delivered', label: 'Entregue', badge: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-950/30 dark:text-indigo-400' },
  { value: 'rejected', label: 'Rejeitada', badge: 'bg-rose-100 text-rose-700 dark:bg-rose-950/30 dark:text-rose-400' },
  { value: 'done', label: 'Concluída', badge: 'bg-green-100 text-green-700 dark:bg-green-950/30 dark:text-green-400' },
  { value: 'cancelled', label: 'Cancelada', badge: 'bg-gray-200 text-gray-600 dark:bg-zinc-800 dark:text-zinc-400' },
]

function itemStatusMeta(status: string) {
  return STATUS_OPTIONS.find((s) => s.value === status) || STATUS_OPTIONS[0]
}

const metodoLabel = (m: string | null) => (m === 'mpesa' ? 'M-Pesa' : m === 'transferencia' ? 'Transferência' : '—')

/** Contador decrescente até à data limite de entrega, com cor de alerta consoante a urgência. */
function deliveryCountdown(dateStr: string): { label: string; className: string } {
  const deadline = new Date(dateStr)
  deadline.setHours(23, 59, 59, 999)
  const diffDays = Math.ceil((deadline.getTime() - Date.now()) / 86_400_000)
  if (diffDays < 0) return { label: `${Math.abs(diffDays)}d em atraso`, className: 'bg-red-100 text-red-700 dark:bg-red-950/30 dark:text-red-400' }
  if (diffDays === 0) return { label: 'Entrega hoje', className: 'bg-red-100 text-red-700 dark:bg-red-950/30 dark:text-red-400' }
  if (diffDays <= 3) return { label: `Faltam ${diffDays}d`, className: 'bg-amber-100 text-amber-700 dark:bg-amber-950/30 dark:text-amber-400' }
  return { label: `Faltam ${diffDays}d`, className: 'bg-gray-100 text-gray-600 dark:bg-zinc-800 dark:text-zinc-400' }
}

const BUCKET_ITEMS: { value: StatusBucket; label: string; icon: React.ElementType }[] = [
  { value: 'pending', label: 'Pendentes', icon: Clock },
  { value: 'approved', label: 'Em produção', icon: Factory },
  { value: 'delivered', label: 'Entregues', icon: PackageCheck },
  { value: 'cancelled', label: 'Canceladas', icon: XCircle },
  { value: 'done', label: 'Concluídas', icon: CheckCircle2 },
]

const CATEGORY_LABELS = [...BRANDS.map((b) => b.label), 'Outros']

type NavMode = 'categoria' | 'bucket'

// Cache rápida (sessionStorage) para a lista aparecer junto com a barra lateral em vez de
// esperar pela ida ao servidor a cada visita — a mesma abordagem já usada noutras secções do
// painel (Pacotes, Contas). Limpa automaticamente no logout (prefixo vd_panel_).
const COTACOES_CACHE_KEY = 'vd_panel_cotacoes_v1'

function readCotacoesCache(): QuotationRequest[] | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = sessionStorage.getItem(COTACOES_CACHE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed : null
  } catch {
    return null
  }
}

function writeCotacoesCache(data: QuotationRequest[]) {
  if (typeof window === 'undefined') return
  try {
    sessionStorage.setItem(COTACOES_CACHE_KEY, JSON.stringify(data))
  } catch {
    /* quota */
  }
}

export function CotacoesSection() {
  const [cotacoes, setCotacoes] = useState<QuotationRequest[]>(() => readCotacoesCache() ?? [])
  const [loading, setLoading] = useState(() => readCotacoesCache() === null)
  const [navMode, setNavMode] = useState<NavMode>('categoria')
  const [activeCategory, setActiveCategory] = useState<string | null>(null)
  const [activeBucket, setActiveBucket] = useState<StatusBucket>('pending')
  const [updatingId, setUpdatingId] = useState<string | null>(null)
  const [expandedBatchId, setExpandedBatchId] = useState<string | null>(null)

  const fetchCotacoes = useCallback(async (opts?: { background?: boolean }) => {
    if (!opts?.background) setLoading(true)
    try {
      const res = await fetch('/api/admin/cotacoes')
      const data = await res.json()
      if (data.success) {
        setCotacoes(data.cotacoes)
        writeCotacoesCache(data.cotacoes)
      }
    } catch (error) {
      console.error('Erro ao carregar cotações:', error)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchCotacoes({ background: readCotacoesCache() !== null })
  }, [fetchCotacoes])

  // Pagos (qualquer estado além de "pending" = aguarda pagamento) sobem para o
  // topo da lista — sort estável, mantém a ordem por data dentro de cada grupo.
  const batches = useMemo(() => {
    const grouped = groupIntoBatches(cotacoes)
    return [...grouped].sort((a, b) => {
      const aPaid = a.status !== 'pending'
      const bPaid = b.status !== 'pending'
      if (aPaid === bPaid) return 0
      return aPaid ? -1 : 1
    })
  }, [cotacoes])
  const categoryGroups = useMemo(() => groupBatchesByBrand(batches), [batches])
  const bucketCounts = useMemo(() => {
    const counts: Record<StatusBucket, number> = { pending: 0, approved: 0, delivered: 0, cancelled: 0, done: 0 }
    for (const b of BUCKET_ITEMS) counts[b.value] = filterBatchesByBucket(batches, b.value).length
    return counts
  }, [batches])

  // "Recebidas" (sem categoria escolhida) mostra tudo numa lista só — nunca
  // stacka todas as categorias ao mesmo tempo, porque isso repetia a mesma
  // encomenda mista (ex.: cartões + webdesign) em várias secções ao mesmo
  // tempo. Só ao escolher uma categoria específica é que filtra.
  const visibleGroups = useMemo(() => {
    if (navMode === 'bucket') {
      return [{ label: null as string | null, batches: filterBatchesByBucket(batches, activeBucket) }]
    }
    if (activeCategory === null) return [{ label: null as string | null, batches }]
    return categoryGroups.filter((g) => g.label === activeCategory).map((g) => ({ label: null as string | null, batches: g.batches }))
  }, [navMode, activeBucket, activeCategory, batches, categoryGroups])

  const updateStatus = async (itemId: string, status: QuotationRequest['status']) => {
    let rejectionReason: string | null = null
    if (status === 'rejected') {
      rejectionReason = window.prompt('Motivo da rejeição (enviado ao cliente por email):', '')
      if (rejectionReason === null) return
    }

    setUpdatingId(itemId)
    try {
      const res = await fetch('/api/admin/cotacoes', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: itemId, status, rejectionReason }),
      })
      const data = await res.json()
      if (data.success) {
        setCotacoes((prev) => prev.map((c) => (c.id === itemId ? { ...c, status, rejection_reason: rejectionReason } : c)))
      }
    } catch (error) {
      console.error('Erro ao actualizar cotação:', error)
    } finally {
      setUpdatingId(null)
    }
  }

  const updateDeliveryDate = async (batchId: string, dataLimiteEntrega: string) => {
    try {
      const res = await fetch('/api/admin/cotacoes', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ batchId, dataLimiteEntrega }),
      })
      const data = await res.json()
      if (data.success) {
        setCotacoes((prev) => prev.map((c) => (c.batch_id === batchId ? { ...c, data_limite_entrega: dataLimiteEntrega } : c)))
      }
    } catch (error) {
      console.error('Erro ao actualizar prazo de entrega:', error)
    }
  }

  const navBtnClass = (active: boolean) =>
    `w-full flex items-center gap-2 px-2.5 py-2 rounded-lg text-sm font-medium transition-colors text-left ${
      active
        ? 'bg-red-50 text-red-600 dark:bg-red-950/20 dark:text-red-400'
        : 'text-gray-600 hover:bg-gray-50 dark:text-zinc-400 dark:hover:bg-zinc-800/50'
    }`

  return (
    <div>
      <div className="flex flex-wrap items-center justify-end gap-3 mb-5">
        <button className={panelBtnSecondary} onClick={() => fetchCotacoes()} disabled={loading}>
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          <span>Actualizar</span>
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[220px_1fr] gap-4 lg:gap-6 items-start">
        <nav className={`${panelSectionCard} space-y-5 overflow-y-auto p-3 lg:sticky lg:top-4 lg:h-[calc(100vh-116px)]`}>
          <div>
            <button
              type="button"
              onClick={() => { setNavMode('categoria'); setActiveCategory(null) }}
              className={navBtnClass(navMode === 'categoria' && activeCategory === null)}
            >
              <Inbox className="w-4 h-4 shrink-0" /> Recebidas
            </button>
            <div className="ml-3 mt-1 space-y-0.5 border-l border-gray-200 dark:border-zinc-800 pl-2">
              {CATEGORY_LABELS.map((label) => (
                <button
                  key={label}
                  type="button"
                  onClick={() => { setNavMode('categoria'); setActiveCategory(label) }}
                  className={navBtnClass(navMode === 'categoria' && activeCategory === label) + ' text-xs py-1.5'}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-0.5 pt-3 border-t border-gray-100 dark:border-zinc-800">
            {BUCKET_ITEMS.map((b) => {
              const Icon = b.icon
              return (
                <button
                  key={b.value}
                  type="button"
                  onClick={() => { setNavMode('bucket'); setActiveBucket(b.value) }}
                  className={navBtnClass(navMode === 'bucket' && activeBucket === b.value)}
                >
                  <Icon className="w-4 h-4 shrink-0" />
                  <span className="flex-1">{b.label}</span>
                  <span className="text-xs text-gray-400 dark:text-zinc-500">{bucketCounts[b.value]}</span>
                </button>
              )
            })}
          </div>
        </nav>

        <div className="min-w-0">
          {loading ? (
            <div className="text-center py-12 text-sm text-gray-400 dark:text-zinc-500">A carregar encomendas...</div>
          ) : visibleGroups.every((g) => g.batches.length === 0) ? (
            <div className={`${panelSectionCard} p-8 text-center text-sm text-gray-500 dark:text-zinc-400`}>
              Nenhuma encomenda encontrada aqui.
            </div>
          ) : (
            <div className="space-y-6">
              {(() => {
                let cardNumber = 0
                return visibleGroups.filter((g) => g.batches.length > 0).map((group) => (
                  <div key={group.label ?? '__bucket'}>
                    {group.label && (
                      <p className="text-xs font-bold uppercase tracking-wide text-gray-400 dark:text-zinc-500 mb-2">
                        {group.label}
                      </p>
                    )}
                    <div className="space-y-3">
                      {group.batches.map((batch) => {
                        cardNumber += 1
                        return (
                          <BatchCard
                            key={batch.batchId}
                            number={cardNumber}
                            batch={batch}
                            isExpanded={expandedBatchId === batch.batchId}
                            onToggle={() => setExpandedBatchId(expandedBatchId === batch.batchId ? null : batch.batchId)}
                            updatingId={updatingId}
                            onUpdateStatus={updateStatus}
                            onUpdateDeliveryDate={updateDeliveryDate}
                          />
                        )
                      })}
                    </div>
                  </div>
                ))
              })()}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

type BatchTab = 'itens' | 'historico' | 'anexos' | 'layouts' | 'empresa' | 'cotacao'

const BATCH_TABS: { id: BatchTab; label: string }[] = [
  { id: 'itens', label: 'Itens da encomenda' },
  { id: 'historico', label: 'Histórico' },
  { id: 'anexos', label: 'Anexos' },
  { id: 'layouts', label: 'Layouts' },
  { id: 'empresa', label: 'Dados da empresa' },
  { id: 'cotacao', label: 'Cotação' },
]

/** Mesma heurística usada no resto do painel para normalizar números moçambicanos para wa.me. */
function phoneToWhatsAppDigits(raw: string): string {
  const digits = raw.replace(/\D/g, '').replace(/^0+/, '')
  if (digits.length === 9) return `258${digits}`
  return digits
}

function BatchCard({
  number,
  batch,
  isExpanded,
  onToggle,
  updatingId,
  onUpdateStatus,
  onUpdateDeliveryDate,
}: {
  number: number
  batch: QuotationBatch<QuotationRequest>
  isExpanded: boolean
  onToggle: () => void
  updatingId: string | null
  onUpdateStatus: (itemId: string, status: QuotationRequest['status']) => void
  onUpdateDeliveryDate: (batchId: string, dataLimiteEntrega: string) => void
}) {
  const [activeTab, setActiveTab] = useState<BatchTab>('itens')
  const [showMessages, setShowMessages] = useState(false)
  const [chatMenuOpen, setChatMenuOpen] = useState(false)
  const [editingDate, setEditingDate] = useState(false)
  const anchor = batch.primaryItem
  const whatsappDigits = phoneToWhatsAppDigits(anchor.telefone || '')
  const whatsappHref = whatsappDigits
    ? `https://wa.me/${whatsappDigits}?text=${encodeURIComponent(`Olá ${anchor.responsavel || ''}, sobre a sua encomenda Nº ${batchNumero(batch.batchId)} (${anchor.empresa}):`)}`
    : null
  const meta = statusMeta(batch.status, batch.sobConsulta)
  const resumo = batch.sobConsulta
    ? 'Pedido personalizado — aguarda contacto'
    : batch.items.length === 1
      ? `${anchor.categoria_label} — ${anchor.produto}`
      : `${batch.items.length} serviços`

  return (
    <div className={panelSectionCard}>
      <button type="button" onClick={onToggle} className="w-full flex flex-col gap-1 p-4 text-left">
        <div className="flex items-center gap-3">
          <span className="shrink-0 text-xs font-bold text-gray-300 dark:text-zinc-600 tabular-nums">
            #{number}
          </span>
          <Building2 className="w-4 h-4 text-gray-400 shrink-0" />
          <span className="min-w-0 truncate font-bold text-gray-900 dark:text-white">{anchor.empresa}</span>
          <span className="shrink-0 rounded border border-gray-200 px-1.5 py-0.5 font-mono text-xs text-gray-500 dark:border-zinc-700 dark:text-zinc-400">
            Nº {batchNumero(batch.batchId)}
          </span>
          <span className="shrink-0 text-sm font-semibold">
            {batch.sobConsulta ? (
              <span className="text-red-600 dark:text-red-500 font-extrabold">Sob Consulta</span>
            ) : (
              <span className="text-gray-700 dark:text-zinc-300">{formatMt(batch.totalMt)} MT</span>
            )}
          </span>
          <span className={`shrink-0 px-2.5 py-1 rounded text-xs font-bold whitespace-nowrap border ${meta.color}`}>
            {meta.label}
          </span>
          <span className="shrink-0 text-xs text-gray-400 dark:text-zinc-500 whitespace-nowrap ml-auto pl-2">
            {new Date(anchor.created_at).toLocaleDateString('pt-PT')}
          </span>
        </div>
        <p className="text-xs text-gray-500 dark:text-zinc-400 truncate">{resumo}</p>
      </button>

      {isExpanded && (
        <div className="border-t border-gray-100 dark:border-zinc-800" onClick={(e) => e.stopPropagation()}>
          <div className={`${panelTabBar} px-4 pt-2`}>
            <div className="flex flex-wrap items-end justify-between gap-3">
              <div className="flex flex-wrap gap-5">
                {BATCH_TABS.map((t) => (
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
              <div className="pb-2.5 shrink-0 flex items-center gap-2 text-sm">
                <Calendar className="w-4 h-4 text-gray-400 shrink-0" />
                {editingDate ? (
                  <input
                    type="date"
                    autoFocus
                    defaultValue={anchor.data_limite_entrega.slice(0, 10)}
                    className={`${panelField} py-1 text-sm`}
                    onBlur={(e) => { onUpdateDeliveryDate(batch.batchId, e.target.value); setEditingDate(false) }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') { onUpdateDeliveryDate(batch.batchId, e.currentTarget.value); setEditingDate(false) }
                      if (e.key === 'Escape') setEditingDate(false)
                    }}
                  />
                ) : (
                  <button
                    type="button"
                    onClick={() => setEditingDate(true)}
                    className="font-bold text-gray-900 dark:text-white hover:underline decoration-dotted underline-offset-2"
                    title="Clique para alterar o prazo"
                  >
                    Entrega até {new Date(anchor.data_limite_entrega).toLocaleDateString('pt-PT')}
                  </button>
                )}
                {(() => {
                  const countdown = deliveryCountdown(anchor.data_limite_entrega)
                  return (
                    <span className={`px-2 py-0.5 rounded text-xs font-bold whitespace-nowrap ${countdown.className}`}>
                      {countdown.label}
                    </span>
                  )
                })()}
              </div>
            </div>
          </div>

          <div className="p-4 text-sm">
            {activeTab === 'itens' && (
              <div className="space-y-4">
                {anchor.notas && (
                  <p className="text-gray-500 dark:text-zinc-400 italic">"{anchor.notas}"</p>
                )}

                <div className="space-y-2">
                  <div className="rounded-lg border border-gray-100 dark:border-zinc-800 overflow-hidden divide-y divide-gray-100 dark:divide-zinc-800">
                    {batch.items.map((item, idx) => {
                      const itemMeta = itemStatusMeta(item.status)
                      return (
                        <div
                          key={item.id}
                          className={`flex items-center gap-3 px-3 py-2.5 ${
                            idx % 2 === 0 ? 'bg-white dark:bg-zinc-900' : 'bg-gray-50 dark:bg-zinc-800/40'
                          }`}
                        >
                          <div className="min-w-0 flex-1">
                            <span className={`text-gray-700 dark:text-zinc-300 ${item.sob_consulta ? 'block whitespace-pre-wrap' : 'block truncate'}`}>
                              {item.categoria_label} — {item.produto} (x{item.quantidade})
                            </span>
                            {item.rejection_reason && (
                              <span className="block truncate text-xs text-rose-600 dark:text-rose-400">Motivo: {item.rejection_reason}</span>
                            )}
                          </div>
                          <span className={`w-24 shrink-0 text-center px-2 py-1 rounded text-[10px] font-bold whitespace-nowrap ${itemMeta.badge}`}>
                            {itemMeta.label}
                          </span>
                          <select
                            className={`${panelField} w-40 shrink-0`}
                            value={item.status}
                            disabled={updatingId === item.id}
                            onChange={(e) => onUpdateStatus(item.id, e.target.value as QuotationRequest['status'])}
                          >
                            {STATUS_OPTIONS.map((s) => (
                              <option key={s.value} value={s.value}>{s.label}</option>
                            ))}
                          </select>
                        </div>
                      )
                    })}
                  </div>
                  <button type="button" onClick={() => setActiveTab('cotacao')} className={panelBtnPrimary + ' mt-1'}>
                    <FileText className="w-3.5 h-3.5" />
                    <span>Ver cotação</span>
                  </button>
                </div>
              </div>
            )}

            {activeTab === 'historico' && <QuotationHistoryTimeline quotationId={anchor.id} />}
            {activeTab === 'anexos' && <QuotationAttachmentsList quotationId={anchor.id} viewerRole="admin" />}
            {activeTab === 'layouts' && <QuotationLayoutsList quotationId={anchor.id} viewerRole="admin" />}

            {activeTab === 'empresa' && (
              <div className="space-y-1.5">
                <p className="text-gray-800 dark:text-zinc-200 font-medium">
                  {anchor.responsavel}{anchor.cargo ? ` — ${anchor.cargo}` : ''}
                </p>
                <p className="text-gray-500 dark:text-zinc-400 flex items-center gap-1.5"><Phone className="w-3.5 h-3.5" /> {anchor.telefone}</p>
                <p className="text-gray-500 dark:text-zinc-400 flex items-center gap-1.5"><Mail className="w-3.5 h-3.5" /> {anchor.email}</p>
                {anchor.nif && <p className="text-gray-500 dark:text-zinc-400">NIF: {anchor.nif}</p>}
              </div>
            )}

            {activeTab === 'cotacao' && (
              <iframe
                key={anchor.id}
                src={`/cotacao/${anchor.id}?embed=1`}
                className="w-full h-[70vh] border-0 rounded-lg"
                title="Cotação"
              />
            )}
          </div>

          {/* Chat: um único ícone flutuante que abre a escolha entre Mensagens (guardadas no
              site) e WhatsApp. O WhatsApp continua a abrir numa aba/app à parte — não há forma
              de incorporar o WhatsApp Web dentro do painel sem uma integração à parte (API
              oficial do WhatsApp Business), isto é só um atalho rápido. */}
          <div className="fixed bottom-6 right-6 z-40 flex flex-col items-end gap-3">
            {showMessages && (
              <div className="w-[min(360px,calc(100vw-3rem))] max-h-[min(480px,calc(100vh-8rem))] flex flex-col rounded-lg border border-gray-200 bg-white shadow-xl dark:border-zinc-700 dark:bg-zinc-900">
                <div className="flex items-center justify-between gap-2 border-b border-gray-100 px-4 py-3 dark:border-zinc-800">
                  <p className="text-sm font-bold text-gray-900 dark:text-white">
                    Mensagens — {anchor.empresa}
                  </p>
                  <button type="button" onClick={() => setShowMessages(false)} className="text-gray-400 hover:text-gray-700 dark:hover:text-zinc-200">
                    <X className="w-4 h-4" />
                  </button>
                </div>
                <div className="flex-1 overflow-y-auto p-3">
                  <QuotationMessagesThread quotationId={anchor.id} viewerRole="admin" />
                </div>
              </div>
            )}

            {chatMenuOpen && !showMessages && (
              <div className="w-48 rounded-lg border border-gray-200 bg-white shadow-xl overflow-hidden dark:border-zinc-700 dark:bg-zinc-900">
                <button
                  type="button"
                  onClick={() => { setShowMessages(true); setChatMenuOpen(false) }}
                  className="flex w-full items-center gap-2 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 dark:text-zinc-300 dark:hover:bg-zinc-800"
                >
                  <MessageCircle className="w-4 h-4 text-red-600" /> Mensagens
                </button>
                {whatsappHref && (
                  <a
                    href={whatsappHref}
                    target="_blank"
                    rel="noreferrer"
                    onClick={() => setChatMenuOpen(false)}
                    className="flex w-full items-center gap-2 border-t border-gray-100 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 dark:border-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-800"
                  >
                    <span className="text-base leading-none">📱</span> WhatsApp
                  </a>
                )}
              </div>
            )}

            <button
              type="button"
              title="Chat"
              onClick={() => {
                if (showMessages) { setShowMessages(false); return }
                setChatMenuOpen((v) => !v)
              }}
              className="flex h-12 w-12 items-center justify-center rounded-full bg-red-600 text-white shadow-lg transition-transform hover:scale-105 hover:bg-red-700"
            >
              {showMessages ? <X className="w-5 h-5" /> : <MessageCircle className="w-5 h-5" />}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
