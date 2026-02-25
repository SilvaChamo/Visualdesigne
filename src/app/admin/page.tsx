'use client'

import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  Home, Globe, Users, Mail, Shield, Database, Settings, 
  ChevronLeft, ChevronRight, Plus, Search, Download, ExternalLink,
  Edit2, Pause, Play, Trash2, RefreshCw, LogOut, Package, Server, Lock
} from 'lucide-react'
import { CpanelDashboard } from './CpanelDashboard'
import {
  SubdomainsSection, DatabasesSection, FTPSection, EmailManagementSection,
  CPUsersSection, SSLSection, SecuritySection, PHPConfigSection,
  APIConfigSection, GitDeploySection, WPListSection, WPPluginsSection,
  ResellerSection, ModifyWebsiteSection, SuspendWebsiteSection,
  DeleteWebsiteSection, DNSNameserverSection, DNSDefaultNSSection,
  DNSCreateZoneSection, DNSDeleteZoneSection, CloudFlareSection,
  DNSResetSection, EmailDeleteSection, EmailLimitsSection,
  EmailForwardingSection, CatchAllEmailSection, PatternForwardingSection,
  PlusAddressingSection, EmailChangePasswordSection, DKIMManagerSection,
  WPRestoreBackupSection, WPRemoteBackupSection, ListSubdomainsSection,
  PackagesSection, DNSZoneEditorSection
} from './CyberPanelSections'
import { cyberPanelAPI } from '@/lib/cyberpanel-api'
import type { CyberPanelWebsite, CyberPanelUser, CyberPanelPackage } from '@/lib/cyberpanel-api'

