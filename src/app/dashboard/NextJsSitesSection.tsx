'use client'

import { useEffect, useMemo, useState } from 'react'
import { RefreshCw, Plus, MoreVertical, X, ExternalLink, Cpu, CheckCircle2, XCircle } from 'lucide-react'
import { useAdminSectionChrome } from '@/components/admin/AdminSectionChrome'
import { Spinner } from '@/components/ui/spinner'
import { panelBtnPrimary, panelBtnSecondary, panelField, panelSectionCard, panelMobileCardGrid } from '@/lib/panel-ui'
import type { DirectAdminWebsite } from '@/lib/directadmin-api'

interface NextJsSiteRow {
  id: string
  domain: string
  name: string | null
  hostingNote: string | null
  adminUrl: string | null
  pm2ProcessName: string | null
  notes: string | null
  createdAt: string
  updatedAt: string
}

interface Pm2Process {
  name: string
  status: string
  cpu: number
  memoryMb: number
  uptimeMs: number | null
  restarts: number
}

type HealthState = { dns: boolean; server: boolean; ssl: boolean } | 'loading' | 'error'

const emptyForm = {
  id: '',
  domain: '',
  name: '',
  hostingNote: '',
  adminUrl: '',
  pm2ProcessName: '',
  notes: '',
}

