'use client'

import React, { useState, useEffect } from 'react'
import { cyberPanelAPI } from '@/lib/cyberpanel-api'
import type {
  CyberPanelWebsite, CyberPanelSubdomain, CyberPanelUser, CyberPanelDatabase,
  CyberPanelFTPAccount, CyberPanelEmail, CyberPanelPHPConfig, CyberPanelPackage
} from '@/lib/cyberpanel-api'
import { syncUserToSupabase, removeUserFromSupabase, syncWebsiteToSupabase, removeWebsiteFromSupabase, markWPInstalledInSupabase } from '@/lib/supabase-sync'
import { supabase } from '@/lib/supabase'
import { cpGetUsers, cpSaveUser, cpRemoveUser, cpSaveSubdomain, cpRemoveSubdomain, cpGetSubdomains, cpSaveDatabase, cpRemoveDatabase, cpGetDatabases, cpSaveFTP, cpRemoveFTP, cpGetFTP, cpSaveEmail, cpRemoveEmail, cpGetEmails } from '@/lib/cp-local-store'
import {
  RefreshCw, Globe, PlusCircle, Trash2, Database, Users, Mail, Lock, Shield,
  Server, HardDrive, Key, Settings, Code, AlertCircle, CheckCircle, Eye, EyeOff,
  ExternalLink, Copy, FolderOpen, Layers, Play, Pause, Edit, Cloud, RotateCcw,
  Upload, Download, Power, Plug, FileText, ArrowRight
} from 'lucide-react'