// Secções que precisam de criar websites
function CreateWebsiteSection({ packages, onRefresh }: { packages: CyberPanelPackage[], onRefresh: () => void }) {
  const [form, setForm] = useState({ domain: '', email: '', username: 'admin', packageName: 'Default', php: '8.2' })
  const [creating, setCreating] = useState(false)
  const [msg, setMsg] = useState('')

  const handleCreate = async () => {
    if (!form.domain || !form.email) return
    setCreating(true); setMsg('')
    try {
      const ok = await cyberPanelAPI.createWebsite(form)
      setMsg('Website criado com sucesso!')
      onRefresh()
    } catch (e: any) {
      setMsg('Erro: ' + e.message)
    }
    setCreating(false)
  }

  return (
    <div className="space-y-6 w-full">
      <div><h1 className="text-3xl font-bold text-gray-900">Criar Website</h1><p className="text-gray-500 mt-1">Adicione um novo website ao servidor.</p></div>
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          <div><label className="text-xs font-bold text-gray-600 uppercase block mb-1.5">Domínio</label><input value={form.domain} onChange={e => setForm({...form, domain: e.target.value})} placeholder="exemplo.com" className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm" /></div>
          <div><label className="text-xs font-bold text-gray-600 uppercase block mb-1.5">Email Admin</label><input value={form.email} onChange={e => setForm({...form, email: e.target.value})} placeholder="admin@exemplo.com" className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm" /></div>
          <div><label className="text-xs font-bold text-gray-600 uppercase block mb-1.5">Pacote</label>
            <select value={form.packageName} onChange={e => setForm({...form, packageName: e.target.value})} className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm">
              <option value="Default">Default</option>
              {packages.map(p => <option key={p.packageName} value={p.packageName}>{p.packageName}</option>)}
            </select>
          </div>
          <div><label className="text-xs font-bold text-gray-600 uppercase block mb-1.5">Versão PHP</label>
            <select value={form.php} onChange={e => setForm({...form, php: e.target.value})} className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm">
              <option>7.4</option><option>8.0</option><option>8.1</option><option>8.2</option><option>8.3</option>
            </select>
          </div>
        </div>
        {msg && <div className={`mb-4 px-4 py-2.5 rounded-lg text-sm font-medium ${msg.includes('sucesso') ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>{msg}</div>}
        <button onClick={handleCreate} disabled={creating || !form.domain || !form.email} className="bg-black hover:bg-red-600 text-white px-5 py-2.5 rounded-lg text-sm font-bold transition-all disabled:opacity-50 flex items-center gap-2">
          {creating ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Globe className="w-4 h-4" />} Criar Website
        </button>
      </div>
    </div>
  )
}

function ListWebsitesSection({ sites, onRefresh }: { sites: CyberPanelWebsite[], onRefresh: () => void }) {
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedSites, setSelectedSites] = useState<string[]>([])
  const [editingSite, setEditingSite] = useState<string | null>(null)
  const [editForm, setEditForm] = useState({ packageName: '', php: '' })

  const filteredSites = sites.filter(site => 
    site.domain.toLowerCase().includes(searchTerm.toLowerCase()) ||
    site.adminEmail?.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const handleEdit = (site: CyberPanelWebsite) => {
    if (editingSite === site.domain) {
      // Save edit
      setEditingSite(null)
    } else {
      setEditingSite(site.domain)
      setEditForm({
        packageName: (site as any).package || 'Default',
        php: (site as any).phpSelection || 'PHP 8.2'
      })
    }
  }

  const handleSuspend = async (domain: string) => {
    try {
      const res = await fetch('/api/server-exec', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          action: (sites.find(s => s.domain === domain)?.state === 'Suspended') ? 'unsuspendWebsite' : 'suspendWebsite',
          params: { domain }
        })
      })
      if (res.ok) {
        onRefresh()
      }
    } catch (e) {
      console.error('Error suspending site:', e)
    }
  }

  const handleDelete = async (domain: string) => {
    if (!confirm(`Tem certeza que deseja apagar o website "${domain}"? Esta ação é irreversível!`)) return
    try {
      const res = await fetch('/api/server-exec', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          action: 'deleteWebsite',
          params: { domain }
        })
      })
      if (res.ok) {
        onRefresh()
      }
    } catch (e) {
      console.error('Error deleting site:', e)
    }
  }

  const exportCSV = () => {
    const csv = [
      ['Domínio', 'IP', 'Utilizador', 'Email', 'Pacote', 'Estado', 'SSL'],
      ...filteredSites.map(site => [
        site.domain,
        '109.199.104.22',
        'admin',
        site.adminEmail || '',
        (site as any).package || 'Default',
        site.state || 'Active',
        (site as any).ssl || 'Disabled'
      ])
    ].map(row => row.join(',')).join('\n')

    const blob = new Blob([csv], { type: 'text/csv' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'websites.csv'
    a.click()
  }

  return (
    <div className="space-y-6 w-full">
      <div className="flex justify-between items-center">
        <div><h1 className="text-3xl font-bold text-gray-900">Websites</h1><p className="text-gray-500 mt-1">Todos os websites no servidor.</p></div>
        <div className="flex items-center gap-2">
          <button onClick={onRefresh} className="bg-gray-100 hover:bg-gray-200 text-gray-700 px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2">
            <RefreshCw className="w-4 h-4" /> Sincronizar
          </button>
          <button onClick={exportCSV} className="bg-gray-100 hover:bg-gray-200 text-gray-700 px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2">
            <Download className="w-4 h-4" /> Exportar CSV
          </button>
          <a href="https://109.199.104.22:8090" target="_blank" rel="noopener noreferrer" className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2">
            <ExternalLink className="w-4 h-4" /> Ver no CyberPanel
          </a>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
        <div className="flex items-center gap-4 mb-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input
              type="text"
              placeholder="Pesquisar websites..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-red-500 focus:border-transparent"
            />
          </div>
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="selectAll"
              checked={selectedSites.length === filteredSites.length && filteredSites.length > 0}
              onChange={(e) => {
                if (e.target.checked) {
                  setSelectedSites(filteredSites.map(s => s.domain))
                } else {
                  setSelectedSites([])
                }
              }}
              className="rounded border-gray-300 text-red-600 focus:ring-red-500"
            />
            <label htmlFor="selectAll" className="text-sm text-gray-600">Selecionar todos</label>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs font-bold text-gray-500 uppercase border-b bg-gray-50">
                <th className="px-4 py-3 w-12"></th>
                <th className="px-4 py-3">Domínio</th>
                <th className="px-4 py-3">IP</th>
                <th className="px-4 py-3">Utilizador</th>
                <th className="px-4 py-3">Email</th>
                <th className="px-4 py-3">Quota</th>
                <th className="px-4 py-3">Disco Usado</th>
                <th className="px-4 py-3">Estado</th>
                <th className="px-4 py-3">Acções</th>
              </tr>
            </thead>
            <tbody>
              {filteredSites.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-4 py-8 text-center text-gray-400">
                    {searchTerm ? 'Nenhum website encontrado para esta pesquisa.' : 'Nenhum website encontrado.'}
                  </td>
                </tr>
              ) : filteredSites.map((site, i) => (
                <tr key={i} className="border-b border-gray-50 hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <input
                      type="checkbox"
                      checked={selectedSites.includes(site.domain)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedSites([...selectedSites, site.domain])
                        } else {
                          setSelectedSites(selectedSites.filter(d => d !== site.domain))
                        }
                      }}
                      className="rounded border-gray-300 text-red-600 focus:ring-red-500"
                    />
                  </td>
                  <td className="px-4 py-3 font-bold">
                    <a href={`http://${site.domain}`} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:text-blue-800 flex items-center gap-1">
                      <Globe className="w-3 h-3" />
                      {site.domain}
                    </a>
                  </td>
                  <td className="px-4 py-3 text-gray-600">109.199.104.22</td>
                  <td className="px-4 py-3 text-gray-600">admin</td>
                  <td className="px-4 py-3 text-gray-600">{site.adminEmail || '-'}</td>
                  <td className="px-4 py-3 text-gray-600">Ilimitado</td>
                  <td className="px-4 py-3 text-gray-600">-</td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 rounded text-xs font-bold ${
                      site.state === 'Active' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                    }`}>
                      {site.state || 'Active'}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1">
                      {editingSite === site.domain ? (
                        <>
                          <input
                            type="text"
                            value={editForm.packageName}
                            onChange={(e) => setEditForm({...editForm, packageName: e.target.value})}
                            className="w-20 px-2 py-1 border border-gray-300 rounded text-xs mr-1"
                            placeholder="Pacote"
                          />
                          <input
                            type="text"
                            value={editForm.php}
                            onChange={(e) => setEditForm({...editForm, php: e.target.value})}
                            className="w-20 px-2 py-1 border border-gray-300 rounded text-xs mr-1"
                            placeholder="PHP"
                          />
                          <button
                            onClick={() => handleEdit(site)}
                            className="text-green-600 hover:text-green-800 text-xs font-bold"
                          >
                            Salvar
                          </button>
                          <button
                            onClick={() => setEditingSite(null)}
                            className="text-gray-600 hover:text-gray-800 text-xs font-bold"
                          >
                            Cancelar
                          </button>
                        </>
                      ) : (
                        <>
                          <button
                            onClick={() => handleEdit(site)}
                            className="text-blue-600 hover:text-blue-800 text-xs font-bold"
                            title="Editar"
                          >
                            <Edit2 className="w-3 h-3" />
                          </button>
                          <button
                            onClick={() => handleSuspend(site.domain)}
                            className={`text-${site.state === 'Suspended' ? 'green' : 'orange'}-600 hover:text-${site.state === 'Suspended' ? 'green' : 'orange'}-800 text-xs font-bold`}
                            title={site.state === 'Suspended' ? 'Ativar' : 'Suspender'}
                          >
                            {site.state === 'Suspended' ? <Play className="w-3 h-3" /> : <Pause className="w-3 h-3" />}
                          </button>
                          <button
                            onClick={() => handleDelete(site.domain)}
                            className="text-red-600 hover:text-red-800 text-xs font-bold"
                            title="Apagar"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                          <a
                            href={`http://${site.domain}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-gray-600 hover:text-gray-800 text-xs font-bold"
                            title="Abrir site"
                          >
                            <ExternalLink className="w-3 h-3" />
                          </a>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

export default function AdminPage() {
  const [activeSection, setActiveSection] = useState('dashboard')
  const [sidebarWidth, setSidebarWidth] = useState(220)
  const [isCollapsed, setIsCollapsed] = useState(false)
  const [isResizing, setIsResizing] = useState(false)
  const [cyberPanelSites, setCyberPanelSites] = useState<CyberPanelWebsite[]>([])
  const [cyberPanelUsers, setCyberPanelUsers] = useState<CyberPanelUser[]>([])
  const [cyberPanelPackages, setCyberPanelPackages] = useState<CyberPanelPackage[]>([])
  const [isFetchingCyberPanel, setIsFetchingCyberPanel] = useState(false)
  const sidebarRef = useRef<HTMLDivElement>(null)

  const minSidebarWidth = 180
  const maxSidebarWidth = 400
  const collapsedWidth = 64

  useEffect(() => {
    loadCyberPanelData()
  }, [])

  const loadCyberPanelData = async () => {
    setIsFetchingCyberPanel(true)
    try {
      const [sites, users, packages] = await Promise.all([
        cyberPanelAPI.listWebsites().catch(() => []),
        cyberPanelAPI.listUsers().catch(() => []),
        cyberPanelAPI.listPackages().catch(() => []),
      ])
      setCyberPanelSites(Array.isArray(sites) ? sites : [])
      setCyberPanelUsers(Array.isArray(users) ? users : [])
      setCyberPanelPackages(Array.isArray(packages) ? packages : [])
    } catch (error) {
      console.error('Erro ao carregar dados CyberPanel:', error)
    } finally {
      setIsFetchingCyberPanel(false)
    }
  }

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isResizing) return
      const newWidth = e.clientX
      if (newWidth >= minSidebarWidth && newWidth <= maxSidebarWidth) {
        setSidebarWidth(newWidth)
      }
    }
    const handleMouseUp = () => setIsResizing(false)
    if (isResizing) {
      document.addEventListener('mousemove', handleMouseMove)
      document.addEventListener('mouseup', handleMouseUp)
    }
    return () => {
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleMouseUp)
    }
  }, [isResizing])

  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: Home },
    { id: 'domains', label: 'Websites', icon: Globe },
    { id: 'cp-users', label: 'Contas', icon: Users },
    { id: 'packages-list', label: 'Pacotes', icon: Package },
    { id: 'cp-databases', label: 'Databases', icon: Database },
    { id: 'emails-new', label: 'Email', icon: Mail },
    { id: 'cp-ssl', label: 'SSL', icon: Lock },
    { id: 'cp-security', label: 'Segurança', icon: Shield },
    { id: 'cp-php', label: 'PHP', icon: Server },
    { id: 'git-deploy', label: 'Deploy / GitHub', icon: Download },
    { id: 'cp-api', label: 'Configurações', icon: Settings },
  ]

  const currentSidebarWidth = isCollapsed ? collapsedWidth : sidebarWidth

  const renderSection = () => {
    switch (activeSection) {
      case 'dashboard':
        return <CpanelDashboard sites={cyberPanelSites} users={cyberPanelUsers} isFetching={isFetchingCyberPanel} onNavigate={setActiveSection} onRefresh={loadCyberPanelData} />
      case 'domains':
      case 'domains-list':
        return <ListWebsitesSection sites={cyberPanelSites} onRefresh={loadCyberPanelData} />
      case 'domains-new':
        return <CreateWebsiteSection packages={cyberPanelPackages} onRefresh={loadCyberPanelData} />
      case 'cp-subdomains':
        return <SubdomainsSection sites={cyberPanelSites} />
      case 'cp-list-subdomains':
        return <ListSubdomainsSection sites={cyberPanelSites} />
      case 'cp-modify-website':
        return <ModifyWebsiteSection sites={cyberPanelSites} packages={cyberPanelPackages} />
      case 'cp-suspend-website':
        return <SuspendWebsiteSection sites={cyberPanelSites} onRefresh={loadCyberPanelData} />
      case 'cp-delete-website':
        return <DeleteWebsiteSection sites={cyberPanelSites} onRefresh={loadCyberPanelData} />
      case 'cp-databases':
        return <DatabasesSection sites={cyberPanelSites} />
      case 'cp-ftp':
        return <FTPSection sites={cyberPanelSites} />
      case 'emails-new':
      case 'cp-email-mgmt':
        return <EmailManagementSection sites={cyberPanelSites} />
      case 'cp-email-delete':
        return <EmailDeleteSection sites={cyberPanelSites} />
      case 'cp-email-limits':
        return <EmailLimitsSection sites={cyberPanelSites} />
      case 'cp-email-forwarding':
        return <EmailForwardingSection sites={cyberPanelSites} />
      case 'cp-email-catchall':
        return <CatchAllEmailSection sites={cyberPanelSites} />
      case 'cp-email-pattern-fwd':
        return <PatternForwardingSection sites={cyberPanelSites} />
      case 'cp-email-plus-addr':
        return <PlusAddressingSection sites={cyberPanelSites} />
      case 'cp-email-change-pass':
        return <EmailChangePasswordSection sites={cyberPanelSites} />
      case 'cp-email-dkim':
        return <DKIMManagerSection sites={cyberPanelSites} />
      case 'cp-users':
        return <CPUsersSection />
      case 'cp-reseller':
        return <ResellerSection />
      case 'cp-ssl':
        return <SSLSection sites={cyberPanelSites} />
      case 'cp-security':
        return <SecuritySection sites={cyberPanelSites} />
      case 'cp-php':
        return <PHPConfigSection sites={cyberPanelSites} />
      case 'cp-api':
      case 'infrastructure':
        return <APIConfigSection />
      case 'cp-wp-list':
        return <WPListSection sites={cyberPanelSites} />
      case 'cp-wp-plugins':
        return <WPPluginsSection sites={cyberPanelSites} />
      case 'cp-wp-restore-backup':
        return <WPRestoreBackupSection sites={cyberPanelSites} />
      case 'cp-wp-remote-backup':
        return <WPRemoteBackupSection sites={cyberPanelSites} />
      case 'cp-dns-nameserver':
        return <DNSNameserverSection sites={cyberPanelSites} />
      case 'cp-dns-default-ns':
        return <DNSDefaultNSSection />
      case 'cp-dns-create-zone':
        return <DNSCreateZoneSection sites={cyberPanelSites} />
      case 'domains-dns':
        return <DNSZoneEditorSection sites={cyberPanelSites} />
      case 'cp-dns-delete-zone':
        return <DNSDeleteZoneSection sites={cyberPanelSites} />
      case 'cp-dns-cloudflare':
        return <CloudFlareSection sites={cyberPanelSites} />
      case 'cp-dns-reset':
        return <DNSResetSection sites={cyberPanelSites} />
      case 'cp-dns-zone-editor':
        return <DNSZoneEditorSection sites={cyberPanelSites} />
      case 'git-deploy':
        return <GitDeploySection />
      case 'packages-list':
        return <PackagesSection packages={cyberPanelPackages} onRefresh={loadCyberPanelData} />
      default:
        return <CpanelDashboard sites={cyberPanelSites} users={cyberPanelUsers} isFetching={isFetchingCyberPanel} onNavigate={setActiveSection} onRefresh={loadCyberPanelData} />
    }
  }

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      {/* Sidebar */}
      <motion.div
        ref={sidebarRef}
        className="relative bg-white border-r border-gray-200 text-gray-800 flex flex-col shadow-sm"
        style={{ width: `${currentSidebarWidth}px` }}
        animate={{ width: currentSidebarWidth }}
        transition={{ duration: 0.2, ease: 'easeInOut' }}
        initial={{ width: 250 }}
      >
        {/* Sidebar Header */}
        <div className="p-4 border-b border-gray-100">
          <div className="flex items-center justify-between">
            {!isCollapsed && (
              <div className="flex items-center gap-2">
                <img src="/assets/simbolo.png" alt="Logo" className="w-8 h-8 object-contain" />
                <div>
                  <p className="font-bold text-sm text-gray-900 font-bold">Painel Admin</p>
                  <p className="text-[10px] text-gray-400">Painel Completo</p>
                </div>
              </div>
            )}
            <button onClick={() => setIsCollapsed(!isCollapsed)} className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors ml-auto">
              {isCollapsed ? <ChevronRight size={16} className="text-gray-500" /> : <ChevronLeft size={16} className="text-gray-500" />}
            </button>
          </div>
        </div>

        {/* Menu Items */}
        <nav className="flex-1 overflow-y-auto p-3">
          <div className="space-y-0.5">
            {menuItems.map((item) => {
              const Icon = item.icon
              const isActive = activeSection === item.id ||
                (item.id === 'domains' && ['domains', 'domains-new', 'domains-list'].includes(activeSection)) ||
                (item.id === 'emails-new' && activeSection.startsWith('cp-email')) ||
                (item.id === 'cp-security' && activeSection === 'cp-security')
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveSection(item.id)}
                  className={`w-full flex items-center p-3 rounded-lg transition-colors ${
                    isActive
                      ? 'bg-red-50 text-red-600 font-bold'
                      : 'hover:bg-gray-100 text-gray-600'
                  }`}
                  title={isCollapsed ? item.label : ''}
                >
                  <Icon size={18} className={isActive ? 'text-red-600' : 'text-gray-500'} />
                  {!isCollapsed && (
                    <span className="ml-3 text-[15px]">{item.label}</span>
                  )}
                  {!isCollapsed && isActive && (
                    <ChevronRight size={14} className="ml-auto text-red-400" />
                  )}
                </button>
              )
            })}
          </div>
        </nav>

        {/* Sidebar Footer */}
        <div className="p-3 border-t border-gray-100">
          <div className={`flex items-center ${isCollapsed ? 'justify-center' : 'gap-3'}`}>
            <div className="w-8 h-8 bg-red-600 rounded-full flex items-center justify-center shrink-0">
              <span className="text-white text-xs font-bold">SC</span>
            </div>
            {!isCollapsed && (
              <div className="flex-1 min-w-0">
                <p className="text-xs font-bold text-gray-900 truncate">Silva Chamo</p>
                <p className="text-[10px] text-gray-400 truncate">silva.chamo@gmail.com</p>
              </div>
            )}
          </div>
        </div>

        {/* Resize Handle */}
        {!isCollapsed && (
          <div
            className="absolute right-0 top-0 h-full w-1 cursor-col-resize hover:bg-red-400 transition-colors opacity-0 hover:opacity-100"
            onMouseDown={(e) => { e.preventDefault(); setIsResizing(true) }}
          />
        )}
      </motion.div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top Header */}
        <header className="bg-white border-b border-gray-200 px-6 py-3">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-lg font-bold text-gray-900">
                {activeSection === 'dashboard' ? 'Dashboard' :
                 menuItems.find(m => m.id === activeSection)?.label || activeSection}
              </h1>
              <p className="text-xs text-gray-400 mt-0.5">
                {activeSection === 'dashboard' ? 'Visão geral do servidor' :
                 activeSection === 'domains' ? 'Gerir todos os websites do servidor' :
                 activeSection === 'packages-list' ? 'Gerir pacotes de alojamento' :
                 activeSection === 'cp-users' ? 'Gerir contas de utilizadores' :
                 activeSection === 'emails-new' ? 'Gerir contas de email' :
                 activeSection === 'cp-ssl' ? 'Gerir certificados SSL' :
                 activeSection === 'cp-security' ? 'Configurações de segurança' :
                 activeSection === 'cp-databases' ? 'Gerir bases de dados' :
                 activeSection === 'git-deploy' ? 'Deploy via GitHub' :
                 activeSection === 'cp-api' ? 'Configurações do servidor' : ''}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <a href="https://109.199.104.22:8090" target="_blank" rel="noopener noreferrer"
                className="bg-red-600 hover:bg-red-700 text-white text-xs font-bold px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-colors">
                <Globe size={13} /> Painel CyberPanel
              </a>
              <button onClick={() => window.location.href = '/'}
                className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors text-gray-500" title="Sair">
                <LogOut size={15} />
              </button>
              <button onClick={loadCyberPanelData} disabled={isFetchingCyberPanel}
                className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors text-gray-500" title="Actualizar dados">
                <RefreshCw size={15} className={isFetchingCyberPanel ? 'animate-spin' : ''} />
              </button>
            </div>
          </div>
        </header>

        {/* Content Area */}
        <main className="flex-1 overflow-y-auto p-6">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeSection}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.15 }}
            >
              {renderSection()}
            </motion.div>
          </AnimatePresence>
        </main>
      </div>
    </div>
  )
}
