'use client'

import { useEffect, useState } from 'react'
import { AlertTriangle, RefreshCw } from 'lucide-react'
import { panelBtnPrimary, panelBtnSecondary, panelField } from '@/lib/panel-ui'
import { Spinner } from '@/components/ui/spinner'
import { parseJsonResponse } from '@/lib/safe-fetch-json'
import { readListCache, writeListCache } from '@/lib/panel-list-cache'

const CACHE_KEY = 'vd_hosting_pending_v1'

type PendingHosting = {
  id: string
  user_id: string
  user_email?: string
  package_name: string
  start_date: string
  expiration_date: string
  renewal_price: number
  currency: string
  notes?: string
}

const DOMAIN_REGEX = /^(?=.{1,253}$)([a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,}$/

export function HostingPendingSection() {
  const [items, setItems] = useState<PendingHosting[]>(() => readListCache<PendingHosting[]>(CACHE_KEY) ?? [])
  const [loading, setLoading] = useState(() => readListCache<PendingHosting[]>(CACHE_KEY) === null)
  const [domainDrafts, setDomainDrafts] = useState<Record<string, string>>({})
  const [submitting, setSubmitting] = useState<Record<string, boolean>>({})
  const [rowMsg, setRowMsg] = useState<Record<string, { text: string; error: boolean }>>({})

  const load = async () => {
    try {
      const res = await fetch('/api/admin/hosting-pending', { credentials: 'include' })
      const data = await parseJsonResponse<{ success?: boolean; pending?: PendingHosting[] }>(res)
      if (data.success && Array.isArray(data.pending)) {
        setItems(data.pending)
        writeListCache(CACHE_KEY, data.pending)
      }
    } catch {
      /* mantém lista actual */
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void load()
  }, [])

  const handleComplete = async (item: PendingHosting) => {
    const domain = (domainDrafts[item.id] || '').toLowerCase().trim()
    if (!DOMAIN_REGEX.test(domain)) {
      setRowMsg((m) => ({ ...m, [item.id]: { text: 'Domínio inválido — usa o formato exemplo.com', error: true } }))
      return
    }
    setSubmitting((s) => ({ ...s, [item.id]: true }))
    setRowMsg((m) => ({ ...m, [item.id]: { text: '', error: false } }))
    try {
      const res = await fetch('/api/admin/hosting-pending', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ renewalId: item.id, domain }),
      })
      const data = await parseJsonResponse<{ success?: boolean; message?: string; error?: string }>(res)
      if (data.success) {
        setRowMsg((m) => ({ ...m, [item.id]: { text: data.message || 'Concluído.', error: false } }))
        setItems((prev) => prev.filter((p) => p.id !== item.id))
      } else {
        setRowMsg((m) => ({ ...m, [item.id]: { text: data.error || 'Falha ao concluir', error: true } }))
      }
    } catch (e: any) {
      setRowMsg((m) => ({ ...m, [item.id]: { text: 'Erro: ' + e.message, error: true } }))
    } finally {
      setSubmitting((s) => ({ ...s, [item.id]: false }))
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-gray-900 dark:text-zinc-100">Hospedagens pendentes</h2>
          <p className="text-sm text-gray-500 dark:text-zinc-400">
            Compras de hospedagem pagas que chegaram sem um domínio de destino válido (#6) e ficaram à espera de um
            administrador as associar a um domínio. Isto não mexe em domínios já activos — ver "Mover contas" para isso.
          </p>
        </div>
        <button type="button" onClick={() => void load()} className={panelBtnSecondary}>
          <RefreshCw className="h-4 w-4" />
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center py-10">
          <Spinner />
        </div>
      ) : items.length === 0 ? (
        <div className="rounded border border-gray-200 bg-white p-6 text-center text-sm text-gray-500 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-400">
          Não há hospedagens pendentes sem domínio.
        </div>
      ) : (
        <div className="space-y-3">
          {items.map((item) => (
            <div
              key={item.id}
              className="rounded border border-amber-200 bg-amber-50 p-4 dark:border-amber-900/50 dark:bg-amber-950/20"
            >
              <div className="flex items-start gap-2">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-gray-900 dark:text-zinc-100">
                    {item.user_email || item.user_id}
                  </p>
                  <p className="text-xs text-gray-600 dark:text-zinc-400">
                    Pacote {item.package_name || '—'} · Comprado em {item.start_date} · {item.renewal_price}{' '}
                    {item.currency}
                    {item.notes ? ` · ${item.notes}` : ''}
                  </p>
                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    <input
                      value={domainDrafts[item.id] || ''}
                      onChange={(e) => setDomainDrafts((d) => ({ ...d, [item.id]: e.target.value }))}
                      placeholder="dominio-do-cliente.com"
                      className={`${panelField} w-64`}
                      disabled={submitting[item.id]}
                    />
                    <button
                      type="button"
                      onClick={() => void handleComplete(item)}
                      disabled={submitting[item.id] || !(domainDrafts[item.id] || '').trim()}
                      className={`${panelBtnPrimary} !h-[38px]`}
                    >
                      {submitting[item.id] ? 'A concluir…' : 'Concluir hospedagem'}
                    </button>
                  </div>
                  {rowMsg[item.id]?.text && (
                    <p className={`mt-2 text-xs ${rowMsg[item.id].error ? 'text-red-600' : 'text-green-700'}`}>
                      {rowMsg[item.id].text}
                    </p>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