// ============================================================
// SUBDOMAINS SECTION
// ============================================================
export function SubdomainsSection({ sites }: { sites: CyberPanelWebsite[] }) {
  const [selectedDomain, setSelectedDomain] = useState('')
  const [subdomains, setSubdomains] = useState<CyberPanelSubdomain[]>([])
  const [loading, setLoading] = useState(false)
  const [newSub, setNewSub] = useState('')
  const [creating, setCreating] = useState(false)
  const [msg, setMsg] = useState('')

  const loadSubs = async (domain: string) => {
    if (!domain) return
    setLoading(true); setMsg('')
    const data = await cyberPanelAPI.listSubdomains(domain).catch(() => [])
    if (data.length > 0) {
      setSubdomains(data)
      data.forEach((s: any) => cpSaveSubdomain(s.domain, s.subdomain?.replace(`.${s.domain}`, '') || s.subdomain, s.path || ''))
    } else {
      const ls = cpGetSubdomains(domain)
      setSubdomains(ls.length > 0 ? ls : [])
    }
    setLoading(false)
  }

  const handleCreate = async () => {
    if (!selectedDomain || !newSub.trim()) return
    setCreating(true); setMsg('')
    const ok = await cyberPanelAPI.createSubdomain(selectedDomain, newSub.trim())
    cpSaveSubdomain(selectedDomain, newSub.trim())
    setMsg(ok ? 'Subdomínio criado com sucesso!' : 'Guardado localmente. Verifica no CyberPanel.')
    setNewSub('')
    loadSubs(selectedDomain)
    setCreating(false)
  }

  const handleDelete = async (sub: string) => {
    if (!confirm(`Eliminar subdomínio ${sub}?`)) return
    await cyberPanelAPI.deleteSubdomain(selectedDomain, sub)
    cpRemoveSubdomain(sub)
    loadSubs(selectedDomain)
  }

  return (
    <div className="space-y-6 max-w-5xl">
      <div className="flex justify-between items-center mb-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Subdomínios</h1>
          <p className="text-gray-500 mt-1">Crie e gira subdomínios para os seus websites.</p>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex flex-wrap gap-4 items-end mb-6">
          <div className="flex-1 min-w-[200px]">
            <label className="text-xs font-bold text-gray-600 uppercase block mb-1.5">Website</label>
            <select value={selectedDomain} onChange={(e) => { setSelectedDomain(e.target.value); loadSubs(e.target.value) }}
              className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-red-500/20 focus:border-red-500">
              <option value="">Seleccione um domínio...</option>
              {sites.map(s => <option key={s.domain} value={s.domain}>{s.domain}</option>)}
            </select>
          </div>
          <div className="flex-1 min-w-[200px]">
            <label className="text-xs font-bold text-gray-600 uppercase block mb-1.5">Novo Subdomínio</label>
            <div className="flex gap-2">
              <input value={newSub} onChange={(e) => setNewSub(e.target.value)} placeholder="blog"
                className="flex-1 px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-red-500/20 focus:border-red-500" />
              <button onClick={handleCreate} disabled={creating || !selectedDomain || !newSub.trim()}
                className="bg-black hover:bg-red-600 text-white px-4 py-2.5 rounded-lg text-sm font-bold transition-all disabled:opacity-50 flex items-center gap-2">
                {creating ? <RefreshCw className="w-4 h-4 animate-spin" /> : <PlusCircle className="w-4 h-4" />}
                Criar
              </button>
            </div>
          </div>
        </div>

        {msg && <div className={`mb-4 px-4 py-2.5 rounded-lg text-sm font-medium ${msg.includes('sucesso') ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>{msg}</div>}

        {loading ? (
          <div className="py-12 text-center"><RefreshCw className="w-8 h-8 animate-spin text-gray-400 mx-auto" /></div>
        ) : selectedDomain && subdomains.length === 0 ? (
          <div className="py-12 text-center text-gray-400"><Layers className="w-10 h-10 mx-auto mb-2 opacity-50" /><p className="text-sm">Nenhum subdomínio encontrado.</p></div>
        ) : subdomains.length > 0 ? (
          <table className="w-full text-sm">
            <thead><tr className="text-left text-xs font-bold text-gray-500 uppercase border-b"><th className="px-4 py-3">Subdomínio</th><th className="px-4 py-3">Domínio</th><th className="px-4 py-3">Caminho</th><th className="px-4 py-3 w-20">Ações</th></tr></thead>
            <tbody>
              {subdomains.map((s, i) => (
                <tr key={i} className="border-b border-gray-50 hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium">{s.subdomain}</td>
                  <td className="px-4 py-3 text-gray-600">{s.domain}</td>
                  <td className="px-4 py-3 text-gray-500 font-mono text-xs">{s.path}</td>
                  <td className="px-4 py-3"><button onClick={() => handleDelete(s.subdomain)} className="text-red-500 hover:text-red-700"><Trash2 className="w-4 h-4" /></button></td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : null}
      </div>
    </div>
  )
}

// ============================================================
// DATABASES SECTION
// ============================================================
export function DatabasesSection({ sites }: { sites: CyberPanelWebsite[] }) {
  const [selectedDomain, setSelectedDomain] = useState('')
  const [databases, setDatabases] = useState<CyberPanelDatabase[]>([])
  const [loading, setLoading] = useState(false)
  const [dbName, setDbName] = useState('')
  const [dbUser, setDbUser] = useState('')
  const [dbPass, setDbPass] = useState('')
  const [creating, setCreating] = useState(false)
  const [msg, setMsg] = useState('')

  const loadDBs = async (domain: string) => {
    if (!domain) return
    setLoading(true)
    const data = await cyberPanelAPI.listDatabases(domain).catch(() => [])
    if (data.length > 0) {
      setDatabases(data)
      data.forEach((d: any) => cpSaveDatabase(domain, d.dbName, d.dbUser))
    } else {
      const ls = cpGetDatabases(domain)
      setDatabases(ls.length > 0 ? ls : [])
    }
    setLoading(false)
  }

  const handleCreate = async () => {
    if (!selectedDomain || !dbName || !dbUser || !dbPass) return
    setCreating(true); setMsg('')
    const ok = await cyberPanelAPI.createDatabase(selectedDomain, dbName, dbUser, dbPass)
    cpSaveDatabase(selectedDomain, dbName, dbUser)
    setMsg(ok ? 'Base de dados criada!' : 'Guardada localmente. Verifica no CyberPanel.')
    setDbName(''); setDbUser(''); setDbPass('')
    loadDBs(selectedDomain)
    setCreating(false)
  }

  const handleDelete = async (name: string) => {
    if (!confirm(`Eliminar base de dados ${name}?`)) return
    await cyberPanelAPI.deleteDatabase(selectedDomain, name)
    cpRemoveDatabase(selectedDomain, name)
    loadDBs(selectedDomain)
  }

  return (
    <div className="space-y-6 max-w-5xl">
      <div><h1 className="text-3xl font-bold text-gray-900">Bases de Dados</h1><p className="text-gray-500 mt-1">Crie e gira bases de dados MySQL para os seus websites.</p></div>

      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <div>
            <label className="text-xs font-bold text-gray-600 uppercase block mb-1.5">Website</label>
            <select value={selectedDomain} onChange={(e) => { setSelectedDomain(e.target.value); loadDBs(e.target.value) }}
              className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-red-500/20 focus:border-red-500">
              <option value="">Seleccione...</option>
              {sites.map(s => <option key={s.domain} value={s.domain}>{s.domain}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs font-bold text-gray-600 uppercase block mb-1.5">Nome da BD</label>
            <input value={dbName} onChange={(e) => setDbName(e.target.value)} placeholder="minha_bd" className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-red-500/20 focus:border-red-500" />
          </div>
          <div>
            <label className="text-xs font-bold text-gray-600 uppercase block mb-1.5">Utilizador BD</label>
            <input value={dbUser} onChange={(e) => setDbUser(e.target.value)} placeholder="db_user" className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-red-500/20 focus:border-red-500" />
          </div>
          <div>
            <label className="text-xs font-bold text-gray-600 uppercase block mb-1.5">Senha BD</label>
            <input type="password" value={dbPass} onChange={(e) => setDbPass(e.target.value)} placeholder="••••••" className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-red-500/20 focus:border-red-500" />
          </div>
        </div>
        <button onClick={handleCreate} disabled={creating || !selectedDomain || !dbName || !dbUser || !dbPass}
          className="bg-black hover:bg-red-600 text-white px-5 py-2.5 rounded-lg text-sm font-bold transition-all disabled:opacity-50 flex items-center gap-2">
          {creating ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Database className="w-4 h-4" />} Criar Base de Dados
        </button>

        {msg && <div className={`mt-4 px-4 py-2.5 rounded-lg text-sm font-medium ${msg.includes('criada') ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>{msg}</div>}

        {loading ? <div className="py-12 text-center"><RefreshCw className="w-8 h-8 animate-spin text-gray-400 mx-auto" /></div> : databases.length > 0 && (
          <table className="w-full text-sm mt-6">
            <thead><tr className="text-left text-xs font-bold text-gray-500 uppercase border-b"><th className="px-4 py-3">Base de Dados</th><th className="px-4 py-3">Utilizador</th><th className="px-4 py-3 w-20">Ações</th></tr></thead>
            <tbody>
              {databases.map((db, i) => (
                <tr key={i} className="border-b border-gray-50 hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium font-mono text-sm">{db.dbName}</td>
                  <td className="px-4 py-3 text-gray-600 font-mono text-sm">{db.dbUser}</td>
                  <td className="px-4 py-3"><button onClick={() => handleDelete(db.dbName)} className="text-red-500 hover:text-red-700"><Trash2 className="w-4 h-4" /></button></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}

// ============================================================
// FTP SECTION
// ============================================================
export function FTPSection({ sites }: { sites: CyberPanelWebsite[] }) {
  const [selectedDomain, setSelectedDomain] = useState('')
  const [accounts, setAccounts] = useState<CyberPanelFTPAccount[]>([])
  const [loading, setLoading] = useState(false)
  const [ftpUser, setFtpUser] = useState('')
  const [ftpPass, setFtpPass] = useState('')
  const [ftpPath, setFtpPath] = useState('/')
  const [creating, setCreating] = useState(false)
  const [msg, setMsg] = useState('')

  const loadFTP = async (domain: string) => {
    if (!domain) return
    setLoading(true)
    const data = await cyberPanelAPI.listFTPAccounts(domain).catch(() => [])
    if (data.length > 0) {
      setAccounts(data)
      data.forEach((f: any) => cpSaveFTP(domain, f.userName, f.path || '/'))
    } else {
      const ls = cpGetFTP(domain)
      setAccounts(ls.length > 0 ? ls : [])
    }
    setLoading(false)
  }

  const handleCreate = async () => {
    if (!selectedDomain || !ftpUser || !ftpPass) return
    setCreating(true); setMsg('')
    const ok = await cyberPanelAPI.createFTPAccount(selectedDomain, ftpUser, ftpPass, ftpPath)
    cpSaveFTP(selectedDomain, ftpUser, ftpPath)
    setMsg(ok ? 'Conta FTP criada!' : 'Guardada localmente. Verifica no CyberPanel.')
    setFtpUser(''); setFtpPass(''); setFtpPath('/')
    loadFTP(selectedDomain)
    setCreating(false)
  }

  const handleDelete = async (user: string) => {
    if (!confirm(`Eliminar conta FTP ${user}?`)) return
    await cyberPanelAPI.deleteFTPAccount(selectedDomain, user)
    cpRemoveFTP(selectedDomain, user)
    loadFTP(selectedDomain)
  }

  return (
    <div className="space-y-6 max-w-5xl">
      <div><h1 className="text-3xl font-bold text-gray-900">Contas FTP</h1><p className="text-gray-500 mt-1">Gira contas FTP para transferência de ficheiros.</p></div>

      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <div>
            <label className="text-xs font-bold text-gray-600 uppercase block mb-1.5">Website</label>
            <select value={selectedDomain} onChange={(e) => { setSelectedDomain(e.target.value); loadFTP(e.target.value) }}
              className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-red-500/20 focus:border-red-500">
              <option value="">Seleccione...</option>
              {sites.map(s => <option key={s.domain} value={s.domain}>{s.domain}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs font-bold text-gray-600 uppercase block mb-1.5">Utilizador FTP</label>
            <input value={ftpUser} onChange={(e) => setFtpUser(e.target.value)} placeholder="ftp_user" className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-red-500/20 focus:border-red-500" />
          </div>
          <div>
            <label className="text-xs font-bold text-gray-600 uppercase block mb-1.5">Senha</label>
            <input type="password" value={ftpPass} onChange={(e) => setFtpPass(e.target.value)} placeholder="••••••" className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-red-500/20 focus:border-red-500" />
          </div>
          <div>
            <label className="text-xs font-bold text-gray-600 uppercase block mb-1.5">Caminho</label>
            <input value={ftpPath} onChange={(e) => setFtpPath(e.target.value)} placeholder="/" className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-red-500/20 focus:border-red-500" />
          </div>
        </div>
        <button onClick={handleCreate} disabled={creating || !selectedDomain || !ftpUser || !ftpPass}
          className="bg-black hover:bg-red-600 text-white px-5 py-2.5 rounded-lg text-sm font-bold transition-all disabled:opacity-50 flex items-center gap-2">
          {creating ? <RefreshCw className="w-4 h-4 animate-spin" /> : <HardDrive className="w-4 h-4" />} Criar Conta FTP
        </button>

        {msg && <div className={`mt-4 px-4 py-2.5 rounded-lg text-sm font-medium ${msg.includes('criada') ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>{msg}</div>}

        {loading ? <div className="py-12 text-center"><RefreshCw className="w-8 h-8 animate-spin text-gray-400 mx-auto" /></div> : accounts.length > 0 && (
          <table className="w-full text-sm mt-6">
            <thead><tr className="text-left text-xs font-bold text-gray-500 uppercase border-b"><th className="px-4 py-3">Utilizador</th><th className="px-4 py-3">Caminho</th><th className="px-4 py-3 w-20">Ações</th></tr></thead>
            <tbody>
              {accounts.map((a, i) => (
                <tr key={i} className="border-b border-gray-50 hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium">{a.userName}</td>
                  <td className="px-4 py-3 text-gray-500 font-mono text-xs">{a.path}</td>
                  <td className="px-4 py-3"><button onClick={() => handleDelete(a.userName)} className="text-red-500 hover:text-red-700"><Trash2 className="w-4 h-4" /></button></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}

// ============================================================
// EMAIL MANAGEMENT SECTION (Extended)
// ============================================================
export function EmailManagementSection({ sites }: { sites: CyberPanelWebsite[] }) {
  const [selectedDomain, setSelectedDomain] = useState('')
  const [emails, setEmails] = useState<CyberPanelEmail[]>([])
  const [loading, setLoading] = useState(false)
  const [emailUser, setEmailUser] = useState('')
  const [emailPass, setEmailPass] = useState('')
  const [emailQuota, setEmailQuota] = useState('500')
  const [creating, setCreating] = useState(false)
  const [msg, setMsg] = useState('')
  const [showPass, setShowPass] = useState(false)
  const [changingPass, setChangingPass] = useState<string | null>(null)
  const [newPass, setNewPass] = useState('')
  const [forwardEmail, setForwardEmail] = useState<string | null>(null)
  const [forwardTo, setForwardTo] = useState('')
  const [forwards, setForwards] = useState<string[]>([])

  const loadEmails = async (domain: string) => {
    if (!domain) return
    setLoading(true)
    const data = await cyberPanelAPI.listEmails(domain).catch(() => [])
    if (data.length > 0) {
      setEmails(data)
      data.forEach((e: any) => cpSaveEmail(domain, e.email?.split('@')[0] || e.email, { quota: e.quota || '500' }))
    } else {
      const ls = cpGetEmails(domain)
      setEmails(ls.length > 0 ? ls.map((e: any) => ({ email: e.emailUser || e.email, quota: e.quota || '500', usage: e.usage || '0' })) : [])
    }
    setLoading(false)
  }

  const handleCreate = async () => {
    if (!selectedDomain || !emailUser || !emailPass) return
    setCreating(true); setMsg('')
    const ok = await cyberPanelAPI.createEmail({ domainName: selectedDomain, emailUser, emailPass, quota: parseInt(emailQuota) })
    cpSaveEmail(selectedDomain, emailUser, { quota: emailQuota })
    setMsg(ok ? 'Conta de e-mail criada!' : 'Guardada localmente. Verifica no CyberPanel.')
    setEmailUser(''); setEmailPass('')
    loadEmails(selectedDomain)
    setCreating(false)
  }

  const handleDelete = async (email: string) => {
    if (!confirm(`Eliminar ${email}?`)) return
    const ok = await cyberPanelAPI.deleteEmail(selectedDomain, email)
    if (ok) loadEmails(selectedDomain)
    else setMsg('Erro ao eliminar.')
  }

  const handleChangePass = async (email: string) => {
    if (!newPass) return
    const ok = await cyberPanelAPI.changeEmailPassword(selectedDomain, email, newPass)
    if (ok) { setMsg('Senha alterada!'); setChangingPass(null); setNewPass('') }
    else setMsg('Erro ao alterar senha.')
  }

  const loadForwards = async (email: string) => {
    setForwardEmail(email)
    const fwds = await cyberPanelAPI.getEmailForwarding(selectedDomain, email)
    setForwards(fwds)
  }

  const handleAddForward = async () => {
    if (!forwardEmail || !forwardTo) return
    const ok = await cyberPanelAPI.addEmailForwarding(selectedDomain, forwardEmail, forwardTo)
    if (ok) { setForwardTo(''); loadForwards(forwardEmail) }
    else setMsg('Erro ao adicionar reencaminhamento.')
  }

  return (
    <div className="space-y-6 max-w-5xl">
      <div><h1 className="text-3xl font-bold text-gray-900">Gestão de E-mail</h1><p className="text-gray-500 mt-1">Crie, elimine e configure contas de e-mail, senhas e reencaminhamento.</p></div>

      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <div>
            <label className="text-xs font-bold text-gray-600 uppercase block mb-1.5">Website</label>
            <select value={selectedDomain} onChange={(e) => { setSelectedDomain(e.target.value); loadEmails(e.target.value) }}
              className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-red-500/20 focus:border-red-500">
              <option value="">Seleccione...</option>
              {sites.map(s => <option key={s.domain} value={s.domain}>{s.domain}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs font-bold text-gray-600 uppercase block mb-1.5">Utilizador</label>
            <div className="flex items-center gap-1">
              <input value={emailUser} onChange={(e) => setEmailUser(e.target.value)} placeholder="info" className="flex-1 px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-red-500/20 focus:border-red-500" />
              <span className="text-gray-400 text-sm">@{selectedDomain || '...'}</span>
            </div>
          </div>
          <div>
            <label className="text-xs font-bold text-gray-600 uppercase block mb-1.5">Senha</label>
            <input type={showPass ? 'text' : 'password'} value={emailPass} onChange={(e) => setEmailPass(e.target.value)} placeholder="••••••" className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-red-500/20 focus:border-red-500" />
          </div>
          <div>
            <label className="text-xs font-bold text-gray-600 uppercase block mb-1.5">Quota (MB)</label>
            <input value={emailQuota} onChange={(e) => setEmailQuota(e.target.value)} placeholder="500" className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-red-500/20 focus:border-red-500" />
          </div>
        </div>
        <button onClick={handleCreate} disabled={creating || !selectedDomain || !emailUser || !emailPass}
          className="bg-black hover:bg-red-600 text-white px-5 py-2.5 rounded-lg text-sm font-bold transition-all disabled:opacity-50 flex items-center gap-2">
          {creating ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Mail className="w-4 h-4" />} Criar Conta de E-mail
        </button>

        {msg && <div className={`mt-4 px-4 py-2.5 rounded-lg text-sm font-medium ${msg.includes('!') && !msg.includes('Erro') ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>{msg}</div>}

        {loading ? <div className="py-12 text-center"><RefreshCw className="w-8 h-8 animate-spin text-gray-400 mx-auto" /></div> : emails.length > 0 && (
          <div className="mt-6 space-y-3">
            {emails.map((em, i) => (
              <div key={i} className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-red-50 rounded-full flex items-center justify-center"><Mail className="w-5 h-5 text-red-600" /></div>
                    <div>
                      <p className="font-bold text-gray-900 text-sm">{em.email}</p>
                      <p className="text-xs text-gray-500">Quota: {em.quota} • Uso: {em.usage}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button onClick={() => setChangingPass(changingPass === em.email ? null : em.email)} className="text-xs bg-gray-100 hover:bg-gray-200 px-3 py-1.5 rounded-md font-medium transition-colors">Alterar Senha</button>
                    <button onClick={() => loadForwards(em.email)} className="text-xs bg-gray-100 hover:bg-gray-200 px-3 py-1.5 rounded-md font-medium transition-colors">Reencaminhar</button>
                    <button onClick={() => handleDelete(em.email)} className="text-red-500 hover:text-red-700 p-1.5"><Trash2 className="w-4 h-4" /></button>
                  </div>
                </div>
                {changingPass === em.email && (
                  <div className="mt-3 pt-3 border-t flex gap-2">
                    <input type="password" value={newPass} onChange={(e) => setNewPass(e.target.value)} placeholder="Nova senha" className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm" />
                    <button onClick={() => handleChangePass(em.email)} className="bg-black hover:bg-red-600 text-white px-4 py-2 rounded-lg text-sm font-bold transition-all">Guardar</button>
                  </div>
                )}
                {forwardEmail === em.email && (
                  <div className="mt-3 pt-3 border-t">
                    <div className="flex gap-2 mb-2">
                      <input value={forwardTo} onChange={(e) => setForwardTo(e.target.value)} placeholder="destino@email.com" className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm" />
                      <button onClick={handleAddForward} className="bg-black hover:bg-red-600 text-white px-4 py-2 rounded-lg text-sm font-bold transition-all">Adicionar</button>
                    </div>
                    {forwards.length > 0 && <div className="text-xs text-gray-500">{forwards.map((f, fi) => <span key={fi} className="inline-block bg-gray-100 px-2 py-1 rounded mr-1 mb-1">{f}</span>)}</div>}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

// ============================================================
// CYBERPANEL USERS SECTION
// ============================================================
export function CPUsersSection() {
  const [users, setUsers] = useState<CyberPanelUser[]>([])
  const [loading, setLoading] = useState(false)
  const [acls, setAcls] = useState<string[]>([])
  const [showForm, setShowForm] = useState(false)
  const [creating, setCreating] = useState(false)
  const [msg, setMsg] = useState('')
  const [form, setForm] = useState({ firstName: '', lastName: '', email: '', userName: '', password: '', websitesLimit: 10, acl: 'user' })

  const loadUsers = async () => {
    setLoading(true)
    const [u, a] = await Promise.all([
      cyberPanelAPI.listUsers().catch(() => [] as CyberPanelUser[]),
      cyberPanelAPI.listACLs().catch(() => ['user', 'reseller'])
    ])
    setAcls(a)
    if (u.length > 0) {
      setUsers(u)
      u.forEach((user: any) => cpSaveUser(user.userName, { firstName: user.firstName, lastName: user.lastName, email: user.email, acl: user.acl, websitesLimit: user.websitesLimit }))
    } else {
      // Fallback 1: Supabase
      let loaded = false
      try {
        const { data: sbUsers, error: sbErr } = await supabase.from('cyberpanel_users').select('*').order('username')
        if (!sbErr && sbUsers && sbUsers.length > 0) {
          setUsers(sbUsers.map((u: any) => ({
            userName: u.username, firstName: u.first_name || '', lastName: u.last_name || '',
            email: u.email || '', acl: u.acl || 'user', websitesLimit: u.websites_limit || 0, status: u.status || 'Active'
          })))
          loaded = true
        }
      } catch { /* table may not exist */ }
      // Fallback 2: localStorage (always works)
      if (!loaded) {
        const lsUsers = cpGetUsers()
        if (lsUsers.length > 0) setUsers(lsUsers)
      }
    }
    setLoading(false)
  }

  useEffect(() => { loadUsers() }, [])

  const handleCreate = async () => {
    if (!form.userName || !form.email || !form.password) return
    setCreating(true); setMsg('')
    const ok = await cyberPanelAPI.createUser(form)
    // Always save locally (localStorage + Supabase) so user appears in list
    cpSaveUser(form.userName, { firstName: form.firstName, lastName: form.lastName, email: form.email, acl: form.acl, websitesLimit: form.websitesLimit })
    void syncUserToSupabase({ username: form.userName, firstName: form.firstName, lastName: form.lastName, email: form.email, acl: form.acl, websitesLimit: form.websitesLimit, status: 'Active' })
    setMsg(ok ? 'Utilizador criado com sucesso!' : 'Guardado no painel. Verifica no CyberPanel se necessário.')
    setShowForm(false)
    setForm({ firstName: '', lastName: '', email: '', userName: '', password: '', websitesLimit: 10, acl: 'user' })
    loadUsers()
    setCreating(false)
  }

  const handleDelete = async (userName: string) => {
    if (!confirm(`Eliminar utilizador ${userName}?`)) return
    await cyberPanelAPI.deleteUser(userName)
    // Always remove from all stores
    cpRemoveUser(userName)
    void removeUserFromSupabase(userName)
    await loadUsers()
  }

  return (
    <div className="space-y-6 max-w-5xl">
      <div className="flex justify-between items-center">
        <div><h1 className="text-3xl font-bold text-gray-900">Utilizadores CyberPanel</h1><p className="text-gray-500 mt-1">Gira utilizadores e permissões do servidor.</p></div>
        <div className="flex gap-2">
          <button onClick={loadUsers} className="bg-gray-100 hover:bg-gray-200 text-gray-700 px-4 py-2 rounded-lg text-sm font-bold transition-all flex items-center gap-2"><RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} /> Atualizar</button>
          <button onClick={() => setShowForm(!showForm)} className="bg-black hover:bg-red-600 text-white px-4 py-2 rounded-lg text-sm font-bold transition-all flex items-center gap-2"><PlusCircle className="w-4 h-4" /> Novo Utilizador</button>
        </div>
      </div>

      {msg && <div className={`px-4 py-2.5 rounded-lg text-sm font-medium ${msg.includes('criado') ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>{msg}</div>}

      {showForm && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h3 className="font-bold text-gray-900 mb-4">Criar Novo Utilizador</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-4">
            <div><label className="text-xs font-bold text-gray-600 uppercase block mb-1.5">Nome</label><input value={form.firstName} onChange={(e) => setForm({...form, firstName: e.target.value})} className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm" placeholder="João" /></div>
            <div><label className="text-xs font-bold text-gray-600 uppercase block mb-1.5">Apelido</label><input value={form.lastName} onChange={(e) => setForm({...form, lastName: e.target.value})} className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm" placeholder="Silva" /></div>
            <div><label className="text-xs font-bold text-gray-600 uppercase block mb-1.5">E-mail</label><input value={form.email} onChange={(e) => setForm({...form, email: e.target.value})} className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm" placeholder="joao@email.com" /></div>
            <div><label className="text-xs font-bold text-gray-600 uppercase block mb-1.5">Username</label><input value={form.userName} onChange={(e) => setForm({...form, userName: e.target.value})} className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm" placeholder="joao" /></div>
            <div><label className="text-xs font-bold text-gray-600 uppercase block mb-1.5">Senha</label><input type="password" value={form.password} onChange={(e) => setForm({...form, password: e.target.value})} className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm" placeholder="••••••" /></div>
            <div><label className="text-xs font-bold text-gray-600 uppercase block mb-1.5">Limite Websites</label><input type="number" value={form.websitesLimit} onChange={(e) => setForm({...form, websitesLimit: parseInt(e.target.value)})} className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm" /></div>
            <div><label className="text-xs font-bold text-gray-600 uppercase block mb-1.5">ACL (Permissão)</label>
              <select value={form.acl} onChange={(e) => setForm({...form, acl: e.target.value})} className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm">
                {acls.map(a => <option key={a} value={a}>{a}</option>)}
              </select>
            </div>
          </div>
          <button onClick={handleCreate} disabled={creating} className="bg-black hover:bg-red-600 text-white px-5 py-2.5 rounded-lg text-sm font-bold transition-all disabled:opacity-50 flex items-center gap-2">
            {creating ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Users className="w-4 h-4" />} Criar Utilizador
          </button>
        </div>
      )}

      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        {loading ? <div className="py-12 text-center"><RefreshCw className="w-8 h-8 animate-spin text-gray-400 mx-auto" /></div> : users.length === 0 ? (
          <div className="py-12 text-center text-gray-400"><Users className="w-10 h-10 mx-auto mb-2 opacity-50" /><p className="text-sm">Nenhum utilizador encontrado.</p></div>
        ) : (
          <table className="w-full text-sm">
            <thead><tr className="text-left text-xs font-bold text-gray-500 uppercase border-b bg-gray-50"><th className="px-4 py-3">Username</th><th className="px-4 py-3">Nome</th><th className="px-4 py-3">E-mail</th><th className="px-4 py-3">ACL</th><th className="px-4 py-3">Websites</th><th className="px-4 py-3 w-20">Ações</th></tr></thead>
            <tbody>
              {users.map((u, i) => (
                <tr key={i} className="border-b border-gray-50 hover:bg-gray-50">
                  <td className="px-4 py-3 font-bold">{u.userName}</td>
                  <td className="px-4 py-3">{u.firstName} {u.lastName}</td>
                  <td className="px-4 py-3 text-gray-600">{u.email}</td>
                  <td className="px-4 py-3"><span className="bg-gray-100 text-gray-700 px-2 py-0.5 rounded text-xs font-bold">{u.acl}</span></td>
                  <td className="px-4 py-3">{u.websitesLimit}</td>
                  <td className="px-4 py-3">{u.userName !== 'admin' && <button onClick={() => handleDelete(u.userName)} className="text-red-500 hover:text-red-700"><Trash2 className="w-4 h-4" /></button>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}

// ============================================================
// RESELLER CENTER (ACL) SECTION
// ============================================================
export function ResellerSection() {
  const [acls, setAcls] = useState<string[]>([])
  const [loading, setLoading] = useState(false)
  const [showForm, setShowForm] = useState(false)
  const [creating, setCreating] = useState(false)
  const [msg, setMsg] = useState('')
  const [form, setForm] = useState({
    name: '', createWebsite: true, deleteWebsite: true, suspendWebsite: true,
    createPackage: false, deletePackage: false, createEmail: true, deleteEmail: true,
    createDNS: true, createDatabase: true, createFTP: true
  })

  const loadACLs = async () => { setLoading(true); const a = await cyberPanelAPI.listACLs(); setAcls(a); setLoading(false) }
  useEffect(() => { loadACLs() }, [])

  const handleCreate = async () => {
    if (!form.name) return
    setCreating(true); setMsg('')
    const ok = await cyberPanelAPI.createACL(form)
    if (ok) { setMsg('ACL criada!'); setShowForm(false); setForm({...form, name: ''}); loadACLs() }
    else setMsg('Erro ao criar ACL.')
    setCreating(false)
  }

  const handleDelete = async (name: string) => {
    if (!confirm(`Eliminar ACL ${name}?`)) return
    const ok = await cyberPanelAPI.deleteACL(name)
    if (ok) loadACLs()
    else setMsg('Erro ao eliminar.')
  }

  const toggleField = (field: string) => setForm({ ...form, [field]: !(form as any)[field] })

  return (
    <div className="space-y-6 max-w-5xl">
      <div className="flex justify-between items-center">
        <div><h1 className="text-3xl font-bold text-gray-900">Centro de Revenda</h1><p className="text-gray-500 mt-1">Gira ACLs (Access Control Lists) e permissões de revendedores.</p></div>
        <button onClick={() => setShowForm(!showForm)} className="bg-black hover:bg-red-600 text-white px-4 py-2 rounded-lg text-sm font-bold transition-all flex items-center gap-2"><PlusCircle className="w-4 h-4" /> Nova ACL</button>
      </div>

      {msg && <div className={`px-4 py-2.5 rounded-lg text-sm font-medium ${msg.includes('criada') ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>{msg}</div>}

      {showForm && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h3 className="font-bold text-gray-900 mb-4">Criar Nova ACL</h3>
          <div className="mb-4">
            <label className="text-xs font-bold text-gray-600 uppercase block mb-1.5">Nome da ACL</label>
            <input value={form.name} onChange={(e) => setForm({...form, name: e.target.value})} className="w-full max-w-sm px-3 py-2.5 border border-gray-300 rounded-lg text-sm" placeholder="reseller_basic" />
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 mb-6">
            {[
              { key: 'createWebsite', label: 'Criar Website' }, { key: 'deleteWebsite', label: 'Eliminar Website' },
              { key: 'suspendWebsite', label: 'Suspender Website' }, { key: 'createPackage', label: 'Criar Pacote' },
              { key: 'deletePackage', label: 'Eliminar Pacote' }, { key: 'createEmail', label: 'Criar E-mail' },
              { key: 'deleteEmail', label: 'Eliminar E-mail' }, { key: 'createDNS', label: 'Gerir DNS' },
              { key: 'createDatabase', label: 'Criar BD' }, { key: 'createFTP', label: 'Criar FTP' },
            ].map(p => (
              <label key={p.key} className="flex items-center gap-2 cursor-pointer p-2 rounded-lg hover:bg-gray-50 border border-gray-100">
                <input type="checkbox" checked={(form as any)[p.key]} onChange={() => toggleField(p.key)} className="w-4 h-4 text-red-600 rounded border-gray-300 focus:ring-red-500" />
                <span className="text-sm text-gray-700">{p.label}</span>
              </label>
            ))}
          </div>
          <button onClick={handleCreate} disabled={creating || !form.name} className="bg-black hover:bg-red-600 text-white px-5 py-2.5 rounded-lg text-sm font-bold transition-all disabled:opacity-50">
            {creating ? 'Criando...' : 'Criar ACL'}
          </button>
        </div>
      )}

      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        {loading ? <div className="py-12 text-center"><RefreshCw className="w-8 h-8 animate-spin text-gray-400 mx-auto" /></div> : (
          <div className="p-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {acls.map((acl, i) => (
              <div key={i} className="border border-gray-200 rounded-lg p-4 flex items-center justify-between hover:bg-gray-50">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center"><Shield className="w-5 h-5 text-gray-600" /></div>
                  <span className="font-bold text-sm">{acl}</span>
                </div>
                {acl !== 'admin' && <button onClick={() => handleDelete(acl)} className="text-red-500 hover:text-red-700"><Trash2 className="w-4 h-4" /></button>}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

// ============================================================
// PHP CONFIGURATION SECTION
// ============================================================
export function PHPConfigSection({ sites }: { sites: CyberPanelWebsite[] }) {
  const [selectedDomain, setSelectedDomain] = useState('')
  const [config, setConfig] = useState<CyberPanelPHPConfig | null>(null)
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState('')
  const [phpVersion, setPhpVersion] = useState('PHP 8.1')

  const loadConfig = async (domain: string) => {
    if (!domain) return
    setLoading(true); setMsg('')
    const data = await cyberPanelAPI.getPHPConfig(domain)
    setConfig(data || { phpVersion: 'PHP 8.1', maxExecutionTime: '30', memoryLimit: '256M', uploadMaxFilesize: '50M', postMaxSize: '50M', maxInputVars: '1000', maxInputTime: '60' })
    if (data?.phpVersion) setPhpVersion(data.phpVersion)
    setLoading(false)
  }

  const handleSave = async () => {
    if (!selectedDomain || !config) return
    setSaving(true); setMsg('')
    const ok = await cyberPanelAPI.savePHPConfig(selectedDomain, config)
    if (ok) setMsg('Configurações PHP guardadas!')
    else setMsg('Erro ao guardar configurações.')
    setSaving(false)
  }

  const handleChangePHP = async () => {
    if (!selectedDomain) return
    setSaving(true); setMsg('')
    const ok = await cyberPanelAPI.changePHPVersion(selectedDomain, phpVersion)
    if (ok) setMsg(`Versão PHP alterada para ${phpVersion}!`)
    else setMsg('Erro ao alterar versão PHP.')
    setSaving(false)
  }

  const updateConfig = (key: string, value: string) => {
    if (config) setConfig({ ...config, [key]: value })
  }

  return (
    <div className="space-y-6 max-w-5xl">
      <div><h1 className="text-3xl font-bold text-gray-900">Configurações PHP</h1><p className="text-gray-500 mt-1">Configure a versão PHP e parâmetros de execução por website.</p></div>

      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex flex-wrap gap-4 items-end mb-6">
          <div className="flex-1 min-w-[200px]">
            <label className="text-xs font-bold text-gray-600 uppercase block mb-1.5">Website</label>
            <select value={selectedDomain} onChange={(e) => { setSelectedDomain(e.target.value); loadConfig(e.target.value) }}
              className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-red-500/20 focus:border-red-500">
              <option value="">Seleccione...</option>
              {sites.map(s => <option key={s.domain} value={s.domain}>{s.domain}</option>)}
            </select>
          </div>
          <div className="min-w-[200px]">
            <label className="text-xs font-bold text-gray-600 uppercase block mb-1.5">Versão PHP</label>
            <div className="flex gap-2">
              <select value={phpVersion} onChange={(e) => setPhpVersion(e.target.value)}
                className="flex-1 px-3 py-2.5 border border-gray-300 rounded-lg text-sm">
                <option>PHP 7.4</option><option>PHP 8.0</option><option>PHP 8.1</option><option>PHP 8.2</option><option>PHP 8.3</option>
              </select>
              <button onClick={handleChangePHP} disabled={saving || !selectedDomain} className="bg-black hover:bg-red-600 text-white px-4 py-2.5 rounded-lg text-sm font-bold transition-all disabled:opacity-50">Alterar</button>
            </div>
          </div>
        </div>

        {msg && <div className={`mb-4 px-4 py-2.5 rounded-lg text-sm font-medium ${msg.includes('!') && !msg.includes('Erro') ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>{msg}</div>}

        {loading ? <div className="py-12 text-center"><RefreshCw className="w-8 h-8 animate-spin text-gray-400 mx-auto" /></div> : config && (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
              {[
                { key: 'maxExecutionTime', label: 'Max Execution Time', placeholder: '30', suffix: 's' },
                { key: 'memoryLimit', label: 'Memory Limit', placeholder: '256M', suffix: '' },
                { key: 'uploadMaxFilesize', label: 'Upload Max Filesize', placeholder: '50M', suffix: '' },
                { key: 'postMaxSize', label: 'Post Max Size', placeholder: '50M', suffix: '' },
                { key: 'maxInputVars', label: 'Max Input Vars', placeholder: '1000', suffix: '' },
                { key: 'maxInputTime', label: 'Max Input Time', placeholder: '60', suffix: 's' },
              ].map(f => (
                <div key={f.key}>
                  <label className="text-xs font-bold text-gray-600 uppercase block mb-1.5">{f.label}</label>
                  <input value={(config as any)[f.key] || ''} onChange={(e) => updateConfig(f.key, e.target.value)}
                    placeholder={f.placeholder} className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm font-mono focus:ring-2 focus:ring-red-500/20 focus:border-red-500" />
                </div>
              ))}
            </div>
            <button onClick={handleSave} disabled={saving} className="bg-black hover:bg-red-600 text-white px-5 py-2.5 rounded-lg text-sm font-bold transition-all disabled:opacity-50 flex items-center gap-2">
              {saving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Settings className="w-4 h-4" />} Guardar Configurações PHP
            </button>
          </>
        )}
      </div>

      {/* PHP Extensions */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-5">
          <div>
            <h3 className="text-sm font-bold text-gray-800 uppercase tracking-wider">Extensões PHP</h3>
            <p className="text-xs text-gray-500 mt-0.5">Extensões recomendadas para WordPress e aplicações web</p>
          </div>
          <a href="https://109.199.104.22:8090/php/phpExtensions" target="_blank" rel="noopener noreferrer"
            className="bg-black hover:bg-red-600 text-white text-xs font-bold px-4 py-2 rounded-lg transition-all flex items-center gap-2">
            <ExternalLink className="w-3.5 h-3.5" /> Gerir no CyberPanel
          </a>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2">
          {[
            { name: 'mbstring', desc: 'Texto multibyte', wp: true },
            { name: 'mysqli', desc: 'MySQL melhorado', wp: true },
            { name: 'curl', desc: 'Transferência HTTP', wp: true },
            { name: 'gd', desc: 'Imagens GD', wp: true },
            { name: 'xml', desc: 'Processamento XML', wp: true },
            { name: 'zip', desc: 'Compressão ZIP', wp: true },
            { name: 'intl', desc: 'Internacionalização', wp: false },
            { name: 'bcmath', desc: 'Matemática precisão', wp: false },
            { name: 'imagick', desc: 'Processamento imagens', wp: false },
            { name: 'redis', desc: 'Cache Redis', wp: false },
            { name: 'opcache', desc: 'Cache PHP', wp: true },
            { name: 'soap', desc: 'Serviços SOAP', wp: false },
            { name: 'imap', desc: 'Email IMAP', wp: false },
            { name: 'exif', desc: 'Metadados imagens', wp: true },
            { name: 'fileinfo', desc: 'Info de ficheiros', wp: true },
          ].map(ext => (
            <div key={ext.name} className={`flex flex-col gap-1 p-3 rounded-xl border ${ext.wp ? 'border-indigo-100 bg-indigo-50/50' : 'border-gray-100 bg-gray-50'}`}>
              <div className="flex items-center justify-between">
                <code className="text-xs font-bold text-gray-800">{ext.name}</code>
                {ext.wp && <span className="text-[9px] font-bold text-indigo-600 bg-indigo-100 px-1 rounded">WP</span>}
              </div>
              <p className="text-[10px] text-gray-500 leading-tight">{ext.desc}</p>
            </div>
          ))}
        </div>
        <p className="text-xs text-gray-400 mt-4">
          As extensões marcadas <span className="font-bold text-indigo-600">WP</span> são necessárias para WordPress.
          Para instalar, clica em "Gerir no CyberPanel" → selecciona a versão PHP → activa a extensão.
        </p>
      </div>
    </div>
  )
}

// ============================================================
// SECURITY & FIREWALL SECTION
// ============================================================
export function SecuritySection({ sites }: { sites: CyberPanelWebsite[] }) {
  const [firewallOn, setFirewallOn] = useState(false)
  const [loading, setLoading] = useState(true)
  const [toggling, setToggling] = useState(false)
  const [blockedIPs, setBlockedIPs] = useState<string[]>([])
  const [newIP, setNewIP] = useState('')
  const [msg, setMsg] = useState('')
  const [selectedDomain, setSelectedDomain] = useState('')
  const [modsecOn, setModsecOn] = useState(false)
  const [modsecLoading, setModsecLoading] = useState(false)

  useEffect(() => {
    (async () => {
      setLoading(true)
      const [fw, ips] = await Promise.all([cyberPanelAPI.getFirewallStatus(), cyberPanelAPI.getBlockedIPs()])
      setFirewallOn(fw); setBlockedIPs(ips)
      setLoading(false)
    })()
  }, [])

  const handleToggleFirewall = async () => {
    setToggling(true)
    const ok = await cyberPanelAPI.toggleFirewall(!firewallOn)
    if (ok) setFirewallOn(!firewallOn)
    else setMsg('Erro ao alterar firewall.')
    setToggling(false)
  }

  const handleBlockIP = async () => {
    if (!newIP.trim()) return
    const ok = await cyberPanelAPI.blockIP(newIP.trim())
    if (ok) { setBlockedIPs([...blockedIPs, newIP.trim()]); setNewIP('') }
    else setMsg('Erro ao bloquear IP.')
  }

  const handleUnblockIP = async (ip: string) => {
    const ok = await cyberPanelAPI.unblockIP(ip)
    if (ok) setBlockedIPs(blockedIPs.filter(i => i !== ip))
    else setMsg('Erro ao desbloquear IP.')
  }

  const loadModSec = async (domain: string) => {
    if (!domain) return
    setModsecLoading(true)
    const status = await cyberPanelAPI.getModSecurityStatus(domain)
    setModsecOn(status)
    setModsecLoading(false)
  }

  const handleToggleModSec = async () => {
    if (!selectedDomain) return
    setModsecLoading(true)
    const ok = await cyberPanelAPI.toggleModSecurity(selectedDomain, !modsecOn)
    if (ok) setModsecOn(!modsecOn)
    else setMsg('Erro ao alterar ModSecurity.')
    setModsecLoading(false)
  }

  return (
    <div className="space-y-6 max-w-5xl">
      <div><h1 className="text-3xl font-bold text-gray-900">Segurança & Firewall</h1><p className="text-gray-500 mt-1">Gira firewall, ModSecurity e IPs bloqueados.</p></div>

      {msg && <div className="px-4 py-2.5 rounded-lg text-sm font-medium bg-red-50 text-red-700 border border-red-200">{msg}</div>}

      {loading ? <div className="py-12 text-center"><RefreshCw className="w-8 h-8 animate-spin text-gray-400 mx-auto" /></div> : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Firewall */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className={`w-12 h-12 rounded-full flex items-center justify-center ${firewallOn ? 'bg-green-100' : 'bg-red-100'}`}>
                  <Shield className={`w-6 h-6 ${firewallOn ? 'text-green-600' : 'text-red-600'}`} />
                </div>
                <div>
                  <h3 className="font-bold text-gray-900">Firewall</h3>
                  <p className="text-xs text-gray-500">{firewallOn ? 'Ativo e a proteger o servidor' : 'Desativado'}</p>
                </div>
              </div>
              <button onClick={handleToggleFirewall} disabled={toggling}
                className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${firewallOn ? 'bg-red-100 text-red-700 hover:bg-red-200' : 'bg-green-100 text-green-700 hover:bg-green-200'}`}>
                {toggling ? <RefreshCw className="w-4 h-4 animate-spin" /> : firewallOn ? 'Desativar' : 'Ativar'}
              </button>
            </div>
          </div>

          {/* ModSecurity */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h3 className="font-bold text-gray-900 mb-4">ModSecurity (WAF)</h3>
            <div className="flex gap-3 items-end mb-4">
              <div className="flex-1">
                <label className="text-xs font-bold text-gray-600 uppercase block mb-1.5">Website</label>
                <select value={selectedDomain} onChange={(e) => { setSelectedDomain(e.target.value); loadModSec(e.target.value) }}
                  className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm">
                  <option value="">Seleccione...</option>
                  {sites.map(s => <option key={s.domain} value={s.domain}>{s.domain}</option>)}
                </select>
              </div>
              {selectedDomain && (
                <button onClick={handleToggleModSec} disabled={modsecLoading}
                  className={`px-4 py-2.5 rounded-lg text-sm font-bold transition-all ${modsecOn ? 'bg-red-100 text-red-700 hover:bg-red-200' : 'bg-green-100 text-green-700 hover:bg-green-200'}`}>
                  {modsecLoading ? <RefreshCw className="w-4 h-4 animate-spin" /> : modsecOn ? 'Desativar' : 'Ativar'}
                </button>
              )}
            </div>
            {selectedDomain && <p className="text-xs text-gray-500">ModSecurity: <span className={`font-bold ${modsecOn ? 'text-green-600' : 'text-red-600'}`}>{modsecOn ? 'Ativo' : 'Inativo'}</span></p>}
          </div>

          {/* Blocked IPs */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 lg:col-span-2">
            <h3 className="font-bold text-gray-900 mb-4">IPs Bloqueados</h3>
            <div className="flex gap-2 mb-4">
              <input value={newIP} onChange={(e) => setNewIP(e.target.value)} placeholder="192.168.1.100" className="flex-1 max-w-sm px-3 py-2.5 border border-gray-300 rounded-lg text-sm font-mono" />
              <button onClick={handleBlockIP} className="bg-black hover:bg-red-600 text-white px-4 py-2.5 rounded-lg text-sm font-bold transition-all flex items-center gap-2"><Lock className="w-4 h-4" /> Bloquear</button>
            </div>
            {blockedIPs.length === 0 ? <p className="text-sm text-gray-400">Nenhum IP bloqueado.</p> : (
              <div className="flex flex-wrap gap-2">
                {blockedIPs.map((ip, i) => (
                  <div key={i} className="flex items-center gap-2 bg-red-50 border border-red-200 px-3 py-1.5 rounded-lg">
                    <span className="text-sm font-mono text-red-700">{ip}</span>
                    <button onClick={() => handleUnblockIP(ip)} className="text-red-400 hover:text-red-600"><Trash2 className="w-3.5 h-3.5" /></button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

// ============================================================
// SSL CERTIFICATES SECTION
// ============================================================
export function SSLSection({ sites }: { sites: CyberPanelWebsite[] }) {
  const [selectedDomain, setSelectedDomain] = useState('')
  const [issuing, setIssuing] = useState(false)
  const [msg, setMsg] = useState('')

  const handleIssueSSL = async () => {
    if (!selectedDomain) return
    setIssuing(true); setMsg('')
    const ok = await cyberPanelAPI.issueSSL(selectedDomain)
    if (ok) setMsg(`Certificado SSL emitido para ${selectedDomain}!`)
    else setMsg('Erro ao emitir certificado SSL. Verifique se o domínio aponta para o servidor.')
    setIssuing(false)
  }

  return (
    <div className="space-y-6 max-w-5xl">
      <div><h1 className="text-3xl font-bold text-gray-900">Certificados SSL</h1><p className="text-gray-500 mt-1">Emita certificados SSL Let&apos;s Encrypt para os seus websites.</p></div>

      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex flex-wrap gap-4 items-end mb-6">
          <div className="flex-1 min-w-[250px]">
            <label className="text-xs font-bold text-gray-600 uppercase block mb-1.5">Website</label>
            <select value={selectedDomain} onChange={(e) => setSelectedDomain(e.target.value)}
              className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-red-500/20 focus:border-red-500">
              <option value="">Seleccione um domínio...</option>
              {sites.map(s => <option key={s.domain} value={s.domain}>{s.domain}</option>)}
            </select>
          </div>
          <button onClick={handleIssueSSL} disabled={issuing || !selectedDomain}
            className="bg-black hover:bg-red-600 text-white px-5 py-2.5 rounded-lg text-sm font-bold transition-all disabled:opacity-50 flex items-center gap-2">
            {issuing ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Lock className="w-4 h-4" />} Emitir SSL
          </button>
        </div>

        {msg && <div className={`px-4 py-2.5 rounded-lg text-sm font-medium ${msg.includes('!') && !msg.includes('Erro') ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>{msg}</div>}

        <div className="mt-6">
          <h3 className="font-bold text-gray-900 mb-3">Websites com SSL</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {sites.map((s, i) => (
              <div key={i} className="border border-gray-200 rounded-lg p-4 flex items-center gap-3 hover:bg-gray-50">
                <div className="w-10 h-10 bg-green-50 rounded-full flex items-center justify-center"><Lock className="w-5 h-5 text-green-600" /></div>
                <div>
                  <p className="font-bold text-sm text-gray-900">{s.domain}</p>
                  <p className="text-xs text-green-600">SSL Ativo</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

// ============================================================
// API CONFIGURATION SECTION
// ============================================================
export function APIConfigSection() {
  const [token, setToken] = useState<string | null>(null)
  const [generating, setGenerating] = useState(false)
  const [copied, setCopied] = useState(false)
  const [serverStatus, setServerStatus] = useState<any>(null)
  const [loadingStatus, setLoadingStatus] = useState(false)

  const handleGenerate = async () => {
    setGenerating(true)
    const t = await cyberPanelAPI.generateAPIToken()
    setToken(t)
    setGenerating(false)
  }

  const handleCopy = () => {
    if (token) { navigator.clipboard.writeText(token); setCopied(true); setTimeout(() => setCopied(false), 2000) }
  }

  const loadStatus = async () => {
    setLoadingStatus(true)
    const s = await cyberPanelAPI.getServerStatus()
    setServerStatus(s)
    setLoadingStatus(false)
  }

  useEffect(() => { loadStatus() }, [])

  return (
    <div className="space-y-6 max-w-5xl">
      <div><h1 className="text-3xl font-bold text-gray-900">Configurações API</h1><p className="text-gray-500 mt-1">Gira tokens de acesso à API e veja o estado do servidor.</p></div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* API Token */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center"><Key className="w-5 h-5 text-gray-600" /></div>
            <h3 className="font-bold text-gray-900">Token de API</h3>
          </div>
          <p className="text-sm text-gray-500 mb-4">Gere um token para aceder à API do CyberPanel externamente.</p>
          <button onClick={handleGenerate} disabled={generating}
            className="bg-black hover:bg-red-600 text-white px-5 py-2.5 rounded-lg text-sm font-bold transition-all disabled:opacity-50 flex items-center gap-2 mb-4">
            {generating ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Key className="w-4 h-4" />} Gerar Token
          </button>
          {token && (
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-3 flex items-center gap-2">
              <code className="flex-1 text-xs font-mono text-gray-700 break-all">{token}</code>
              <button onClick={handleCopy} className="text-gray-500 hover:text-gray-700 shrink-0">
                {copied ? <CheckCircle className="w-4 h-4 text-green-600" /> : <Copy className="w-4 h-4" />}
              </button>
            </div>
          )}

          <div className="mt-6 pt-4 border-t">
            <h4 className="text-xs font-bold text-gray-600 uppercase mb-2">Endpoint Base</h4>
            <code className="text-sm font-mono bg-gray-50 px-3 py-2 rounded-lg block text-gray-700">https://109.199.104.22:8090/api/</code>
          </div>
        </div>

        {/* Server Status */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-green-50 rounded-full flex items-center justify-center"><Server className="w-5 h-5 text-green-600" /></div>
              <h3 className="font-bold text-gray-900">Estado do Servidor</h3>
            </div>
            <button onClick={loadStatus} disabled={loadingStatus} className="text-gray-500 hover:text-gray-700">
              <RefreshCw className={`w-4 h-4 ${loadingStatus ? 'animate-spin' : ''}`} />
            </button>
          </div>
          {loadingStatus ? <div className="py-8 text-center"><RefreshCw className="w-6 h-6 animate-spin text-gray-400 mx-auto" /></div> : serverStatus ? (
            <div className="space-y-3">
              {Object.entries(serverStatus).filter(([k]) => !['status', 'error_message'].includes(k)).slice(0, 8).map(([key, val]) => (
                <div key={key} className="flex justify-between items-center py-2 border-b border-gray-50">
                  <span className="text-sm text-gray-600 capitalize">{key.replace(/_/g, ' ')}</span>
                  <span className="text-sm font-bold text-gray-900">{String(val)}</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-gray-400">Não foi possível obter o estado do servidor.</p>
          )}
        </div>
      </div>
    </div>
  )
}

// ============================================================
// LIST SUBDOMAINS SECTION
// ============================================================
export function ListSubdomainsSection({ sites }: { sites: CyberPanelWebsite[] }) {
  const [selectedDomain, setSelectedDomain] = useState('')
  const [subdomains, setSubdomains] = useState<CyberPanelSubdomain[]>([])
  const [loading, setLoading] = useState(false)

  const loadSubs = async (domain: string) => {
    if (!domain) return
    setLoading(true)
    const data = await cyberPanelAPI.listSubdomains(domain)
    setSubdomains(data)
    setLoading(false)
  }

  return (
    <div className="space-y-6 max-w-5xl">
      <div><h1 className="text-3xl font-bold text-gray-900">List Sub/Addon Domains</h1><p className="text-gray-500 mt-1">View all subdomains and addon domains for a website.</p></div>
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="mb-6">
          <label className="text-xs font-bold text-gray-600 uppercase block mb-1.5">Website</label>
          <select value={selectedDomain} onChange={(e) => { setSelectedDomain(e.target.value); loadSubs(e.target.value) }}
            className="w-full max-w-sm px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-red-500/20 focus:border-red-500">
            <option value="">Select a domain...</option>
            {sites.map(s => <option key={s.domain} value={s.domain}>{s.domain}</option>)}
          </select>
        </div>
        {loading ? <div className="py-12 text-center"><RefreshCw className="w-8 h-8 animate-spin text-gray-400 mx-auto" /></div> : subdomains.length > 0 ? (
          <table className="w-full text-sm">
            <thead><tr className="text-left text-xs font-bold text-gray-500 uppercase border-b"><th className="px-4 py-3">Subdomain</th><th className="px-4 py-3">Domain</th><th className="px-4 py-3">Path</th></tr></thead>
            <tbody>{subdomains.map((s, i) => (
              <tr key={i} className="border-b border-gray-50 hover:bg-gray-50">
                <td className="px-4 py-3 font-medium">{s.subdomain}</td>
                <td className="px-4 py-3 text-gray-600">{s.domain}</td>
                <td className="px-4 py-3 text-gray-500 font-mono text-xs">{s.path}</td>
              </tr>
            ))}</tbody>
          </table>
        ) : selectedDomain ? <p className="text-sm text-gray-400 text-center py-8">No subdomains found.</p> : null}
      </div>
    </div>
  )
}

// ============================================================
// MODIFY WEBSITE SECTION
// ============================================================
export function ModifyWebsiteSection({ sites, packages }: { sites: CyberPanelWebsite[]; packages: CyberPanelPackage[] }) {
  const [selectedDomain, setSelectedDomain] = useState('')
  const [packageName, setPackageName] = useState('')
  const [phpVersion, setPhpVersion] = useState('PHP 8.1')
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState('')

  const handleModify = async () => {
    if (!selectedDomain) return
    setSaving(true); setMsg('')
    const ok = await cyberPanelAPI.modifyWebsite(selectedDomain, packageName, phpVersion)
    setMsg(ok ? 'Website modified successfully!' : 'Error modifying website.')
    setSaving(false)
  }

  return (
    <div className="space-y-6 max-w-5xl">
      <div><h1 className="text-3xl font-bold text-gray-900">Modify Website</h1><p className="text-gray-500 mt-1">Change package and PHP version for a website.</p></div>
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div>
            <label className="text-xs font-bold text-gray-600 uppercase block mb-1.5">Website</label>
            <select value={selectedDomain} onChange={(e) => { setSelectedDomain(e.target.value); const s = sites.find(x => x.domain === e.target.value); if (s) setPackageName(s.package) }}
              className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm"><option value="">Select...</option>
              {sites.map(s => <option key={s.domain} value={s.domain}>{s.domain}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs font-bold text-gray-600 uppercase block mb-1.5">Package</label>
            <select value={packageName} onChange={(e) => setPackageName(e.target.value)} className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm">
              {packages.map(p => <option key={p.packageName} value={p.packageName}>{p.packageName}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs font-bold text-gray-600 uppercase block mb-1.5">PHP Version</label>
            <select value={phpVersion} onChange={(e) => setPhpVersion(e.target.value)} className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm">
              <option>PHP 7.4</option><option>PHP 8.0</option><option>PHP 8.1</option><option>PHP 8.2</option><option>PHP 8.3</option>
            </select>
          </div>
        </div>
        {msg && <div className={`mb-4 px-4 py-2.5 rounded-lg text-sm font-medium ${msg.includes('success') ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>{msg}</div>}
        <button onClick={handleModify} disabled={saving || !selectedDomain} className="bg-black hover:bg-red-600 text-white px-5 py-2.5 rounded-lg text-sm font-bold transition-all disabled:opacity-50 flex items-center gap-2">
          {saving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Edit className="w-4 h-4" />} Modify Website
        </button>
      </div>
    </div>
  )
}

// ============================================================
// SUSPEND/UNSUSPEND WEBSITE SECTION
// ============================================================
export function SuspendWebsiteSection({ sites, onRefresh }: { sites: CyberPanelWebsite[]; onRefresh: () => void }) {
  const [loading, setLoading] = useState('')
  const [msg, setMsg] = useState('')

  const handleAction = async (domain: string, action: 'suspend' | 'unsuspend') => {
    setLoading(domain); setMsg('')
    const ok = action === 'suspend' ? await cyberPanelAPI.suspendWebsite(domain) : await cyberPanelAPI.unsuspendWebsite(domain)
    if (ok) {
      await syncWebsiteToSupabase({ domain, status: action === 'suspend' ? 'Suspended' : 'Active' })
      onRefresh()
    }
    setMsg(ok ? `${domain} ${action === 'suspend' ? 'suspended' : 'unsuspended'} successfully!` : `Error: could not ${action} ${domain}.`)
    setLoading('')
  }

  return (
    <div className="space-y-6 max-w-5xl">
      <div><h1 className="text-3xl font-bold text-gray-900">Suspend / Unsuspend</h1><p className="text-gray-500 mt-1">Suspend or reactivate websites.</p></div>
      {msg && <div className={`px-4 py-2.5 rounded-lg text-sm font-medium ${msg.includes('success') ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>{msg}</div>}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead><tr className="text-left text-xs font-bold text-gray-500 uppercase border-b bg-gray-50"><th className="px-4 py-3">Domain</th><th className="px-4 py-3">Status</th><th className="px-4 py-3">Owner</th><th className="px-4 py-3 w-40">Action</th></tr></thead>
          <tbody>{sites.map((s, i) => (
            <tr key={i} className="border-b border-gray-50 hover:bg-gray-50">
              <td className="px-4 py-3 font-bold">{s.domain}</td>
              <td className="px-4 py-3"><span className={`px-2 py-0.5 rounded text-xs font-bold ${s.status === 'Active' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>{s.status}</span></td>
              <td className="px-4 py-3 text-gray-600">{s.owner}</td>
              <td className="px-4 py-3">
                {s.status === 'Active' ? (
                  <button onClick={() => handleAction(s.domain, 'suspend')} disabled={loading === s.domain} className="bg-red-100 text-red-700 hover:bg-red-200 px-3 py-1.5 rounded-lg text-xs font-bold transition-all disabled:opacity-50 flex items-center gap-1">
                    {loading === s.domain ? <RefreshCw className="w-3 h-3 animate-spin" /> : <Pause className="w-3 h-3" />} Suspend
                  </button>
                ) : (
                  <button onClick={() => handleAction(s.domain, 'unsuspend')} disabled={loading === s.domain} className="bg-green-100 text-green-700 hover:bg-green-200 px-3 py-1.5 rounded-lg text-xs font-bold transition-all disabled:opacity-50 flex items-center gap-1">
                    {loading === s.domain ? <RefreshCw className="w-3 h-3 animate-spin" /> : <Play className="w-3 h-3" />} Unsuspend
                  </button>
                )}
              </td>
            </tr>
          ))}</tbody>
        </table>
      </div>
    </div>
  )
}

// ============================================================
// DELETE WEBSITE SECTION
// ============================================================
export function DeleteWebsiteSection({ sites, onRefresh }: { sites: CyberPanelWebsite[]; onRefresh: () => void }) {
  const [deleting, setDeleting] = useState('')
  const [msg, setMsg] = useState('')

  const handleDelete = async (domain: string) => {
    if (!confirm(`Are you sure you want to DELETE ${domain}? This action is IRREVERSIBLE!`)) return
    if (!confirm(`FINAL CONFIRMATION: Delete ${domain} and ALL its data?`)) return
    setDeleting(domain); setMsg('')
    const ok = await cyberPanelAPI.deleteWebsite(domain)
    if (ok) {
      await removeWebsiteFromSupabase(domain)
      onRefresh()
    }
    setMsg(ok ? `${domain} deleted successfully.` : `Error deleting ${domain}.`)
    setDeleting('')
  }

  return (
    <div className="space-y-6 max-w-5xl">
      <div><h1 className="text-3xl font-bold text-gray-900">Delete Website</h1><p className="text-gray-500 mt-1 text-red-600 font-medium">Warning: Deleting a website is permanent and cannot be undone.</p></div>
      {msg && <div className={`px-4 py-2.5 rounded-lg text-sm font-medium ${msg.includes('success') ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>{msg}</div>}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead><tr className="text-left text-xs font-bold text-gray-500 uppercase border-b bg-gray-50"><th className="px-4 py-3">Domain</th><th className="px-4 py-3">Package</th><th className="px-4 py-3">Owner</th><th className="px-4 py-3 w-32">Action</th></tr></thead>
          <tbody>{sites.map((s, i) => (
            <tr key={i} className="border-b border-gray-50 hover:bg-gray-50">
              <td className="px-4 py-3 font-bold">{s.domain}</td>
              <td className="px-4 py-3 text-gray-600">{s.package}</td>
              <td className="px-4 py-3 text-gray-600">{s.owner}</td>
              <td className="px-4 py-3">
                <button onClick={() => handleDelete(s.domain)} disabled={deleting === s.domain} className="bg-red-600 hover:bg-red-700 text-white px-3 py-1.5 rounded-lg text-xs font-bold transition-all disabled:opacity-50 flex items-center gap-1">
                  {deleting === s.domain ? <RefreshCw className="w-3 h-3 animate-spin" /> : <Trash2 className="w-3 h-3" />} Delete
                </button>
              </td>
            </tr>
          ))}</tbody>
        </table>
      </div>
    </div>
  )
}

// ============================================================
// WORDPRESS LIST SECTION
// ============================================================
export function WPListSection({ sites }: { sites: CyberPanelWebsite[] }) {
  const [wpSites, setWpSites] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [installingLS, setInstallingLS] = useState<string | null>(null)
  const [lsMsg, setLsMsg] = useState<{ domain: string; ok: boolean; text: string } | null>(null)

  useEffect(() => { (async () => { setLoading(true); const data = await cyberPanelAPI.listWordPress(); setWpSites(data); setLoading(false) })() }, [])

  const handleInstallLiteSpeed = async (domain: string) => {
    setInstallingLS(domain); setLsMsg(null)
    const ok = await cyberPanelAPI.installWPPlugin(domain, 'litespeed-cache')
    setLsMsg({ domain, ok, text: ok ? 'LiteSpeed Cache instalado!' : 'Erro ao instalar LiteSpeed Cache.' })
    setInstallingLS(null)
  }

  const allSites = wpSites.length > 0
    ? wpSites.map((wp: any) => ({ domain: wp.domain || wp.domainName, version: wp.version || null, owner: wp.owner || '' }))
    : sites.map(s => ({ domain: s.domain, version: null, owner: s.owner }))

  return (
    <div className="space-y-6 max-w-5xl">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Painel WP Admin</h1>
        <p className="text-gray-500 mt-1">Acesso directo ao painel de administração WordPress de cada site.</p>
      </div>

      {loading ? (
        <div className="py-16 text-center"><RefreshCw className="w-8 h-8 animate-spin text-gray-400 mx-auto" /></div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {allSites.map((s, i) => (
            <div key={i} className="bg-white rounded-lg border border-gray-200 shadow-sm p-5 space-y-4 hover:shadow-md transition-shadow">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-xl bg-indigo-100 flex items-center justify-center shrink-0">
                  <Globe className="w-5 h-5 text-indigo-600" />
                </div>
                <div className="min-w-0">
                  <p className="font-bold text-gray-900 truncate text-sm">{s.domain}</p>
                  <p className="text-xs text-gray-400">{s.owner || 'admin'}{s.version ? ` · WP ${s.version}` : ''}</p>
                </div>
              </div>
              <div className="space-y-2">
                <a
                  href={`https://${s.domain}/wp-admin`}
                  target="_blank" rel="noopener noreferrer"
                  className="w-full bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold py-2.5 px-4 rounded-lg transition-all flex items-center justify-center gap-2">
                  <ExternalLink className="w-3.5 h-3.5" /> Abrir WP Admin
                </a>
                <a
                  href={`https://109.199.104.22:8090/filemanager/?path=/home/${s.owner || 'admin'}/public_html`}
                  target="_blank" rel="noopener noreferrer"
                  className="w-full bg-amber-50 hover:bg-amber-100 text-amber-700 text-xs font-bold py-2 px-4 rounded-lg border border-amber-200 transition-all flex items-center justify-center gap-2">
                  <FolderOpen className="w-3.5 h-3.5" /> Ficheiros WordPress
                </a>
                <button
                  onClick={() => handleInstallLiteSpeed(s.domain)}
                  disabled={installingLS === s.domain}
                  className="w-full bg-green-50 hover:bg-green-100 text-green-700 text-xs font-bold py-2 px-4 rounded-lg border border-green-200 transition-all flex items-center justify-center gap-2 disabled:opacity-60">
                  {installingLS === s.domain
                    ? <><RefreshCw className="w-3.5 h-3.5 animate-spin" /> A instalar...</>
                    : <><Layers className="w-3.5 h-3.5" /> Instalar LiteSpeed Cache</>}
                </button>
                {lsMsg && lsMsg.domain === s.domain && (
                  <p className={`text-[10px] font-bold text-center py-1 rounded ${lsMsg.ok ? 'text-green-700 bg-green-50' : 'text-red-700 bg-red-50'}`}>{lsMsg.text}</p>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {!loading && allSites.length === 0 && (
        <div className="py-16 text-center text-gray-400">
          <Globe className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p className="font-medium">Nenhum site encontrado.</p>
          <p className="text-sm mt-1">Instala um WordPress primeiro na secção "Instalar WordPress".</p>
        </div>
      )}
    </div>
  )
}

// ============================================================
// WORDPRESS PLUGINS SECTION
// ============================================================
export function WPPluginsSection({ sites }: { sites: CyberPanelWebsite[] }) {
  const [selectedDomain, setSelectedDomain] = useState('')
  const [plugins, setPlugins] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [toggling, setToggling] = useState('')
  const [msg, setMsg] = useState('')

  const loadPlugins = async (domain: string) => {
    if (!domain) return
    setLoading(true)
    const data = await cyberPanelAPI.listWPPlugins(domain)
    setPlugins(data)
    setLoading(false)
  }

  const handleToggle = async (pluginName: string, activate: boolean) => {
    setToggling(pluginName); setMsg('')
    const ok = await cyberPanelAPI.toggleWPPlugin(selectedDomain, pluginName, activate)
    setMsg(ok ? `Plugin ${activate ? 'activated' : 'deactivated'}!` : 'Error toggling plugin.')
    setToggling('')
    if (ok) loadPlugins(selectedDomain)
  }

  return (
    <div className="space-y-6 max-w-5xl">
      <div><h1 className="text-3xl font-bold text-gray-900">Configure Plugins</h1><p className="text-gray-500 mt-1">Manage WordPress plugins for your websites.</p></div>
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="mb-6">
          <label className="text-xs font-bold text-gray-600 uppercase block mb-1.5">Website</label>
          <select value={selectedDomain} onChange={(e) => { setSelectedDomain(e.target.value); loadPlugins(e.target.value) }}
            className="w-full max-w-sm px-3 py-2.5 border border-gray-300 rounded-lg text-sm"><option value="">Select...</option>
            {sites.map(s => <option key={s.domain} value={s.domain}>{s.domain}</option>)}
          </select>
        </div>
        {msg && <div className={`mb-4 px-4 py-2.5 rounded-lg text-sm font-medium ${msg.includes('!') && !msg.includes('Error') ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>{msg}</div>}
        {loading ? <div className="py-12 text-center"><RefreshCw className="w-8 h-8 animate-spin text-gray-400 mx-auto" /></div> : plugins.length > 0 ? (
          <div className="space-y-2">{plugins.map((p, i) => (
            <div key={i} className="flex items-center justify-between p-3 border border-gray-200 rounded-lg hover:bg-gray-50">
              <div className="flex items-center gap-3">
                <Plug className="w-5 h-5 text-gray-400" />
                <div><p className="font-bold text-sm">{p.name || p.pluginName}</p><p className="text-xs text-gray-500">{p.version || ''}</p></div>
              </div>
              <button onClick={() => handleToggle(p.name || p.pluginName, !p.active)} disabled={toggling === (p.name || p.pluginName)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${p.active ? 'bg-red-100 text-red-700 hover:bg-red-200' : 'bg-green-100 text-green-700 hover:bg-green-200'}`}>
                {toggling === (p.name || p.pluginName) ? <RefreshCw className="w-3 h-3 animate-spin" /> : p.active ? 'Deactivate' : 'Activate'}
              </button>
            </div>
          ))}</div>
        ) : selectedDomain ? <p className="text-sm text-gray-400 text-center py-8">No plugins found or unable to fetch. Ensure WordPress is installed on this domain.</p> : null}
      </div>
    </div>
  )
}

// ============================================================
// WORDPRESS RESTORE BACKUPS SECTION
// ============================================================
export function WPRestoreBackupSection({ sites }: { sites: CyberPanelWebsite[] }) {
  const [selectedDomain, setSelectedDomain] = useState('')
  const [backups, setBackups] = useState<string[]>([])
  const [loading, setLoading] = useState(false)
  const [restoring, setRestoring] = useState('')
  const [msg, setMsg] = useState('')

  const loadBackups = async (domain: string) => {
    if (!domain) return
    setLoading(true)
    const data = await cyberPanelAPI.listWPBackups(domain)
    setBackups(data)
    setLoading(false)
  }

  const handleRestore = async (backupFile: string) => {
    if (!confirm(`Restore backup ${backupFile}?`)) return
    setRestoring(backupFile); setMsg('')
    const ok = await cyberPanelAPI.restoreWPBackup(selectedDomain, backupFile)
    setMsg(ok ? 'Backup restored successfully!' : 'Error restoring backup.')
    setRestoring('')
  }

  return (
    <div className="space-y-6 max-w-5xl">
      <div><h1 className="text-3xl font-bold text-gray-900">Restore Backups</h1><p className="text-gray-500 mt-1">Restore WordPress from a previous backup.</p></div>
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="mb-6">
          <label className="text-xs font-bold text-gray-600 uppercase block mb-1.5">Website</label>
          <select value={selectedDomain} onChange={(e) => { setSelectedDomain(e.target.value); loadBackups(e.target.value) }}
            className="w-full max-w-sm px-3 py-2.5 border border-gray-300 rounded-lg text-sm"><option value="">Select...</option>
            {sites.map(s => <option key={s.domain} value={s.domain}>{s.domain}</option>)}
          </select>
        </div>
        {msg && <div className={`mb-4 px-4 py-2.5 rounded-lg text-sm font-medium ${msg.includes('success') ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>{msg}</div>}
        {loading ? <div className="py-12 text-center"><RefreshCw className="w-8 h-8 animate-spin text-gray-400 mx-auto" /></div> : backups.length > 0 ? (
          <div className="space-y-2">{backups.map((b, i) => (
            <div key={i} className="flex items-center justify-between p-3 border border-gray-200 rounded-lg hover:bg-gray-50">
              <div className="flex items-center gap-3"><Download className="w-5 h-5 text-gray-400" /><span className="font-mono text-sm">{b}</span></div>
              <button onClick={() => handleRestore(b)} disabled={restoring === b} className="bg-black hover:bg-red-600 text-white px-3 py-1.5 rounded-lg text-xs font-bold transition-all disabled:opacity-50 flex items-center gap-1">
                {restoring === b ? <RefreshCw className="w-3 h-3 animate-spin" /> : <RotateCcw className="w-3 h-3" />} Restore
              </button>
            </div>
          ))}</div>
        ) : selectedDomain ? <p className="text-sm text-gray-400 text-center py-8">No backups found for this domain.</p> : null}
      </div>
    </div>
  )
}

// ============================================================
// WORDPRESS REMOTE BACKUP SECTION
// ============================================================
export function WPRemoteBackupSection({ sites }: { sites: CyberPanelWebsite[] }) {
  const [selectedDomain, setSelectedDomain] = useState('')
  const [destination, setDestination] = useState('')
  const [creating, setCreating] = useState(false)
  const [msg, setMsg] = useState('')

  const handleCreate = async () => {
    if (!selectedDomain) return
    setCreating(true); setMsg('')
    const ok = await cyberPanelAPI.createRemoteBackup(selectedDomain, destination)
    setMsg(ok ? 'Remote backup initiated!' : 'Error creating remote backup.')
    setCreating(false)
  }

  return (
    <div className="space-y-6 max-w-5xl">
      <div><h1 className="text-3xl font-bold text-gray-900">Remote Backup</h1><p className="text-gray-500 mt-1">Create a remote backup of your WordPress site.</p></div>
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          <div>
            <label className="text-xs font-bold text-gray-600 uppercase block mb-1.5">Website</label>
            <select value={selectedDomain} onChange={(e) => setSelectedDomain(e.target.value)}
              className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm"><option value="">Select...</option>
              {sites.map(s => <option key={s.domain} value={s.domain}>{s.domain}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs font-bold text-gray-600 uppercase block mb-1.5">Destination (optional)</label>
            <input value={destination} onChange={(e) => setDestination(e.target.value)} placeholder="s3://bucket or sftp://..." className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm" />
          </div>
        </div>
        {msg && <div className={`mb-4 px-4 py-2.5 rounded-lg text-sm font-medium ${msg.includes('initiated') ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>{msg}</div>}
        <button onClick={handleCreate} disabled={creating || !selectedDomain} className="bg-black hover:bg-red-600 text-white px-5 py-2.5 rounded-lg text-sm font-bold transition-all disabled:opacity-50 flex items-center gap-2">
          {creating ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />} Create Remote Backup
        </button>
      </div>
    </div>
  )
}

// ============================================================
// DNS NAMESERVER SECTION
// ============================================================
export function DNSNameserverSection({ sites }: { sites: CyberPanelWebsite[] }) {
  const [selectedDomain, setSelectedDomain] = useState('')
  const [ns1, setNs1] = useState('ns1.')
  const [ns1IP, setNs1IP] = useState('')
  const [ns2, setNs2] = useState('ns2.')
  const [ns2IP, setNs2IP] = useState('')
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState('')

  const handleCreate = async () => {
    if (!selectedDomain || !ns1 || !ns1IP || !ns2 || !ns2IP) return
    setSaving(true); setMsg('')
    const ok = await cyberPanelAPI.createNameserver(selectedDomain, ns1, ns1IP, ns2, ns2IP)
    setMsg(ok ? 'Nameservers created!' : 'Error creating nameservers.')
    setSaving(false)
  }

  return (
    <div className="space-y-6 max-w-5xl">
      <div><h1 className="text-3xl font-bold text-gray-900">Create Nameserver</h1><p className="text-gray-500 mt-1">Create child nameservers for your domain.</p></div>
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
          <div className="lg:col-span-3">
            <label className="text-xs font-bold text-gray-600 uppercase block mb-1.5">Domain</label>
            <select value={selectedDomain} onChange={(e) => { setSelectedDomain(e.target.value); setNs1(`ns1.${e.target.value}`); setNs2(`ns2.${e.target.value}`) }}
              className="w-full max-w-sm px-3 py-2.5 border border-gray-300 rounded-lg text-sm"><option value="">Select...</option>
              {sites.map(s => <option key={s.domain} value={s.domain}>{s.domain}</option>)}
            </select>
          </div>
          <div><label className="text-xs font-bold text-gray-600 uppercase block mb-1.5">NS1</label><input value={ns1} onChange={(e) => setNs1(e.target.value)} className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm font-mono" /></div>
          <div><label className="text-xs font-bold text-gray-600 uppercase block mb-1.5">NS1 IP</label><input value={ns1IP} onChange={(e) => setNs1IP(e.target.value)} placeholder="109.199.104.22" className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm font-mono" /></div>
          <div></div>
          <div><label className="text-xs font-bold text-gray-600 uppercase block mb-1.5">NS2</label><input value={ns2} onChange={(e) => setNs2(e.target.value)} className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm font-mono" /></div>
          <div><label className="text-xs font-bold text-gray-600 uppercase block mb-1.5">NS2 IP</label><input value={ns2IP} onChange={(e) => setNs2IP(e.target.value)} placeholder="109.199.104.22" className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm font-mono" /></div>
        </div>
        {msg && <div className={`mb-4 px-4 py-2.5 rounded-lg text-sm font-medium ${msg.includes('created') ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>{msg}</div>}
        <button onClick={handleCreate} disabled={saving || !selectedDomain} className="bg-black hover:bg-red-600 text-white px-5 py-2.5 rounded-lg text-sm font-bold transition-all disabled:opacity-50 flex items-center gap-2">
          {saving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Server className="w-4 h-4" />} Create Nameservers
        </button>
      </div>
    </div>
  )
}

// ============================================================
// DNS DEFAULT NAMESERVERS SECTION
// ============================================================
export function DNSDefaultNSSection() {
  const [ns1, setNs1] = useState('')
  const [ns2, setNs2] = useState('')
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState('')

  const handleSave = async () => {
    if (!ns1 || !ns2) return
    setSaving(true); setMsg('')
    const ok = await cyberPanelAPI.configDefaultNameservers(ns1, ns2)
    setMsg(ok ? 'Default nameservers configured!' : 'Error configuring nameservers.')
    setSaving(false)
  }

  return (
    <div className="space-y-6 max-w-5xl">
      <div><h1 className="text-3xl font-bold text-gray-900">Config Default Nameservers</h1><p className="text-gray-500 mt-1">Set the default nameservers for new websites.</p></div>
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          <div><label className="text-xs font-bold text-gray-600 uppercase block mb-1.5">Nameserver 1</label><input value={ns1} onChange={(e) => setNs1(e.target.value)} placeholder="ns1.yourdomain.com" className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm font-mono" /></div>
          <div><label className="text-xs font-bold text-gray-600 uppercase block mb-1.5">Nameserver 2</label><input value={ns2} onChange={(e) => setNs2(e.target.value)} placeholder="ns2.yourdomain.com" className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm font-mono" /></div>
        </div>
        {msg && <div className={`mb-4 px-4 py-2.5 rounded-lg text-sm font-medium ${msg.includes('configured') ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>{msg}</div>}
        <button onClick={handleSave} disabled={saving || !ns1 || !ns2} className="bg-black hover:bg-red-600 text-white px-5 py-2.5 rounded-lg text-sm font-bold transition-all disabled:opacity-50 flex items-center gap-2">
          {saving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Settings className="w-4 h-4" />} Save Configuration
        </button>
      </div>
    </div>
  )
}

// ============================================================
// DNS ZONE CREATE/DELETE SECTIONS
// ============================================================
export function DNSCreateZoneSection({ sites }: { sites: CyberPanelWebsite[] }) {
  const [domain, setDomain] = useState('')
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState('')

  const handleCreate = async () => {
    if (!domain) return
    setSaving(true); setMsg('')
    const ok = await cyberPanelAPI.createDNSZone(domain)
    setMsg(ok ? `DNS zone created for ${domain}!` : 'Error creating DNS zone.')
    setSaving(false)
  }

  return (
    <div className="space-y-6 max-w-5xl">
      <div><h1 className="text-3xl font-bold text-gray-900">Create DNS Zone</h1><p className="text-gray-500 mt-1">Create a new DNS zone for a domain.</p></div>
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex gap-3 items-end mb-6">
          <div className="flex-1 max-w-sm">
            <label className="text-xs font-bold text-gray-600 uppercase block mb-1.5">Domain</label>
            <select value={domain} onChange={(e) => setDomain(e.target.value)} className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm">
              <option value="">Select...</option>{sites.map(s => <option key={s.domain} value={s.domain}>{s.domain}</option>)}
            </select>
          </div>
          <button onClick={handleCreate} disabled={saving || !domain} className="bg-black hover:bg-red-600 text-white px-5 py-2.5 rounded-lg text-sm font-bold transition-all disabled:opacity-50 flex items-center gap-2">
            {saving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <PlusCircle className="w-4 h-4" />} Create Zone
          </button>
        </div>
        {msg && <div className={`px-4 py-2.5 rounded-lg text-sm font-medium ${msg.includes('created') ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>{msg}</div>}
      </div>
    </div>
  )
}

export function DNSDeleteZoneSection({ sites }: { sites: CyberPanelWebsite[] }) {
  const [domain, setDomain] = useState('')
  const [deleting, setDeleting] = useState(false)
  const [msg, setMsg] = useState('')

  const handleDelete = async () => {
    if (!domain || !confirm(`Delete DNS zone for ${domain}?`)) return
    setDeleting(true); setMsg('')
    const ok = await cyberPanelAPI.deleteDNSZone(domain)
    setMsg(ok ? `DNS zone deleted for ${domain}!` : 'Error deleting DNS zone.')
    setDeleting(false)
  }

  return (
    <div className="space-y-6 max-w-5xl">
      <div><h1 className="text-3xl font-bold text-gray-900">Delete Zone</h1><p className="text-gray-500 mt-1">Delete a DNS zone for a domain.</p></div>
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex gap-3 items-end mb-6">
          <div className="flex-1 max-w-sm">
            <label className="text-xs font-bold text-gray-600 uppercase block mb-1.5">Domain</label>
            <select value={domain} onChange={(e) => setDomain(e.target.value)} className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm">
              <option value="">Select...</option>{sites.map(s => <option key={s.domain} value={s.domain}>{s.domain}</option>)}
            </select>
          </div>
          <button onClick={handleDelete} disabled={deleting || !domain} className="bg-red-600 hover:bg-red-700 text-white px-5 py-2.5 rounded-lg text-sm font-bold transition-all disabled:opacity-50 flex items-center gap-2">
            {deleting ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />} Delete Zone
          </button>
        </div>
        {msg && <div className={`px-4 py-2.5 rounded-lg text-sm font-medium ${msg.includes('deleted') ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>{msg}</div>}
      </div>
    </div>
  )
}

// ============================================================
// CLOUDFLARE SECTION
// ============================================================
export function CloudFlareSection({ sites }: { sites: CyberPanelWebsite[] }) {
  const [selectedDomain, setSelectedDomain] = useState('')
  const [email, setEmail] = useState('')
  const [apiKey, setApiKey] = useState('')
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState('')

  const handleSave = async () => {
    if (!selectedDomain || !email || !apiKey) return
    setSaving(true); setMsg('')
    const ok = await cyberPanelAPI.configCloudFlare(selectedDomain, email, apiKey)
    setMsg(ok ? 'CloudFlare configured!' : 'Error configuring CloudFlare.')
    setSaving(false)
  }

  return (
    <div className="space-y-6 max-w-5xl">
      <div><h1 className="text-3xl font-bold text-gray-900">CloudFlare</h1><p className="text-gray-500 mt-1">Configure CloudFlare integration for your domain.</p></div>
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div><label className="text-xs font-bold text-gray-600 uppercase block mb-1.5">Domain</label>
            <select value={selectedDomain} onChange={(e) => setSelectedDomain(e.target.value)} className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm">
              <option value="">Select...</option>{sites.map(s => <option key={s.domain} value={s.domain}>{s.domain}</option>)}
            </select>
          </div>
          <div><label className="text-xs font-bold text-gray-600 uppercase block mb-1.5">CloudFlare Email</label><input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="user@email.com" className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm" /></div>
          <div><label className="text-xs font-bold text-gray-600 uppercase block mb-1.5">API Key</label><input type="password" value={apiKey} onChange={(e) => setApiKey(e.target.value)} placeholder="••••••" className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm" /></div>
        </div>
        {msg && <div className={`mb-4 px-4 py-2.5 rounded-lg text-sm font-medium ${msg.includes('configured') ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>{msg}</div>}
        <button onClick={handleSave} disabled={saving || !selectedDomain || !email || !apiKey} className="bg-black hover:bg-red-600 text-white px-5 py-2.5 rounded-lg text-sm font-bold transition-all disabled:opacity-50 flex items-center gap-2">
          {saving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Cloud className="w-4 h-4" />} Configure CloudFlare
        </button>
      </div>
    </div>
  )
}

// ============================================================
// DNS RESET SECTION
// ============================================================
export function DNSResetSection({ sites }: { sites: CyberPanelWebsite[] }) {
  const [domain, setDomain] = useState('')
  const [resetting, setResetting] = useState(false)
  const [msg, setMsg] = useState('')

  const handleReset = async () => {
    if (!domain || !confirm(`Reset ALL DNS configurations for ${domain}? This cannot be undone!`)) return
    setResetting(true); setMsg('')
    const ok = await cyberPanelAPI.resetDNSConfigurations(domain)
    setMsg(ok ? `DNS configurations reset for ${domain}!` : 'Error resetting DNS.')
    setResetting(false)
  }

  return (
    <div className="space-y-6 max-w-5xl">
      <div><h1 className="text-3xl font-bold text-gray-900">Reset DNS Configurations</h1><p className="text-gray-500 mt-1 text-red-600 font-medium">Warning: This will reset all DNS records to default.</p></div>
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex gap-3 items-end mb-6">
          <div className="flex-1 max-w-sm">
            <label className="text-xs font-bold text-gray-600 uppercase block mb-1.5">Domain</label>
            <select value={domain} onChange={(e) => setDomain(e.target.value)} className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm">
              <option value="">Select...</option>{sites.map(s => <option key={s.domain} value={s.domain}>{s.domain}</option>)}
            </select>
          </div>
          <button onClick={handleReset} disabled={resetting || !domain} className="bg-red-600 hover:bg-red-700 text-white px-5 py-2.5 rounded-lg text-sm font-bold transition-all disabled:opacity-50 flex items-center gap-2">
            {resetting ? <RefreshCw className="w-4 h-4 animate-spin" /> : <RotateCcw className="w-4 h-4" />} Reset DNS
          </button>
        </div>
        {msg && <div className={`px-4 py-2.5 rounded-lg text-sm font-medium ${msg.includes('reset') ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>{msg}</div>}
      </div>
    </div>
  )
}

// ============================================================
// EMAIL DELETE SECTION
// ============================================================
export function EmailDeleteSection({ sites }: { sites: CyberPanelWebsite[] }) {
  const [selectedDomain, setSelectedDomain] = useState('')
  const [emails, setEmails] = useState<CyberPanelEmail[]>([])
  const [loading, setLoading] = useState(false)
  const [deleting, setDeleting] = useState('')
  const [msg, setMsg] = useState('')

  const loadEmails = async (domain: string) => { if (!domain) return; setLoading(true); const data = await cyberPanelAPI.listEmails(domain); setEmails(data); setLoading(false) }

  const handleDelete = async (email: string) => {
    if (!confirm(`Delete ${email}?`)) return
    setDeleting(email); setMsg('')
    const ok = await cyberPanelAPI.deleteEmail(selectedDomain, email)
    setMsg(ok ? `${email} deleted!` : 'Error deleting email.')
    setDeleting('')
    if (ok) loadEmails(selectedDomain)
  }

  return (
    <div className="space-y-6 max-w-5xl">
      <div><h1 className="text-3xl font-bold text-gray-900">Delete Email</h1><p className="text-gray-500 mt-1">Delete email accounts from a domain.</p></div>
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="mb-6"><label className="text-xs font-bold text-gray-600 uppercase block mb-1.5">Domain</label>
          <select value={selectedDomain} onChange={(e) => { setSelectedDomain(e.target.value); loadEmails(e.target.value) }} className="w-full max-w-sm px-3 py-2.5 border border-gray-300 rounded-lg text-sm">
            <option value="">Select...</option>{sites.map(s => <option key={s.domain} value={s.domain}>{s.domain}</option>)}
          </select>
        </div>
        {msg && <div className={`mb-4 px-4 py-2.5 rounded-lg text-sm font-medium ${msg.includes('deleted') ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>{msg}</div>}
        {loading ? <div className="py-8 text-center"><RefreshCw className="w-6 h-6 animate-spin text-gray-400 mx-auto" /></div> : emails.length > 0 ? (
          <div className="space-y-2">{emails.map((em, i) => (
            <div key={i} className="flex items-center justify-between p-3 border border-gray-200 rounded-lg hover:bg-gray-50">
              <div className="flex items-center gap-3"><Mail className="w-5 h-5 text-red-500" /><span className="font-bold text-sm">{em.email}</span></div>
              <button onClick={() => handleDelete(em.email)} disabled={deleting === em.email} className="bg-red-600 hover:bg-red-700 text-white px-3 py-1.5 rounded-lg text-xs font-bold transition-all disabled:opacity-50 flex items-center gap-1">
                {deleting === em.email ? <RefreshCw className="w-3 h-3 animate-spin" /> : <Trash2 className="w-3 h-3" />} Delete
              </button>
            </div>
          ))}</div>
        ) : selectedDomain ? <p className="text-sm text-gray-400 text-center py-8">No emails found.</p> : null}
      </div>
    </div>
  )
}

// ============================================================
// EMAIL LIMITS SECTION
// ============================================================
export function EmailLimitsSection({ sites }: { sites: CyberPanelWebsite[] }) {
  const [selectedDomain, setSelectedDomain] = useState('')
  const [emails, setEmails] = useState<CyberPanelEmail[]>([])
  const [loading, setLoading] = useState(false)
  const [editingEmail, setEditingEmail] = useState('')
  const [limit, setLimit] = useState('500')
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState('')

  const loadEmails = async (domain: string) => { if (!domain) return; setLoading(true); const data = await cyberPanelAPI.listEmails(domain); setEmails(data); setLoading(false) }

  const handleSave = async (email: string) => {
    setSaving(true); setMsg('')
    const ok = await cyberPanelAPI.setEmailLimits(selectedDomain, email, parseInt(limit))
    setMsg(ok ? 'Limit updated!' : 'Error updating limit.')
    setSaving(false); setEditingEmail('')
  }

  return (
    <div className="space-y-6 max-w-5xl">
      <div><h1 className="text-3xl font-bold text-gray-900">Email Limits</h1><p className="text-gray-500 mt-1">Set sending limits for email accounts.</p></div>
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="mb-6"><label className="text-xs font-bold text-gray-600 uppercase block mb-1.5">Domain</label>
          <select value={selectedDomain} onChange={(e) => { setSelectedDomain(e.target.value); loadEmails(e.target.value) }} className="w-full max-w-sm px-3 py-2.5 border border-gray-300 rounded-lg text-sm">
            <option value="">Select...</option>{sites.map(s => <option key={s.domain} value={s.domain}>{s.domain}</option>)}
          </select>
        </div>
        {msg && <div className={`mb-4 px-4 py-2.5 rounded-lg text-sm font-medium ${msg.includes('updated') ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>{msg}</div>}
        {loading ? <div className="py-8 text-center"><RefreshCw className="w-6 h-6 animate-spin text-gray-400 mx-auto" /></div> : emails.length > 0 ? (
          <div className="space-y-2">{emails.map((em, i) => (
            <div key={i} className="flex items-center justify-between p-3 border border-gray-200 rounded-lg hover:bg-gray-50">
              <div className="flex items-center gap-3"><Mail className="w-5 h-5 text-gray-400" /><span className="font-bold text-sm">{em.email}</span></div>
              {editingEmail === em.email ? (
                <div className="flex items-center gap-2">
                  <input value={limit} onChange={(e) => setLimit(e.target.value)} className="w-24 px-2 py-1 border border-gray-300 rounded text-sm" placeholder="500" />
                  <button onClick={() => handleSave(em.email)} disabled={saving} className="bg-black hover:bg-red-600 text-white px-3 py-1 rounded text-xs font-bold">Save</button>
                </div>
              ) : (
                <button onClick={() => { setEditingEmail(em.email); setLimit('500') }} className="text-xs bg-gray-100 hover:bg-gray-200 px-3 py-1.5 rounded-md font-medium">Set Limit</button>
              )}
            </div>
          ))}</div>
        ) : selectedDomain ? <p className="text-sm text-gray-400 text-center py-8">No emails found.</p> : null}
      </div>
    </div>
  )
}

// ============================================================
// EMAIL FORWARDING SECTION
// ============================================================
export function EmailForwardingSection({ sites }: { sites: CyberPanelWebsite[] }) {
  const [selectedDomain, setSelectedDomain] = useState('')
  const [emails, setEmails] = useState<CyberPanelEmail[]>([])
  const [loading, setLoading] = useState(false)
  const [selectedEmail, setSelectedEmail] = useState('')
  const [forwards, setForwards] = useState<string[]>([])
  const [forwardTo, setForwardTo] = useState('')
  const [msg, setMsg] = useState('')

  const loadEmails = async (domain: string) => { if (!domain) return; setLoading(true); const data = await cyberPanelAPI.listEmails(domain); setEmails(data); setLoading(false) }

  const loadForwards = async (email: string) => {
    setSelectedEmail(email)
    const fwds = await cyberPanelAPI.getEmailForwarding(selectedDomain, email)
    setForwards(fwds)
  }

  const handleAdd = async () => {
    if (!selectedEmail || !forwardTo) return
    const ok = await cyberPanelAPI.addEmailForwarding(selectedDomain, selectedEmail, forwardTo)
    if (ok) { setForwardTo(''); loadForwards(selectedEmail) }
    else setMsg('Error adding forwarding.')
  }

  return (
    <div className="space-y-6 max-w-5xl">
      <div><h1 className="text-3xl font-bold text-gray-900">Email Forwarding</h1><p className="text-gray-500 mt-1">Configure email forwarding rules.</p></div>
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="mb-6"><label className="text-xs font-bold text-gray-600 uppercase block mb-1.5">Domain</label>
          <select value={selectedDomain} onChange={(e) => { setSelectedDomain(e.target.value); loadEmails(e.target.value); setSelectedEmail('') }} className="w-full max-w-sm px-3 py-2.5 border border-gray-300 rounded-lg text-sm">
            <option value="">Select...</option>{sites.map(s => <option key={s.domain} value={s.domain}>{s.domain}</option>)}
          </select>
        </div>
        {msg && <div className="mb-4 px-4 py-2.5 rounded-lg text-sm font-medium bg-red-50 text-red-700 border border-red-200">{msg}</div>}
        {loading ? <div className="py-8 text-center"><RefreshCw className="w-6 h-6 animate-spin text-gray-400 mx-auto" /></div> : emails.length > 0 ? (
          <div className="space-y-2">{emails.map((em, i) => (
            <div key={i} className="border border-gray-200 rounded-lg p-3 hover:bg-gray-50">
              <div className="flex items-center justify-between cursor-pointer" onClick={() => loadForwards(em.email)}>
                <div className="flex items-center gap-3"><Mail className="w-5 h-5 text-gray-400" /><span className="font-bold text-sm">{em.email}</span></div>
                <ArrowRight className="w-4 h-4 text-gray-400" />
              </div>
              {selectedEmail === em.email && (
                <div className="mt-3 pt-3 border-t">
                  <div className="flex gap-2 mb-2">
                    <input value={forwardTo} onChange={(e) => setForwardTo(e.target.value)} placeholder="forward@email.com" className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm" />
                    <button onClick={handleAdd} className="bg-black hover:bg-red-600 text-white px-4 py-2 rounded-lg text-sm font-bold">Add</button>
                  </div>
                  {forwards.length > 0 && <div className="flex flex-wrap gap-1">{forwards.map((f, fi) => <span key={fi} className="bg-gray-100 px-2 py-1 rounded text-xs">{f}</span>)}</div>}
                </div>
              )}
            </div>
          ))}</div>
        ) : selectedDomain ? <p className="text-sm text-gray-400 text-center py-8">No emails found.</p> : null}
      </div>
    </div>
  )
}

// ============================================================
// CATCH-ALL EMAIL SECTION
// ============================================================
export function CatchAllEmailSection({ sites }: { sites: CyberPanelWebsite[] }) {
  const [selectedDomain, setSelectedDomain] = useState('')
  const [catchAll, setCatchAll] = useState('')
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState('')

  const loadCatchAll = async (domain: string) => { if (!domain) return; setLoading(true); const ca = await cyberPanelAPI.getCatchAllEmail(domain); setCatchAll(ca || ''); setLoading(false) }

  const handleSave = async () => {
    if (!selectedDomain) return
    setSaving(true); setMsg('')
    const ok = await cyberPanelAPI.setCatchAllEmail(selectedDomain, catchAll)
    setMsg(ok ? 'Catch-all configured!' : 'Error configuring catch-all.')
    setSaving(false)
  }

  return (
    <div className="space-y-6 max-w-5xl">
      <div><h1 className="text-3xl font-bold text-gray-900">Catch-All Email</h1><p className="text-gray-500 mt-1">Configure a catch-all email address that receives all unmatched emails.</p></div>
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          <div><label className="text-xs font-bold text-gray-600 uppercase block mb-1.5">Domain</label>
            <select value={selectedDomain} onChange={(e) => { setSelectedDomain(e.target.value); loadCatchAll(e.target.value) }} className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm">
              <option value="">Select...</option>{sites.map(s => <option key={s.domain} value={s.domain}>{s.domain}</option>)}
            </select>
          </div>
          <div><label className="text-xs font-bold text-gray-600 uppercase block mb-1.5">Catch-All Email</label>
            {loading ? <div className="py-2"><RefreshCw className="w-4 h-4 animate-spin text-gray-400" /></div> :
            <input value={catchAll} onChange={(e) => setCatchAll(e.target.value)} placeholder="admin@domain.com" className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm" />}
          </div>
        </div>
        {msg && <div className={`mb-4 px-4 py-2.5 rounded-lg text-sm font-medium ${msg.includes('configured') ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>{msg}</div>}
        <button onClick={handleSave} disabled={saving || !selectedDomain} className="bg-black hover:bg-red-600 text-white px-5 py-2.5 rounded-lg text-sm font-bold transition-all disabled:opacity-50">
          {saving ? 'Saving...' : 'Save Catch-All'}
        </button>
      </div>
    </div>
  )
}

// ============================================================
// PATTERN FORWARDING SECTION
// ============================================================
export function PatternForwardingSection({ sites }: { sites: CyberPanelWebsite[] }) {
  const [selectedDomain, setSelectedDomain] = useState('')
  const [patterns, setPatterns] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [pattern, setPattern] = useState('')
  const [destination, setDestination] = useState('')
  const [msg, setMsg] = useState('')

  const loadPatterns = async (domain: string) => { if (!domain) return; setLoading(true); const data = await cyberPanelAPI.getPatternForwarding(domain); setPatterns(data); setLoading(false) }

  const handleAdd = async () => {
    if (!selectedDomain || !pattern || !destination) return
    const ok = await cyberPanelAPI.addPatternForwarding(selectedDomain, pattern, destination)
    if (ok) { setPattern(''); setDestination(''); loadPatterns(selectedDomain) }
    else setMsg('Error adding pattern.')
  }

  return (
    <div className="space-y-6 max-w-5xl">
      <div><h1 className="text-3xl font-bold text-gray-900">Pattern Forwarding</h1><p className="text-gray-500 mt-1">Forward emails matching a pattern to a destination.</p></div>
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div><label className="text-xs font-bold text-gray-600 uppercase block mb-1.5">Domain</label>
            <select value={selectedDomain} onChange={(e) => { setSelectedDomain(e.target.value); loadPatterns(e.target.value) }} className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm">
              <option value="">Select...</option>{sites.map(s => <option key={s.domain} value={s.domain}>{s.domain}</option>)}
            </select>
          </div>
          <div><label className="text-xs font-bold text-gray-600 uppercase block mb-1.5">Pattern</label><input value={pattern} onChange={(e) => setPattern(e.target.value)} placeholder="sales-*" className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm" /></div>
          <div><label className="text-xs font-bold text-gray-600 uppercase block mb-1.5">Destination</label><input value={destination} onChange={(e) => setDestination(e.target.value)} placeholder="team@email.com" className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm" /></div>
        </div>
        {msg && <div className="mb-4 px-4 py-2.5 rounded-lg text-sm font-medium bg-red-50 text-red-700 border border-red-200">{msg}</div>}
        <button onClick={handleAdd} disabled={!selectedDomain || !pattern || !destination} className="bg-black hover:bg-red-600 text-white px-5 py-2.5 rounded-lg text-sm font-bold transition-all disabled:opacity-50 mb-4">Add Pattern</button>
        {loading ? <div className="py-4 text-center"><RefreshCw className="w-6 h-6 animate-spin text-gray-400 mx-auto" /></div> : patterns.length > 0 && (
          <div className="space-y-2">{patterns.map((p, i) => <div key={i} className="flex items-center gap-3 p-2 bg-gray-50 rounded text-sm"><span className="font-mono">{p.pattern || p.source}</span><ArrowRight className="w-4 h-4 text-gray-400" /><span>{p.destination || p.target}</span></div>)}</div>
        )}
      </div>
    </div>
  )
}

// ============================================================
// PLUS-ADDRESSING SECTION
// ============================================================
export function PlusAddressingSection({ sites }: { sites: CyberPanelWebsite[] }) {
  const [selectedDomain, setSelectedDomain] = useState('')
  const [enabled, setEnabled] = useState(false)
  const [loading, setLoading] = useState(false)
  const [toggling, setToggling] = useState(false)
  const [msg, setMsg] = useState('')

  const loadStatus = async (domain: string) => { if (!domain) return; setLoading(true); const s = await cyberPanelAPI.getPlusAddressing(domain); setEnabled(s); setLoading(false) }

  const handleToggle = async () => {
    if (!selectedDomain) return
    setToggling(true); setMsg('')
    const ok = await cyberPanelAPI.togglePlusAddressing(selectedDomain, !enabled)
    if (ok) setEnabled(!enabled)
    else setMsg('Error toggling plus-addressing.')
    setToggling(false)
  }

  return (
    <div className="space-y-6 max-w-5xl">
      <div><h1 className="text-3xl font-bold text-gray-900">Plus-Addressing</h1><p className="text-gray-500 mt-1">Enable plus-addressing (user+tag@domain.com) for email accounts.</p></div>
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex gap-4 items-end mb-6">
          <div className="flex-1 max-w-sm"><label className="text-xs font-bold text-gray-600 uppercase block mb-1.5">Domain</label>
            <select value={selectedDomain} onChange={(e) => { setSelectedDomain(e.target.value); loadStatus(e.target.value) }} className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm">
              <option value="">Select...</option>{sites.map(s => <option key={s.domain} value={s.domain}>{s.domain}</option>)}
            </select>
          </div>
          {selectedDomain && !loading && (
            <button onClick={handleToggle} disabled={toggling} className={`px-4 py-2.5 rounded-lg text-sm font-bold transition-all ${enabled ? 'bg-red-100 text-red-700 hover:bg-red-200' : 'bg-green-100 text-green-700 hover:bg-green-200'}`}>
              {toggling ? <RefreshCw className="w-4 h-4 animate-spin" /> : enabled ? 'Disable' : 'Enable'}
            </button>
          )}
        </div>
        {loading && <div className="py-4"><RefreshCw className="w-6 h-6 animate-spin text-gray-400 mx-auto" /></div>}
        {msg && <div className="px-4 py-2.5 rounded-lg text-sm font-medium bg-red-50 text-red-700 border border-red-200">{msg}</div>}
        {selectedDomain && !loading && <p className="text-sm text-gray-600">Plus-addressing is currently <span className={`font-bold ${enabled ? 'text-green-600' : 'text-red-600'}`}>{enabled ? 'enabled' : 'disabled'}</span> for {selectedDomain}.</p>}
      </div>
    </div>
  )
}

// ============================================================
// EMAIL CHANGE PASSWORD SECTION
// ============================================================
export function EmailChangePasswordSection({ sites }: { sites: CyberPanelWebsite[] }) {
  const [selectedDomain, setSelectedDomain] = useState('')
  const [emails, setEmails] = useState<CyberPanelEmail[]>([])
  const [loading, setLoading] = useState(false)
  const [selectedEmail, setSelectedEmail] = useState('')
  const [newPass, setNewPass] = useState('')
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState('')

  const loadEmails = async (domain: string) => { if (!domain) return; setLoading(true); const data = await cyberPanelAPI.listEmails(domain); setEmails(data); setLoading(false) }

  const handleChange = async () => {
    if (!selectedEmail || !newPass) return
    setSaving(true); setMsg('')
    const ok = await cyberPanelAPI.changeEmailPassword(selectedDomain, selectedEmail, newPass)
    setMsg(ok ? 'Password changed!' : 'Error changing password.')
    setSaving(false); setNewPass('')
  }

  return (
    <div className="space-y-6 max-w-5xl">
      <div><h1 className="text-3xl font-bold text-gray-900">Change Password</h1><p className="text-gray-500 mt-1">Change the password for an email account.</p></div>
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div><label className="text-xs font-bold text-gray-600 uppercase block mb-1.5">Domain</label>
            <select value={selectedDomain} onChange={(e) => { setSelectedDomain(e.target.value); loadEmails(e.target.value); setSelectedEmail('') }} className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm">
              <option value="">Select...</option>{sites.map(s => <option key={s.domain} value={s.domain}>{s.domain}</option>)}
            </select>
          </div>
          <div><label className="text-xs font-bold text-gray-600 uppercase block mb-1.5">Email Account</label>
            {loading ? <div className="py-2"><RefreshCw className="w-4 h-4 animate-spin text-gray-400" /></div> :
            <select value={selectedEmail} onChange={(e) => setSelectedEmail(e.target.value)} className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm">
              <option value="">Select...</option>{emails.map(em => <option key={em.email} value={em.email}>{em.email}</option>)}
            </select>}
          </div>
          <div><label className="text-xs font-bold text-gray-600 uppercase block mb-1.5">New Password</label><input type="password" value={newPass} onChange={(e) => setNewPass(e.target.value)} placeholder="••••••" className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm" /></div>
        </div>
        {msg && <div className={`mb-4 px-4 py-2.5 rounded-lg text-sm font-medium ${msg.includes('changed') ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>{msg}</div>}
        <button onClick={handleChange} disabled={saving || !selectedEmail || !newPass} className="bg-black hover:bg-red-600 text-white px-5 py-2.5 rounded-lg text-sm font-bold transition-all disabled:opacity-50 flex items-center gap-2">
          {saving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Key className="w-4 h-4" />} Change Password
        </button>
      </div>
    </div>
  )
}

// ============================================================
// DKIM MANAGER SECTION
// ============================================================
export function DKIMManagerSection({ sites }: { sites: CyberPanelWebsite[] }) {
  const [selectedDomain, setSelectedDomain] = useState('')
  const [dkim, setDkim] = useState<{ enabled: boolean; record: string } | null>(null)
  const [loading, setLoading] = useState(false)
  const [enabling, setEnabling] = useState(false)
  const [msg, setMsg] = useState('')

  const loadDKIM = async (domain: string) => { if (!domain) return; setLoading(true); const data = await cyberPanelAPI.getDKIMStatus(domain); setDkim(data); setLoading(false) }

  const handleEnable = async () => {
    if (!selectedDomain) return
    setEnabling(true); setMsg('')
    const ok = await cyberPanelAPI.enableDKIM(selectedDomain)
    setMsg(ok ? 'DKIM enabled!' : 'Error enabling DKIM.')
    setEnabling(false)
    if (ok) loadDKIM(selectedDomain)
  }

  return (
    <div className="space-y-6 max-w-5xl">
      <div><h1 className="text-3xl font-bold text-gray-900">DKIM Manager</h1><p className="text-gray-500 mt-1">Manage DKIM (DomainKeys Identified Mail) for email authentication.</p></div>
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex gap-4 items-end mb-6">
          <div className="flex-1 max-w-sm"><label className="text-xs font-bold text-gray-600 uppercase block mb-1.5">Domain</label>
            <select value={selectedDomain} onChange={(e) => { setSelectedDomain(e.target.value); loadDKIM(e.target.value) }} className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm">
              <option value="">Select...</option>{sites.map(s => <option key={s.domain} value={s.domain}>{s.domain}</option>)}
            </select>
          </div>
          {selectedDomain && !loading && (
            <button onClick={handleEnable} disabled={enabling} className="bg-black hover:bg-red-600 text-white px-4 py-2.5 rounded-lg text-sm font-bold transition-all disabled:opacity-50 flex items-center gap-2">
              {enabling ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Shield className="w-4 h-4" />} {dkim?.enabled ? 'Regenerate DKIM' : 'Enable DKIM'}
            </button>
          )}
        </div>
        {msg && <div className={`mb-4 px-4 py-2.5 rounded-lg text-sm font-medium ${msg.includes('enabled') ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>{msg}</div>}
        {loading ? <div className="py-8 text-center"><RefreshCw className="w-6 h-6 animate-spin text-gray-400 mx-auto" /></div> : dkim && (
          <div>
            <p className="text-sm mb-2">Status: <span className={`font-bold ${dkim.enabled ? 'text-green-600' : 'text-red-600'}`}>{dkim.enabled ? 'Enabled' : 'Disabled'}</span></p>
            {dkim.record && <div className="bg-gray-50 border border-gray-200 rounded-lg p-3"><p className="text-xs font-bold text-gray-600 uppercase mb-1">DKIM Record</p><code className="text-xs font-mono text-gray-700 break-all">{dkim.record}</code></div>}
          </div>
        )}
      </div>
    </div>
  )
}

// ============================================================
// GIT DEPLOY SECTION
// ============================================================
export function GitDeploySection() {
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [deploying, setDeploying] = useState(false)
  const [commitMsg, setCommitMsg] = useState('')
  const [result, setResult] = useState<any>(null)

  const loadStatus = async () => {
    setLoading(true)
    try { setData(await (await fetch('/api/git-deploy')).json()) }
    catch { setData(null) }
    setLoading(false)
  }

  useEffect(() => { loadStatus() }, [])

  const handleDeploy = async () => {
    const isLocal = data?.isLocal
    if (isLocal && !commitMsg.trim()) return
    setDeploying(true); setResult(null)
    try {
      const res = await fetch('/api/git-deploy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(isLocal
          ? { action: 'git-push', message: commitMsg.trim() }
          : { action: 'deploy-hook' }
        )
      })
      const r = await res.json()
      setResult(r)
      if (r.success) { setCommitMsg(''); loadStatus() }
    } catch (e: any) { setResult({ success: false, error: e.message }) }
    setDeploying(false)
  }

  const isLocal: boolean = data?.isLocal ?? false
  const localGit = data?.localGit
  const repo = data?.repo
  const commits: any[] = data?.commits || []

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Deploy / GitHub</h1>
          <p className="text-gray-500 mt-1">
            {isLocal ? 'Modo local — commit + push → Vercel faz deploy automático.' : 'Modo produção — Vercel Deploy Hook.'}
          </p>
        </div>
        <button onClick={loadStatus} className="bg-gray-100 hover:bg-gray-200 text-gray-700 px-4 py-2 rounded-lg text-sm font-bold transition-all flex items-center gap-2">
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} /> Actualizar
        </button>
      </div>

      {/* Repo info */}
      <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6 space-y-5">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gray-900 rounded-xl flex items-center justify-center shrink-0">
            <svg className="w-6 h-6 text-white" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 0C5.374 0 0 5.373 0 12c0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23A11.509 11.509 0 0112 5.803c1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576C20.566 21.797 24 17.3 24 12c0-6.627-5.373-12-12-12z"/>
            </svg>
          </div>
          <div className="flex-1 min-w-0">
            {loading ? <div className="h-4 w-40 bg-gray-200 rounded animate-pulse" /> : repo ? (
              <>
                <a href={repo.url} target="_blank" rel="noopener noreferrer"
                  className="font-bold text-gray-900 hover:text-blue-600 flex items-center gap-1 text-sm">
                  {repo.fullName} <ExternalLink className="w-3 h-3" />
                </a>
                <p className="text-xs text-gray-400">branch: <span className="font-mono font-bold text-gray-700">{repo.branch}</span> · {repo.lastPush ? new Date(repo.lastPush).toLocaleString('pt-PT') : ''}</p>
              </>
            ) : <p className="text-sm text-amber-600">GitHub sem token — commits não visíveis (repositório público OK)</p>}
          </div>
          <span className={`text-[10px] font-bold px-2 py-1 rounded-full border shrink-0 ${isLocal ? 'bg-blue-50 text-blue-700 border-blue-200' : 'bg-green-50 text-green-700 border-green-200'}`}>
            {isLocal ? '⚡ Local Dev' : '☁ Produção'}
          </span>
        </div>

        {/* Local git status */}
        {isLocal && localGit && (
          <div className={`rounded-lg p-3 border text-sm ${localGit.hasChanges ? 'bg-amber-50 border-amber-200' : 'bg-green-50 border-green-200'}`}>
            <p className="font-bold text-xs uppercase text-gray-500 mb-1.5">Estado Git Local · branch <span className="font-mono text-gray-700">{localGit.branch}</span></p>
            {localGit.hasChanges ? (
              <div className="space-y-0.5 max-h-28 overflow-y-auto">
                {localGit.changedFiles.map((f: string, i: number) => (
                  <p key={i} className="font-mono text-xs text-amber-800">{f}</p>
                ))}
              </div>
            ) : (
              <p className="text-xs text-green-700 flex items-center gap-1.5"><CheckCircle className="w-3.5 h-3.5" /> Working tree limpo — sem alterações pendentes</p>
            )}
          </div>
        )}

        {/* Action */}
        {isLocal ? (
          <div className="space-y-3">
            <div>
              <label className="text-xs font-bold text-gray-600 uppercase block mb-1.5">Mensagem do Commit</label>
              <input
                value={commitMsg}
                onChange={e => setCommitMsg(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && !deploying && handleDeploy()}
                placeholder="ex: feat: melhoria no painel de clientes"
                className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500/20 focus:border-green-500"
              />
            </div>
            <button onClick={handleDeploy} disabled={deploying || !commitMsg.trim()}
              className="bg-black hover:bg-green-700 text-white py-2.5 px-6 rounded-lg text-sm font-bold transition-all disabled:opacity-50 flex items-center gap-2">
              {deploying ? <><RefreshCw className="w-4 h-4 animate-spin" /> A fazer commit e push...</> : <><Upload className="w-4 h-4" /> Commit + Push → Deploy Vercel</>}
            </button>
          </div>
        ) : (
          <button onClick={handleDeploy} disabled={deploying}
            className="bg-black hover:bg-green-700 text-white py-2.5 px-6 rounded-lg text-sm font-bold transition-all disabled:opacity-50 flex items-center gap-2">
            {deploying ? <><RefreshCw className="w-4 h-4 animate-spin" /> A iniciar deploy...</> : <><Upload className="w-4 h-4" /> Trigger Vercel Deploy</>}
          </button>
        )}

        {/* Result */}
        {result && (
          <div className={`p-4 rounded-xl border ${result.success ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
            <div className="flex items-start gap-2">
              {result.success ? <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 shrink-0" /> : <AlertCircle className="w-4 h-4 text-red-600 mt-0.5 shrink-0" />}
              <div className="space-y-1 flex-1">
                <p className={`text-sm font-bold ${result.success ? 'text-green-700' : 'text-red-700'}`}>{result.message || result.error}</p>
                {result.steps?.map((s: string, i: number) => <p key={i} className="text-xs text-gray-600 font-mono">✓ {s}</p>)}
                {result.vercelDashboard && (
                  <a href={result.vercelDashboard} target="_blank" rel="noopener noreferrer" className="text-xs text-green-600 hover:underline flex items-center gap-1">
                    Ver deployments no Vercel <ExternalLink className="w-3 h-3" />
                  </a>
                )}
                {result.setup?.map((s: string, i: number) => <p key={i} className="text-xs text-red-700 font-mono">{s}</p>)}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Recent commits */}
      <div className="bg-white rounded-lg border border-indigo-100 shadow-sm p-6">
        <h3 className="text-sm font-bold text-gray-700 uppercase tracking-wider mb-4">Commits Recentes</h3>
        {loading ? (
          <div className="space-y-3">{[1,2,3].map(i => <div key={i} className="h-10 bg-gray-100 rounded animate-pulse" />)}</div>
        ) : commits.length > 0 ? (
          <div className="space-y-1">
            {commits.map((c, i) => (
              <a key={i} href={c.url} target="_blank" rel="noopener noreferrer"
                className="flex items-start gap-3 p-3 rounded-lg hover:bg-gray-50 border border-transparent hover:border-gray-200 group transition-colors">
                <code className="text-[10px] font-mono bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded mt-0.5 shrink-0">{c.sha}</code>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-gray-800 font-medium truncate group-hover:text-blue-600">{c.message}</p>
                  <p className="text-xs text-gray-400">{c.author} · {c.date ? new Date(c.date).toLocaleString('pt-PT') : ''}</p>
                </div>
                <ExternalLink className="w-3.5 h-3.5 text-gray-300 group-hover:text-blue-400 shrink-0 mt-1" />
              </a>
            ))}
          </div>
        ) : (
          <p className="text-sm text-gray-400 text-center py-6">Sem commits. O repositório é público — não precisas de GITHUB_TOKEN para ver commits.</p>
        )}
      </div>
    </div>
  )
}
