'use client'

import { useEffect, useState } from 'react'
import {
  Globe, Server, Cloud, LockOpen, RefreshCw, Key, Copy, Calendar,
  Mail, ExternalLink, Trash2, CheckCircle, XCircle, ShieldCheck,
} from 'lucide-react'
import { Spinner } from '@/components/ui/spinner'
import { panelBtnPrimary, panelBtnSecondary } from '@/lib/panel-ui'
import type { DirectAdminWebsite } from '@/lib/directadmin-api'

type RegistrarInfo = {
  isLocked: boolean | null
  autoRenew: boolean | null
  expireDate: string
  status: string
}

type HealthCheck = { ok: boolean; detail: string }
type HealthResult = { dns: HealthCheck; server: HealthCheck; ssl: HealthCheck } | null

type RenewalInfo = {
  registrationDate?: string
  expirationDate?: string
  renewalPrice?: number
  currency?: string
} | null

interface Props {
  domain: string
  sites: DirectAdminWebsite[]
  onNavigate?: (section: string, opts?: { domain?: string }) => void
  onRefresh?: () => void | Promise<void>
  setActiveSection?: (section: string) => void
}

const getDaysUntilExpiration = (dateStr: string): number | null => {
  const exp = new Date(dateStr)
  if (Number.isNaN(exp.getTime())) return null
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  exp.setHours(0, 0, 0, 0)
  return Math.ceil((exp.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
}

const formatDateLabel = (dateStr?: string): string => {
  if (!dateStr) return '—'
  const parsed = new Date(dateStr)
  if (Number.isNaN(parsed.getTime())) return dateStr
  return parsed.toLocaleDateString('pt-PT')
}

export function DomainDetailSection({ domain, sites, onNavigate, onRefresh, setActiveSection }: Props) {
  const site = sites.find((s) => s.domain?.toLowerCase() === domain?.toLowerCase())
  const isHostingActive = (site?.state || site?.status || 'Active') !== 'Suspended'

  const [msg, setMsg] = useState('')
  const [msgType, setMsgType] = useState<'success' | 'error'>('success')
  const showMsg = (text: string, type: 'success' | 'error' = 'success') => {
    setMsg(text)
    setMsgType(type)
    setTimeout(() => setMsg(''), 4000)
  }

  const [registrarLoading, setRegistrarLoading] = useState(false)
  const [registrar, setRegistrar] = useState<RegistrarInfo>({ isLocked: null, autoRenew: null, expireDate: '', status: '' })
  const [authCode, setAuthCode] = useState('')
  const [authCodeExpires, setAuthCodeExpires] = useState('')

  const [healthLoading, setHealthLoading] = useState(false)
  const [health, setHealth] = useState<HealthResult>(null)

  const [renewal, setRenewal] = useState<RenewalInfo>(null)

  const loadRegistrarInfo = async () => {
    if (!domain) return
    setRegistrarLoading(true)
    try {
      const res = await fetch(`/api/registrar/domain/manage?domain=${encodeURIComponent(domain)}`, {
        credentials: 'include',
      })
      const data = await res.json().catch(() => ({}))
      if (data.success) {
        setRegistrar({
          isLocked: typeof data.isLocked === 'boolean' ? data.isLocked : null,
          autoRenew: typeof data.autoRenew === 'boolean' ? data.autoRenew : null,
          expireDate: data.expireDate || '',
          status: data.status || '',
        })
      }
    } catch {
      /* domínio pode ser só de hospedagem, sem registo neste registador */
    } finally {
      setRegistrarLoading(false)
    }
  }

  const loadHealth = async () => {
    if (!domain) return
    setHealthLoading(true)
    try {
      const res = await fetch(`/api/registrar/domain/health?domain=${encodeURIComponent(domain)}`, {
        credentials: 'include',
      })
      const data = await res.json().catch(() => ({}))
      if (data.success) {
        setHealth({ dns: data.dns, server: data.server, ssl: data.ssl })
      } else {
        setHealth(null)
      }
    } catch {
      setHealth(null)
    } finally {
      setHealthLoading(false)
    }
  }

  const loadRenewalInfo = async () => {
    if (!domain) return
    try {
      const res = await fetch('/api/renewals?type=domain', { credentials: 'include' })
      const data = await res.json().catch(() => ({}))
      if (data.success) {
        const row = (data.domains || []).find(
          (r: { domain_name?: string }) => r.domain_name?.toLowerCase() === domain.toLowerCase(),
        )
        if (row) {
          setRenewal({
            registrationDate: row.registration_date,
            expirationDate: row.expiration_date,
            renewalPrice: row.renewal_price,
            currency: row.currency,
          })
        }
      }
    } catch {
      /* sem dados de renovação para este domínio */
    }
  }

  useEffect(() => {
    setRegistrar({ isLocked: null, autoRenew: null, expireDate: '', status: '' })
    setAuthCode('')
    setAuthCodeExpires('')
    setHealth(null)
    setRenewal(null)
    void loadRegistrarInfo()
    void loadHealth()
    void loadRenewalInfo()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [domain])

  const handleUnlockTransfer = async () => {
    setRegistrarLoading(true)
    try {
      const res = await fetch('/api/registrar/domain/manage', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ domain, action: 'unlock' }),
      })
      const data = await res.json()
      if (data.success) {
        setRegistrar((prev) => ({ ...prev, isLocked: false }))
        showMsg(data.message || 'Domínio desbloqueado para transferência.')
      } else {
        showMsg(data.error || 'Erro ao desbloquear', 'error')
      }
    } catch (e: unknown) {
      showMsg(e instanceof Error ? e.message : 'Erro de ligação', 'error')
    } finally {
      setRegistrarLoading(false)
    }
  }

  const handleFetchAuthCode = async () => {
    setRegistrarLoading(true)
    try {
      const res = await fetch('/api/registrar/domain/manage', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ domain, action: 'auth-code' }),
      })
      const data = await res.json()
      if (data.success && data.authCode) {
        setAuthCode(data.authCode)
        setAuthCodeExpires(data.expires || '')
        showMsg(data.message || 'Código obtido.')
      } else {
        showMsg(data.error || 'Erro ao obter código', 'error')
      }
    } catch (e: unknown) {
      showMsg(e instanceof Error ? e.message : 'Erro de ligação', 'error')
    } finally {
      setRegistrarLoading(false)
    }
  }

  const handleToggleAutoRenew = async () => {
    if (registrar.autoRenew === null) return
    const next = !registrar.autoRenew
    setRegistrarLoading(true)
    try {
      const res = await fetch('/api/registrar/domain/manage', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ domain, action: 'autorenew', isEnabled: next }),
      })
      const data = await res.json()
      if (data.success) {
        setRegistrar((prev) => ({ ...prev, autoRenew: next }))
        showMsg(data.message || (next ? 'Renovação automática activada.' : 'Renovação automática desactivada.'))
      } else {
        showMsg(data.error || 'Erro ao actualizar renovação automática', 'error')
      }
    } catch (e: unknown) {
      showMsg(e instanceof Error ? e.message : 'Erro de ligação', 'error')
    } finally {
      setRegistrarLoading(false)
    }
  }

  const handleRemoveHosting = async () => {
    if (!confirm(`Eliminar "${domain}"? Esta acção é irreversível!`)) return
    try {
      const res = await fetch('/api/server-exec', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'deleteWebsite', params: { domain } }),
      })
      const data = await res.json()
      if (data.success) {
        showMsg(`Domínio "${domain}" eliminado.`)
        await onRefresh?.()
        setActiveSection?.('domain-manager')
      } else {
        showMsg('Erro: ' + (data.error || data.data?.error || 'Falha ao eliminar'), 'error')
      }
    } catch (e: unknown) {
      showMsg(e instanceof Error ? e.message : 'Erro de ligação', 'error')
    }
  }

  if (!domain) {
    return (
      <div className="p-6 text-center text-sm text-gray-500 dark:text-zinc-400">
        Nenhum domínio seleccionado.
      </div>
    )
  }

  const expireDate = registrar.expireDate || renewal?.expirationDate || ''
  const daysRemaining = expireDate ? getDaysUntilExpiration(expireDate) : null
  const allHealthy = health ? health.dns.ok && health.server.ok && health.ssl.ok : false

  return (
    <div className="w-full space-y-5 p-5">
      {msg && (
        <div
          className={`rounded border px-4 py-2.5 text-sm font-medium ${
            msgType === 'success'
              ? 'border-gray-200 bg-gray-50 text-gray-700 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300'
              : 'border-red-200 bg-red-50 text-red-700 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-400'
          }`}
        >
          {msg}
        </div>
      )}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-green-50 rounded-lg dark:bg-green-950/40">
            <Globe className="w-5 h-5 text-green-600 dark:text-green-400" />
          </div>
          <h2 className="text-lg font-bold text-gray-900 dark:text-zinc-100">{domain}</h2>
        </div>
        <span
          className={`px-3 py-1 rounded text-xs font-bold uppercase tracking-wider ${
            isHostingActive
              ? 'bg-green-100 text-green-700 dark:bg-green-950/50 dark:text-green-400'
              : 'bg-red-100 text-red-700 dark:bg-red-950/50 dark:text-red-400'
          }`}
        >
          Status: {isHostingActive ? 'Activo' : 'Suspenso'}
        </span>
      </div>

      <div className="grid w-full grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          <div className="rounded border border-gray-200 bg-white p-5 dark:border-zinc-700 dark:bg-zinc-900">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              <div className="rounded border border-gray-100 bg-gray-50 p-3 dark:border-zinc-800 dark:bg-zinc-950">
                <p className="text-xs text-gray-500 dark:text-zinc-400">Data de Registo</p>
                <p className="mt-1 flex items-center gap-1.5 text-sm font-bold text-gray-900 dark:text-zinc-100">
                  <Calendar className="h-4 w-4 text-gray-400" />
                  {formatDateLabel(renewal?.registrationDate)}
                </p>
              </div>
              <div className="rounded border border-gray-100 bg-gray-50 p-3 dark:border-zinc-800 dark:bg-zinc-950">
                <p className="text-xs text-gray-500 dark:text-zinc-400">Próximo Vencimento</p>
                <p className="mt-1 flex items-center gap-1.5 text-sm font-bold text-gray-900 dark:text-zinc-100">
                  <Calendar className="h-4 w-4 text-red-400" />
                  {formatDateLabel(expireDate)}
                </p>
                {daysRemaining !== null && (
                  <p className="mt-0.5 text-xs text-red-500">{daysRemaining} dias restantes</p>
                )}
              </div>
              <div className="rounded border border-gray-100 bg-gray-50 p-3 dark:border-zinc-800 dark:bg-zinc-950">
                <p className="text-xs text-gray-500 dark:text-zinc-400">Valor Reincidente</p>
                <p className="mt-1 text-sm font-bold text-gray-900 dark:text-zinc-100">
                  {renewal?.renewalPrice ? `${renewal.currency || 'MT'} ${renewal.renewalPrice.toFixed(2)}` : '—'}
                </p>
              </div>
            </div>
          </div>

          <div className="rounded border border-gray-200 bg-white p-5 dark:border-zinc-700 dark:bg-zinc-900">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-bold text-gray-900 dark:text-zinc-100">Diagnóstico de conectividade</h3>
              <button
                type="button"
                onClick={() => void loadHealth()}
                disabled={healthLoading}
                className="flex items-center gap-1.5 text-xs font-bold text-gray-600 hover:text-red-600 disabled:opacity-50 dark:text-zinc-400 dark:hover:text-red-400"
              >
                {healthLoading ? <Spinner className="h-3.5 w-3.5" /> : <RefreshCw className="h-3.5 w-3.5" />}
                Reavaliar
              </button>
            </div>

            {healthLoading && !health ? (
              <div className="py-6 text-center">
                <Spinner className="mx-auto h-6 w-6" />
              </div>
            ) : health ? (
              <>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                  {[
                    { key: 'dns', label: 'Mapeamento DNS', ok: health.dns.ok, detail: health.dns.ok ? 'Resolvendo' : health.dns.detail },
                    { key: 'server', label: 'Resposta do Servidor', ok: health.server.ok, detail: health.server.ok ? 'Activo / Responde' : health.server.detail },
                    { key: 'ssl', label: 'Criptografia SSL', ok: health.ssl.ok, detail: health.ssl.ok ? 'Configurado' : health.ssl.detail },
                  ].map((row) => (
                    <div key={row.key} className="flex items-center gap-2.5 rounded border border-gray-100 p-3 dark:border-zinc-800">
                      {row.ok ? (
                        <CheckCircle className="h-4 w-4 shrink-0 text-green-600 dark:text-green-400" />
                      ) : (
                        <XCircle className="h-4 w-4 shrink-0 text-red-500" />
                      )}
                      <div className="min-w-0">
                        <p className="text-xs text-gray-500 dark:text-zinc-400">{row.label}</p>
                        <p className={`truncate text-xs font-bold ${row.ok ? 'text-green-700 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                          {row.detail}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
                <div
                  className={`mt-3 rounded px-4 py-2.5 text-sm font-medium ${
                    allHealthy
                      ? 'bg-green-50 text-green-700 dark:bg-green-950/30 dark:text-green-400'
                      : 'bg-amber-50 text-amber-700 dark:bg-amber-950/30 dark:text-amber-400'
                  }`}
                >
                  {allHealthy
                    ? `Tudo certo! O domínio ${domain} passou em todos os testes de conectividade (DNS, HTTP e criptografia SSL).`
                    : 'Foram encontrados problemas de conectividade — reveja os testes acima.'}
                </div>
              </>
            ) : (
              <p className="text-sm text-gray-400 dark:text-zinc-500">Não foi possível avaliar a conectividade agora.</p>
            )}
          </div>

          {registrar.isLocked !== null && (
            <div className="rounded border border-gray-200 bg-white p-5 dark:border-zinc-700 dark:bg-zinc-900">
              <p className="mb-4 text-xs text-gray-500 dark:text-zinc-500">Gestão de registo e transferência</p>

              <div className="rounded border border-gray-100 p-4 dark:border-zinc-800">
                <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <p className="text-sm font-medium text-gray-900 dark:text-zinc-100">Bloqueio de transferência</p>
                    <p className="text-xs text-gray-500 dark:text-zinc-500">
                      {registrar.isLocked ? 'Bloqueado — desbloqueie antes de transferir' : 'Desbloqueado — pronto para transferência'}
                    </p>
                  </div>
                  {registrar.isLocked !== false && (
                    <button type="button" onClick={() => void handleUnlockTransfer()} disabled={registrarLoading} className={panelBtnPrimary}>
                      {registrarLoading ? <Spinner className="h-4 w-4" /> : <LockOpen className="h-4 w-4" />}
                      Desbloquear
                    </button>
                  )}
                </div>
              </div>

              <div className="mt-4 rounded border border-gray-100 p-4 dark:border-zinc-800">
                <p className="mb-2 text-sm font-medium text-gray-900 dark:text-zinc-100">Código de transferência (EPP)</p>
                <p className="mb-3 text-xs text-gray-500 dark:text-zinc-500">
                  Obtenha o código sem sair desta página e use-o no novo registador.
                </p>
                <div className="flex flex-wrap items-center gap-2">
                  <button type="button" onClick={() => void handleFetchAuthCode()} disabled={registrarLoading} className={panelBtnPrimary}>
                    {registrarLoading ? <Spinner className="h-4 w-4" /> : <Key className="h-4 w-4" />}
                    Obter código
                  </button>
                  {authCode && (
                    <button
                      type="button"
                      onClick={() => {
                        void navigator.clipboard.writeText(authCode)
                        showMsg('Código copiado.')
                      }}
                      className={panelBtnSecondary}
                    >
                      <Copy className="h-4 w-4" /> Copiar
                    </button>
                  )}
                </div>
                {authCode && (
                  <div className="mt-3 rounded border border-gray-200 bg-gray-50 px-3 py-2 font-mono text-sm text-gray-800 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-200">
                    {authCode}
                    {authCodeExpires && (
                      <p className="mt-1 font-sans text-xs text-gray-500 dark:text-zinc-500">
                        Expira: {new Date(authCodeExpires).toLocaleString('pt-PT')}
                      </p>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}

          {site && (
            <div className="rounded border border-gray-200 bg-white p-4 dark:border-zinc-700 dark:bg-zinc-900">
              <p className="mb-3 text-xs font-bold uppercase text-gray-500 dark:text-zinc-500">Zona perigosa</p>
              <button
                type="button"
                onClick={() => void handleRemoveHosting()}
                className={`${panelBtnSecondary} border-red-300 text-red-600 hover:text-red-600 dark:border-red-800 dark:text-red-400`}
              >
                <Trash2 className="h-4 w-4" /> Eliminar domínio de hospedagem
              </button>
            </div>
          )}
        </div>

        <div className="space-y-4">
          <div className="rounded border border-gray-200 bg-white dark:border-zinc-700 dark:bg-zinc-900">
            <div className="border-b border-gray-100 px-4 py-3 dark:border-zinc-800">
              <h3 className="text-xs font-bold uppercase text-gray-500 dark:text-zinc-500">Acções</h3>
            </div>
            <div className="divide-y divide-gray-100 dark:divide-zinc-800">
              <button
                type="button"
                onClick={() => onNavigate?.('dns-central', { domain })}
                className="flex w-full items-center justify-between px-4 py-3 text-left text-sm text-gray-700 hover:text-red-600 dark:text-zinc-300 dark:hover:text-red-400"
              >
                Editar Zona de DNS
                <Cloud className="h-4 w-4 shrink-0" />
              </button>
              <button
                type="button"
                onClick={() => onNavigate?.('cp-dns-nameserver', { domain })}
                className="flex w-full items-center justify-between px-4 py-3 text-left text-sm text-gray-700 hover:text-red-600 dark:text-zinc-300 dark:hover:text-red-400"
              >
                Alterar nameservers
                <Server className="h-4 w-4 shrink-0" />
              </button>
              <button
                type="button"
                onClick={() => onNavigate?.('cadastrar-renovacao', { domain })}
                className="flex w-full items-center justify-between px-4 py-3 text-left text-sm text-gray-700 hover:text-red-600 dark:text-zinc-300 dark:hover:text-red-400"
              >
                Renovar manualmente
                <Calendar className="h-4 w-4 shrink-0" />
              </button>
              <button
                type="button"
                onClick={() => void handleToggleAutoRenew()}
                disabled={registrarLoading || registrar.autoRenew === null}
                className="flex w-full items-center justify-between px-4 py-3 text-left text-sm text-gray-700 hover:text-red-600 disabled:opacity-50 dark:text-zinc-300 dark:hover:text-red-400"
              >
                <span>
                  Renovação automática
                  {registrar.autoRenew !== null && (
                    <span className="mt-0.5 block text-xs text-gray-500 dark:text-zinc-500">
                      {registrar.autoRenew ? 'Activa' : 'Inactiva'}
                    </span>
                  )}
                </span>
                {registrarLoading ? <Spinner className="h-4 w-4 shrink-0" /> : <RefreshCw className="h-4 w-4 shrink-0" />}
              </button>
              <button
                type="button"
                onClick={() => showMsg('Disponível em breve — a gestão de WHOIS ainda não está ligada ao registador.', 'error')}
                className="flex w-full items-center justify-between px-4 py-3 text-left text-sm text-gray-400 dark:text-zinc-600"
              >
                <span>
                  Actualizar WHOIS
                  <span className="mt-0.5 block text-xs text-gray-400 dark:text-zinc-600">Em breve</span>
                </span>
                <ShieldCheck className="h-4 w-4 shrink-0" />
              </button>
              <button
                type="button"
                onClick={() => onNavigate?.('cp-email-mgmt', { domain })}
                className="flex w-full items-center justify-between px-4 py-3 text-left text-sm text-gray-700 hover:text-red-600 dark:text-zinc-300 dark:hover:text-red-400"
              >
                Criar e-mail
                <Mail className="h-4 w-4 shrink-0" />
              </button>
              <button
                type="button"
                onClick={() => window.open(`https://${domain}`, '_blank', 'noopener,noreferrer')}
                className="flex w-full items-center justify-between px-4 py-3 text-left text-sm text-gray-700 hover:text-red-600 dark:text-zinc-300 dark:hover:text-red-400"
              >
                Abrir site
                <ExternalLink className="h-4 w-4 shrink-0" />
              </button>
            </div>
          </div>

          {site && (
            <div className="rounded border border-gray-200 bg-white p-4 text-sm dark:border-zinc-700 dark:bg-zinc-900">
              <div className="flex justify-between gap-2">
                <span className="text-gray-500 dark:text-zinc-500">Document root</span>
                <span className="font-mono text-xs text-gray-700 dark:text-zinc-300">/public_html/{domain}</span>
              </div>
              <div className="mt-2 flex justify-between gap-2">
                <span className="text-gray-500 dark:text-zinc-500">Pacote</span>
                <span className="text-gray-700 dark:text-zinc-300">{site.package || '—'}</span>
              </div>
              <div className="mt-2 flex justify-between gap-2">
                <span className="text-gray-500 dark:text-zinc-500">Estado</span>
                <span className="text-gray-700 dark:text-zinc-300">{site.state || site.status || 'Active'}</span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