function formatUptime(ms: number | null): string {
  if (!ms || ms <= 0) return '—'
  const mins = Math.floor(ms / 60000)
  if (mins < 60) return `${mins}m`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}h`
  return `${Math.floor(hours / 24)}d`
}

export function NextJsSitesSection({
  sites,
  onNavigate,
}: {
  sites: DirectAdminWebsite[]
  onNavigate: (section: string, opts?: { domain?: string }) => void
}) {
  const [rows, setRows] = useState<NextJsSiteRow[]>([])
  const [loading, setLoading] = useState(true)
  const [processes, setProcesses] = useState<Pm2Process[]>([])
  const [health, setHealth] = useState<Record<string, HealthState>>({})
  const [openMenuId, setOpenMenuId] = useState<string | null>(null)
  const [form, setForm] = useState<typeof emptyForm | null>(null)
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState('')

  const ownerByDomain = useMemo(() => {
    const map = new Map<string, string>()
    for (const s of sites) {
      if (s.domain) map.set(s.domain.toLowerCase(), (s.owner || 'admin').toLowerCase())
    }
    return map
  }, [sites])

  const loadSites = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/nextjs-sites', { cache: 'no-store' })
      const data = await res.json()
      if (data.success) setRows(data.sites)
    } catch (e) {
      console.error('Erro ao carregar sites Next.js:', e)
    } finally {
      setLoading(false)
    }
  }

  const loadProcesses = async () => {
    try {
      const res = await fetch('/api/server-exec', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'pm2ProcessList' }),
      })
      const data = await res.json()
      if (data.success) setProcesses(data.data.processes)
    } catch (e) {
      console.error('Erro ao carregar processos PM2:', e)
    }
  }

  const checkHealth = async (domain: string) => {
    setHealth((prev) => ({ ...prev, [domain]: 'loading' }))
    try {
      const res = await fetch(`/api/registrar/domain/health?domain=${encodeURIComponent(domain)}`)
      const data = await res.json()
      if (!data.success) throw new Error(data.error || 'Falha')
      setHealth((prev) => ({
        ...prev,
        [domain]: { dns: data.dns.ok, server: data.server.ok, ssl: data.ssl.ok },
      }))
    } catch {
      setHealth((prev) => ({ ...prev, [domain]: 'error' }))
    }
  }

  useEffect(() => {
    void loadSites()
    void loadProcesses()
  }, [])

  useEffect(() => {
    for (const row of rows) {
      if (!health[row.domain]) void checkHealth(row.domain)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rows])

  const { setChrome } = useAdminSectionChrome()
  useEffect(() => {
    setChrome({
      toolbar: (
        <div className="flex items-center gap-2">
          <button className={panelBtnSecondary} onClick={() => { void loadSites(); void loadProcesses() }} disabled={loading}>
            {loading ? <Spinner className="w-4 h-4" /> : <RefreshCw className="w-4 h-4" />}
            <span>Actualizar</span>
          </button>
          <button className={panelBtnPrimary} onClick={() => { setFormError(''); setForm(emptyForm) }}>
            <Plus className="w-4 h-4" />
            <span>Adicionar site</span>
          </button>
        </div>
      ),
    })
    return () => setChrome(null)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading])

  const maxCpu = useMemo(
    () => Math.max(1, ...processes.map((p) => p.cpu)),
    [processes],
  )

  const closeForm = () => setForm(null)

  const submitForm = async () => {
    if (!form) return
    const domain = form.domain.trim().toLowerCase()
    if (!domain) {
      setFormError('Domínio obrigatório.')
      return
    }
    setSaving(true)
    setFormError('')
    try {
      const isEdit = Boolean(form.id)
      const res = await fetch('/api/nextjs-sites', {
        method: isEdit ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: form.id || undefined,
          domain,
          name: form.name.trim() || null,
          hostingNote: form.hostingNote.trim() || null,
          adminUrl: form.adminUrl.trim() || null,
          pm2ProcessName: form.pm2ProcessName.trim() || null,
          notes: form.notes.trim() || null,
        }),
      })
      const data = await res.json()
      if (!res.ok || !data.success) throw new Error(data.error || 'Falha ao guardar')
      closeForm()
      await loadSites()
    } catch (e: unknown) {
      setFormError(e instanceof Error ? e.message : 'Erro ao guardar')
    } finally {
      setSaving(false)
    }
  }

  const removeSite = async (row: NextJsSiteRow) => {
    if (!window.confirm(`Remover "${row.domain}" do registo? Isto não afecta o site em si.`)) return
    try {
      const res = await fetch(`/api/nextjs-sites?id=${encodeURIComponent(row.id)}`, { method: 'DELETE' })
      const data = await res.json()
      if (!data.success) throw new Error(data.error || 'Falha ao remover')
      setRows((prev) => prev.filter((r) => r.id !== row.id))
    } catch (e) {
      console.error('Erro ao remover site:', e)
    }
  }

  return (
    <div className="space-y-4">
      {loading && rows.length === 0 ? (
        <div className="text-center py-12 text-sm text-gray-400 dark:text-zinc-500">A carregar sites...</div>
      ) : rows.length === 0 ? (
        <div className={`${panelSectionCard} p-8 text-center text-sm text-gray-500 dark:text-zinc-400`}>
          Ainda não há sites Next.js registados.
        </div>
      ) : (
        <div className={panelMobileCardGrid}>
          {rows.map((row) => {
            const proc = row.pm2ProcessName
              ? processes.find((p) => p.name === row.pm2ProcessName)
              : undefined
            const cpuPct = proc ? Math.round((proc.cpu / maxCpu) * 100) : null
            const owner = ownerByDomain.get(row.domain)
            const h = health[row.domain]

            return (
              <div key={row.id} className={`${panelSectionCard} p-4 space-y-3`}>
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="font-bold text-sm text-gray-900 dark:text-white truncate">
                      {row.name || row.domain}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-zinc-400 truncate">{row.domain}</p>
                  </div>
                  <div className="relative shrink-0">
                    <button
                      type="button"
                      onClick={() => setOpenMenuId(openMenuId === row.id ? null : row.id)}
                      className="rounded p-1.5 text-zinc-500 hover:bg-gray-100 dark:hover:bg-zinc-800"
                      aria-label="Mais opções"
                    >
                      <MoreVertical className="w-4 h-4" />
                    </button>
                    {openMenuId === row.id && (
                      <div className="absolute right-0 top-full z-20 mt-1 w-56 rounded border border-gray-200 bg-white py-1 text-xs shadow-lg dark:border-zinc-700 dark:bg-zinc-900">
                        <button
                          type="button"
                          className="block w-full px-3 py-2 text-left text-gray-700 hover:text-red-600 dark:text-zinc-300 dark:hover:text-red-400"
                          onClick={() => {
                            setOpenMenuId(null)
                            setFormError('')
                            setForm({
                              id: row.id,
                              domain: row.domain,
                              name: row.name || '',
                              hostingNote: row.hostingNote || '',
                              adminUrl: row.adminUrl || '',
                              pm2ProcessName: row.pm2ProcessName || '',
                              notes: row.notes || '',
                            })
                          }}
                        >
                          Editar
                        </button>
                        {owner && (
                          <>
                            <button
                              type="button"
                              className="block w-full px-3 py-2 text-left text-gray-700 hover:text-red-600 dark:text-zinc-300 dark:hover:text-red-400"
                              onClick={() => { setOpenMenuId(null); onNavigate('dns-central', { domain: row.domain }) }}
                            >
                              Gerir DNS
                            </button>
                            <button
                              type="button"
                              className="block w-full px-3 py-2 text-left text-gray-700 hover:text-red-600 dark:text-zinc-300 dark:hover:text-red-400"
                              onClick={() => { setOpenMenuId(null); onNavigate('cp-dns-nameserver', { domain: row.domain }) }}
                            >
                              Nameservers
                            </button>
                            <a
                              href={`/api/directadmin-access?user=${encodeURIComponent(owner)}`}
                              className="block w-full px-3 py-2 text-left text-gray-700 hover:text-red-600 dark:text-zinc-300 dark:hover:text-red-400"
                              onClick={() => setOpenMenuId(null)}
                            >
                              Abrir no DirectAdmin
                            </a>
                          </>
                        )}
                        <button
                          type="button"
                          className="block w-full px-3 py-2 text-left text-rose-600 hover:text-rose-700 dark:text-rose-400"
                          onClick={() => { setOpenMenuId(null); void removeSite(row) }}
                        >
                          Remover
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2 text-xs">
                  {h === 'loading' || h === undefined ? (
                    <span className="inline-flex items-center gap-1 rounded bg-gray-100 px-2 py-0.5 font-bold text-gray-500 dark:bg-zinc-800 dark:text-zinc-400">
                      <Spinner className="w-3 h-3" /> A verificar
                    </span>
                  ) : h === 'error' || !h.server ? (
                    <span className="inline-flex items-center gap-1 rounded bg-red-100 px-2 py-0.5 font-bold text-red-700 dark:bg-red-950/30 dark:text-red-400">
                      <XCircle className="w-3 h-3" /> Offline
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 rounded bg-green-100 px-2 py-0.5 font-bold text-green-700 dark:bg-green-950/30 dark:text-green-400">
                      <CheckCircle2 className="w-3 h-3" /> Online
                    </span>
                  )}
                  {row.hostingNote && (
                    <span className="truncate text-gray-500 dark:text-zinc-400">{row.hostingNote}</span>
                  )}
                </div>

                {proc && (
                  <div className="space-y-1">
                    <div className="flex items-center justify-between text-xs text-gray-500 dark:text-zinc-400">
                      <span className="inline-flex items-center gap-1"><Cpu className="w-3 h-3" /> CPU (vs. outros sites)</span>
                      <span className="font-bold text-gray-700 dark:text-zinc-300">{proc.cpu}%</span>
                    </div>
                    <div className="h-1.5 w-full rounded-full bg-gray-100 dark:bg-zinc-800">
                      <div
                        className="h-1.5 rounded-full bg-red-500"
                        style={{ width: `${Math.max(2, cpuPct || 0)}%` }}
                      />
                    </div>
                    <div className="flex items-center justify-between text-xs text-gray-500 dark:text-zinc-400">
                      <span>{proc.memoryMb} MB · {proc.restarts} restarts</span>
                      <span>{formatUptime(proc.uptimeMs)}</span>
                    </div>
                  </div>
                )}

                {row.adminUrl && (
                  <a
                    href={row.adminUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={`${panelBtnSecondary} w-full`}
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    <span>Aceder ao backend</span>
                  </a>
                )}
              </div>
            )
          })}
        </div>
      )}

      {form && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60" onClick={closeForm} />
          <div className="relative w-full max-w-lg rounded-lg border border-gray-200 bg-white shadow-2xl dark:border-zinc-800 dark:bg-zinc-900">
            <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4 dark:border-zinc-800">
              <h2 className="text-sm font-bold text-gray-900 dark:text-white">
                {form.id ? 'Editar site Next.js' : 'Adicionar site Next.js'}
              </h2>
              <button onClick={closeForm} className="rounded p-1 text-gray-400 hover:bg-gray-100 dark:hover:bg-zinc-800">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="space-y-3 p-5">
              <div className="space-y-1">
                <label className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Domínio</label>
                <input
                  value={form.domain}
                  onChange={(e) => setForm({ ...form, domain: e.target.value })}
                  placeholder="visualdesignmoz.com"
                  disabled={Boolean(form.id)}
                  className={`${panelField} w-full disabled:opacity-60`}
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Nome</label>
                <input
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="Visual Design"
                  className={`${panelField} w-full`}
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Onde está alojado</label>
                <input
                  value={form.hostingNote}
                  onChange={(e) => setForm({ ...form, hostingNote: e.target.value })}
                  placeholder="Hetzner — mesmo servidor / Vercel / outro"
                  className={`${panelField} w-full`}
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold uppercase tracking-widest text-gray-400">
                  Nome do processo PM2 (opcional — só sites no Hetzner)
                </label>
                <input
                  value={form.pm2ProcessName}
                  onChange={(e) => setForm({ ...form, pm2ProcessName: e.target.value })}
                  placeholder="visualdesign-site"
                  className={`${panelField} w-full`}
                />
                <p className="text-[10px] italic text-gray-400">
                  Activa a comparação de CPU/memória entre sites (vem de <code>pm2 list</code> no servidor).
                </p>
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Link do backend/admin</label>
                <input
                  value={form.adminUrl}
                  onChange={(e) => setForm({ ...form, adminUrl: e.target.value })}
                  placeholder="https://visualdesignmoz.com/dashboard"
                  className={`${panelField} w-full`}
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Notas</label>
                <textarea
                  value={form.notes}
                  onChange={(e) => setForm({ ...form, notes: e.target.value })}
                  rows={2}
                  className={`${panelField} w-full !h-auto py-2`}
                />
              </div>
              {formError && <p className="text-xs font-medium text-rose-600">{formError}</p>}
            </div>
            <div className="flex items-center justify-end gap-2 border-t border-gray-100 px-5 py-4 dark:border-zinc-800">
              <button className={panelBtnSecondary} onClick={closeForm} disabled={saving}>Cancelar</button>
              <button className={panelBtnPrimary} onClick={() => void submitForm()} disabled={saving}>
                {saving ? <Spinner className="w-4 h-4" /> : null}
                <span>Guardar</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
