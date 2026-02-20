'use client'

import { useState, useEffect } from 'react'
import { I18nProvider, useI18n } from '@/lib/i18n'
import { validateAdminCredentials, generateAdminToken, validateAdminToken } from '@/lib/admin-auth'
import { vhmAPI, VHMClient, VHMStats } from '@/lib/vhm-api'
import { supabase } from '@/lib/supabase'
import { Users, Plus, Trash2, Mail, AlertCircle, Check, X, Eye, EyeOff, Edit, DollarSign, Calendar, Shield, Search, Filter, Download, Settings, LogOut, Home, FileText, BarChart3, Globe, TrendingUp, Package, CreditCard, UserPlus, Activity, Clock, Star, MessageSquare, Database, Server, Globe2, Lock, Bell, Archive, RefreshCw, ChevronRight, MoreVertical } from 'lucide-react'

interface Client {
  id: string;
  name: string;
  email: string;
  domain: string;
  status: 'active' | 'suspended' | 'expired';
  plan: string;
  price: number;
  currency: string;
  expiryDate: string;
  registeredAt: string;
}

interface NotificationTemplate {
  id: string;
  name: string;
  subject: string;
  message: string;
  daysBeforeExpiry: number;
  enabled: boolean;
}

interface Domain {
  id: string;
  name: string;
  client: string;
  status: 'active' | 'expired' | 'pending' | 'suspended';
  expiryDate: string;
  autoRenew: boolean;
}

interface Subscription {
  id: string;
  vhm_username: string;
  client_name: string;
  client_email: string;
  domain: string;
  plan: string;
  expiry_date: string | null;
  status: 'active' | 'suspended' | 'expired';
  last_notified_at: string | null;
  ip_address: string | null;
  setup_date: string | null;
  quota: string | null;
  disk_used: string | null;
}

function AdminPanelContent() {
  const { t } = useI18n()
  const [activeSection, setActiveSection] = useState('dashboard')
  const [clients, setClients] = useState<VHMClient[]>([])
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([])
  const [stats, setStats] = useState<VHMStats | null>(null)
  const [plans, setPlans] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [syncing, setSyncing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showClientForm, setShowClientForm] = useState(false)
  const [editingClient, setEditingClient] = useState<VHMClient | null>(null)
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [authError, setAuthError] = useState('')
  const [searchTerm, setSearchTerm] = useState('')
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false)
  const [editingAccount, setEditingAccount] = useState<VHMClient | null>(null)
  const [isSavingAccount, setIsSavingAccount] = useState(false)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [isCreatingAccount, setIsCreatingAccount] = useState(false)
  const [newAccountData, setNewAccountData] = useState({
    domain: '',
    username: '',
    password: '',
    email: '',
    plan: '',
    cgi: 1,
    dkim: 1,
    spf: 1,
    quota: 0,
    bwlimit: 0
  })
  const [editFormEmail, setEditFormEmail] = useState('')
  const [editFormQuota, setEditFormQuota] = useState<number>(0)

  useEffect(() => {
    const savedToken = localStorage.getItem('admin-token')
    if (savedToken && validateAdminToken(savedToken)) {
      setIsAuthenticated(true)
    } else {
      setIsAuthenticated(false)
    }

    if (isAuthenticated) {
      loadVHMData()
      loadSubscriptions()
    }
  }, [isAuthenticated])

  const loadSubscriptions = async () => {
    try {
      const { data, error } = await supabase
        .from('subscriptions')
        .select('*')
        .order('expiry_date', { ascending: true })

      if (error) throw error
      setSubscriptions(data || [])
    } catch (err) {
      console.error('Error loading subscriptions:', err)
    }
  }

  const handleSyncVHM = async () => {
    setSyncing(true)
    try {
      // 1. Get current clients from VHM
      const vhmClients = await vhmAPI.getAllClients()

      // 2. Prepare records for Supabase upsert
      const upsertData = vhmClients.map(client => ({
        vhm_username: client.username,
        client_email: client.email,
        domain: client.domain,
        plan: client.plan,
        status: client.status === 'active' ? 'active' : 'suspended',
        ip_address: client.ip,
        setup_date: client.created ? new Date(client.created).toISOString() : null,
        quota: client.disk_limit > 0 ? `${client.disk_limit} MB` : 'Unlimited',
        disk_used: `${client.disk_usage} MB`
      }))

      // 3. Upsert into Supabase (based on vhm_username)
      const { error: upsertError } = await supabase
        .from('subscriptions')
        .upsert(upsertData, { onConflict: 'vhm_username' })

      if (upsertError) throw upsertError

      // 4. Reload data
      await loadSubscriptions()
      await loadVHMData()
      alert('Sincronização com VHM concluída com sucesso!')
    } catch (err) {
      console.error('Sync error:', err)
      alert('Erro na sincronização: ' + (err instanceof Error ? err.message : 'Erro desconhecido'))
    } finally {
      setSyncing(false)
    }
  }

  const handleUpdateSubscription = async (id: string, updates: Partial<Subscription>) => {
    try {
      const { error } = await supabase
        .from('subscriptions')
        .update(updates)
        .eq('id', id)

      if (error) throw error

      setSubscriptions(prev => prev.map(s => s.id === id ? { ...s, ...updates } : s))
      return true
    } catch (err) {
      console.error('Update subscription error:', err)
      alert('Erro ao atualizar subscrição')
      return false
    }
  }

  const loadVHMData = async () => {
    setLoading(true)
    setError(null)

    // Auto-collapse sidebar if on mobile or if wide data is expected
    if (window.innerWidth < 1200) {
      setIsSidebarCollapsed(true)
    }

    try {
      // Login to VHM API
      const loginSuccess = await vhmAPI.login()
      if (!loginSuccess) {
        throw new Error('Failed to login to VHM API')
      }

      // Load ALL clients, stats, and plans
      const [clientsData, statsData, plansData] = await Promise.all([
        vhmAPI.getAllClients(), // Get ALL clients, no limit
        vhmAPI.getStats(),
        vhmAPI.getPlans()
      ])

      setClients(clientsData)
      setStats(statsData)
      setPlans(plansData)

      console.log(`Loaded ${clientsData.length} VHM clients`)
    } catch (err) {
      console.error('VHM API Error:', err)
      setError(err instanceof Error ? err.message : 'Failed to load VHM data')
    } finally {
      setLoading(false)
    }
  }

  const handleLogin = (email: string, password: string) => {
    if (validateAdminCredentials(email, password)) {
      const token = generateAdminToken()
      localStorage.setItem('admin-token', token)
      setIsAuthenticated(true)
      setAuthError('')
    } else {
      setAuthError('Credenciais inválidas')
    }
  }

  const handleLogout = () => {
    localStorage.removeItem('admin-token')
    setIsAuthenticated(false)
    setAuthError('')
    setClients([])
    setStats(null)
  }

  const handleSuspendClient = async (username: string) => {
    if (!confirm(`Tem certeza que deseja suspender o cliente ${username}?`)) {
      return
    }

    try {
      const success = await vhmAPI.suspendClient(username)
      if (success) {
        await loadVHMData() // Reload data
        alert('Cliente suspenso com sucesso!')
      } else {
        alert('Falha ao suspender cliente')
      }
    } catch (err) {
      console.error('Suspend error:', err)
      alert('Erro ao suspender cliente')
    }
  }

  const handleUnsuspendClient = async (username: string) => {
    if (!confirm(`Tem certeza que deseja reativar o cliente ${username}?`)) {
      return
    }

    try {
      const success = await vhmAPI.unsuspendClient(username)
      if (success) {
        await loadVHMData() // Reload data
        alert('Cliente reativado com sucesso!')
      } else {
        alert('Falha ao reativar cliente')
      }
    } catch (err) {
      console.error('Unsuspend error:', err)
      alert('Erro ao reativar cliente')
    }
  }

  const openVHMPanel = () => {
    // Create auto-login URL for VHM
    const vhmUrl = 'https://za4.mozserver.com:2087/cpsess5574224871/'
    const params = new URLSearchParams({
      user: 'yknrnlev',
      pass: 'FerramentasWeb#2020',
      login: '1',
      post_login: '31075548594261'
    })

    // Open VHM in new tab with auto-login
    const fullUrl = `${vhmUrl}?${params.toString()}`
    window.open(fullUrl, '_blank', 'noopener,noreferrer')
  }

  const handleTerminateClient = async (username: string) => {
    if (!confirm(`Tem certeza que deseja TERMINAR o cliente ${username}? Esta ação é irreversível!`)) {
      return
    }

    try {
      const success = await vhmAPI.terminateClient(username)
      if (success) {
        await loadVHMData() // Reload data
        alert('Cliente terminado com sucesso!')
      } else {
        alert('Falha ao terminar cliente')
      }
    } catch (err) {
      console.error('Terminate error:', err)
      alert('Erro ao terminar cliente')
    }
  }
  useEffect(() => {
    if (editingAccount) {
      setEditFormEmail(editingAccount.email || '')
      setEditFormQuota(editingAccount.disk_limit || 0)
    }
  }, [editingAccount])

  const handleCreateAccount = async () => {
    if (!newAccountData.domain || !newAccountData.username || !newAccountData.plan || !newAccountData.email) {
      alert('Por favor, preencha os campos obrigatórios: Domínio, Usuário, Pacote e E-mail.')
      return
    }

    setIsCreatingAccount(true)
    try {
      const response = await vhmAPI.createAccount({
        domain: newAccountData.domain,
        username: newAccountData.username,
        password: newAccountData.password || undefined,
        plan: newAccountData.plan,
        contactemail: newAccountData.email,
        cgi: newAccountData.cgi,
        dkim: newAccountData.dkim,
        spf: newAccountData.spf,
        quota: newAccountData.quota || undefined,
        bwlimit: newAccountData.bwlimit || undefined
      })

      if (response && (response.metadata?.result === 1 || response.status === 1)) {
        alert('Conta criada com sucesso!')
        setShowCreateModal(false)
        setNewAccountData({
          domain: '',
          username: '',
          password: '',
          email: '',
          plan: '',
          cgi: 1,
          dkim: 1,
          spf: 1,
          quota: 0,
          bwlimit: 0
        })
        await loadVHMData()
      } else {
        const msg = response?.metadata?.reason || response?.statusmsg || 'Erro desconhecido'
        alert(`Falha ao criar conta: ${msg}`)
      }
    } catch (err) {
      console.error('Create account error:', err)
      alert('Erro técnico ao tentar criar a conta.')
    } finally {
      setIsCreatingAccount(false)
    }
  }

  const handleUpdateClientData = async (username: string, updates: { email: string; quota: number }) => {
    setIsSavingAccount(true)
    try {
      const success = await vhmAPI.updateClient(username, updates)
      if (success) {
        await loadVHMData()
        setEditingAccount(null)
        alert('Dados do cliente atualizados com sucesso!')
      } else {
        alert('Falha ao atualizar dados do cliente no VHM')
      }
    } catch (err) {
      console.error('Update client data error:', err)
      alert('Erro ao atualizar dados do cliente')
    } finally {
      setIsSavingAccount(false)
    }
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-8">
          <div className="text-center mb-8">
            <div className="w-20 h-20 bg-red-600 rounded-full flex items-center justify-center mx-auto mb-4">
              <Globe className="w-10 h-10 text-white" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Painel Administrativo</h2>
            <p className="text-gray-600">Visual Design - Gestão Completa</p>
          </div>

          <form onSubmit={(e) => {
            e.preventDefault()
            const formData = new FormData(e.currentTarget)
            handleLogin(formData.get('email') as string, formData.get('password') as string)
          }} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Email</label>
              <input
                type="email"
                name="email"
                required
                className="w-full px-4 py-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
                placeholder="seu@email.com"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Senha</label>
              <input
                type="password"
                name="password"
                required
                className="w-full px-4 py-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
                placeholder="••••••••"
              />
            </div>

            {authError && (
              <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-md text-sm">
                {authError}
              </div>
            )}

            <button
              type="submit"
              className="w-full bg-red-600 hover:bg-red-700 text-white py-3 px-4 rounded-md font-medium transition-colors duration-200"
            >
              Entrar no Painel
            </button>
          </form>
        </div>
      </div>
    )
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'text-green-700 bg-green-100 border-green-200'
      case 'suspended': return 'text-red-700 bg-red-100 border-red-200'
      case 'terminated': return 'text-gray-700 bg-gray-100 border-gray-200'
      default: return 'text-gray-700 bg-gray-100 border-gray-200'
    }
  }

  const getStatusText = (status: string) => {
    switch (status) {
      case 'active': return 'Ativo'
      case 'suspended': return 'Suspenso'
      case 'terminated': return 'Terminado'
      default: return status
    }
  }

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 MB'
    const mb = bytes / 1024 / 1024
    const gb = mb / 1024
    return gb > 1 ? `${gb.toFixed(2)} GB` : `${mb.toFixed(2)} MB`
  }

  const filteredClients = clients.filter(client =>
    client.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
    client.domain.toLowerCase().includes(searchTerm.toLowerCase()) ||
    client.email.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', color: 'bg-blue-500' },
    { id: 'clients', label: 'Clientes', color: 'bg-green-500' },
    { id: 'domains', label: 'Domínios', color: 'bg-purple-500' },
    { id: 'notifications', label: 'Notificações', color: 'bg-orange-500' },
    { id: 'billing', label: 'Faturação', color: 'bg-indigo-500' },
    { id: 'reports', label: 'Relatórios', color: 'bg-pink-500' },
    { id: 'analytics', label: 'Análises', color: 'bg-teal-500' },
    { id: 'settings', label: 'Configurações', color: 'bg-gray-500' },
    { id: 'security', label: 'Segurança', color: 'bg-red-500' },
    { id: 'backup', label: 'Backup', color: 'bg-yellow-500' }
  ]

  const SidebarIcon = (id: string) => {
    switch (id) {
      case 'dashboard': return <Home className="w-5 h-5" />
      case 'clients': return <Users className="w-5 h-5" />
      case 'domains': return <Globe className="w-5 h-5" />
      case 'notifications': return <Bell className="w-5 h-5" />
      case 'billing': return <CreditCard className="w-5 h-5" />
      case 'reports': return <FileText className="w-5 h-5" />
      case 'analytics': return <BarChart3 className="w-5 h-5" />
      case 'settings': return <Settings className="w-5 h-5" />
      case 'security': return <Shield className="w-5 h-5" />
      case 'backup': return <Database className="w-5 h-5" />
      default: return <Package className="w-5 h-5" />
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Main Content */}
      <div className="flex">
        {/* Sidebar */}
        <div className={`${isSidebarCollapsed ? 'w-20' : 'w-64'} bg-white shadow-lg min-h-screen transition-all duration-300 relative group`}>
          <div className={`p-6 border-b border-gray-200 ${isSidebarCollapsed ? 'px-4 text-center' : ''}`}>
            <div className={`flex items-center gap-3 ${isSidebarCollapsed ? 'justify-center' : ''}`}>
              <div className="w-10 h-10 bg-red-600 rounded-md flex items-center justify-center shrink-0">
                <Globe className="w-6 h-6 text-white" />
              </div>
              {!isSidebarCollapsed && (
                <div>
                  <h2 className="text-xl font-bold text-gray-900">Painel Admin</h2>
                  <p className="text-sm text-gray-600">Gestão Completa</p>
                </div>
              )}
            </div>
          </div>

          {/* Toggle Button */}
          <button
            onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
            className="absolute -right-3 top-20 bg-white border border-gray-200 rounded-full p-1.5 shadow-md hover:bg-gray-50 text-gray-600 transition-transform hidden group-hover:block"
          >
            {isSidebarCollapsed ? <ChevronRight className="w-4 h-4" /> : <RefreshCw className="w-4 h-4 rotate-180" />}
          </button>

          <nav className="p-4 space-y-2">
            {menuItems.map((item) => (
              <button
                key={item.id}
                onClick={() => {
                  setActiveSection(item.id)
                  if (item.id === 'clients') setIsSidebarCollapsed(true)
                }}
                className={`w-full flex items-center transition-all duration-200 rounded-md ${activeSection === item.id
                  ? 'bg-red-50 text-red-600'
                  : 'text-gray-600 hover:bg-gray-50'
                  } ${isSidebarCollapsed ? 'px-0 justify-center py-2' : 'px-3 py-1.5'}`}
                title={isSidebarCollapsed ? item.label : ''}
              >
                <div className={`shrink-0 transition-all ${isSidebarCollapsed ? '' : 'mr-3'}`}>
                  {SidebarIcon(item.id)}
                </div>
                {!isSidebarCollapsed && (
                  <span className="font-medium whitespace-nowrap overflow-hidden transition-all duration-300">
                    {item.label}
                  </span>
                )}
                {!isSidebarCollapsed && activeSection === item.id && (
                  <ChevronRight className="w-4 h-4 ml-auto" />
                )}
              </button>
            ))}
          </nav>

          <div className={`absolute bottom-0 p-4 border-t border-gray-200 transition-all duration-300 ${isSidebarCollapsed ? 'w-20' : 'w-64'}`}>
            <div className={`flex items-start gap-3 mb-3 ${isSidebarCollapsed ? 'justify-center' : ''}`}>
              <div className="w-10 h-10 rounded-full overflow-hidden relative bg-gradient-to-br from-red-500 to-red-600 shadow-lg flex-shrink-0">
                <img
                  src="https://lh3.googleusercontent.com/a-/AOh14GjZ8Q7T2L3W4R5S6U7V8W9X0Y1Z2X3W4R5S6U7V8W9X0Q=s96-c"
                  alt="Silva Chamo"
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    const target = e.currentTarget;
                    target.style.display = 'none';
                    const parent = target.parentElement;
                    if (parent) {
                      parent.innerHTML = '<div class="w-full h-full flex items-center justify-center bg-gradient-to-br from-red-500 to-red-600 font-bold text-white text-xs">SC</div>';
                    }
                  }}
                />
              </div>
              {!isSidebarCollapsed && (
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-gray-900 mb-1">Silva Chamo</div>
                  <div className="text-xs text-gray-600 truncate">silva.chamo@gmail.com</div>
                </div>
              )}
            </div>
            {!isSidebarCollapsed && (
              <button
                onClick={handleLogout}
                className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-600 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors"
              >
                <LogOut className="w-4 h-4" />
                <span>Terminar Sessão</span>
              </button>
            )}
          </div>
        </div>

        {/* Main Content Area */}
        <div className="flex-1 p-8">
          {activeSection === 'dashboard' && (
            <div>
              <div className="flex justify-between items-center mb-8">
                <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
                <div className="flex items-center gap-4">
                  <button
                    onClick={openVHMPanel}
                    className="bg-red-600 hover:bg-red-700 text-white px-3 py-1.5 rounded-md flex items-center gap-2 transition-colors text-sm"
                  >
                    <Globe className="w-4 h-4" />
                    Painel VHM
                  </button>
                  <button
                    onClick={handleLogout}
                    className="bg-gray-600 hover:bg-red-600 text-white px-3 py-1.5 rounded-md flex items-center gap-2 transition-colors text-sm"
                  >
                    <LogOut className="w-4 h-4" />
                    Sair
                  </button>
                </div>
              </div>

              {loading && (
                <div className="flex items-center justify-center py-12">
                  <div className="text-gray-600">Carregando dados do VHM...</div>
                </div>
              )}

              {error && (
                <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-md mb-6">
                  Erro ao carregar dados do VHM: {error}
                </div>
              )}

              {!loading && !error && stats && (
                <>
                  {/* Stats Cards */}
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                    <div className="bg-white rounded-xl shadow-md p-6 hover:shadow-lg transition-shadow">
                      <div className="flex items-center justify-between mb-4">
                        <div className="w-12 h-12 bg-blue-100 rounded-md flex items-center justify-center">
                          <Users className="w-6 h-6 text-blue-600" />
                        </div>
                        <span className="text-sm text-gray-500">Total</span>
                      </div>
                      <div className="text-2xl font-bold text-gray-900">{stats.total_clients}</div>
                      <div className="text-sm text-gray-600">Clientes</div>
                      <div className="mt-2 text-xs text-green-600">VHM Real</div>
                    </div>

                    <div className="bg-white rounded-xl shadow-md p-6 hover:shadow-lg transition-shadow">
                      <div className="flex items-center justify-between mb-4">
                        <div className="w-12 h-12 bg-green-100 rounded-md flex items-center justify-center">
                          <Check className="w-6 h-6 text-green-600" />
                        </div>
                        <span className="text-sm text-gray-500">Ativos</span>
                      </div>
                      <div className="text-2xl font-bold text-gray-900">{stats.active_clients}</div>
                      <div className="text-sm text-gray-600">Clientes</div>
                      <div className="mt-2 text-xs text-green-600">VHM Real</div>
                    </div>

                    <div className="bg-white rounded-xl shadow-md p-6 hover:shadow-lg transition-shadow">
                      <div className="flex items-center justify-between mb-4">
                        <div className="w-12 h-12 bg-purple-100 rounded-md flex items-center justify-center">
                          <Globe2 className="w-6 h-6 text-purple-600" />
                        </div>
                        <span className="text-sm text-gray-500">Total</span>
                      </div>
                      <div className="text-2xl font-bold text-gray-900">{stats.total_domains}</div>
                      <div className="text-sm text-gray-600">Domínios</div>
                      <div className="mt-2 text-xs text-green-600">VHM Real</div>
                    </div>

                    <div className="bg-white rounded-xl shadow-md p-6 hover:shadow-lg transition-shadow">
                      <div className="flex items-center justify-between mb-4">
                        <div className="w-12 h-12 bg-orange-100 rounded-md flex items-center justify-center">
                          <Database className="w-6 h-6 text-orange-600" />
                        </div>
                        <span className="text-sm text-gray-500">Uso</span>
                      </div>
                      <div className="text-2xl font-bold text-gray-900">{formatBytes(stats.disk_usage_total)}</div>
                      <div className="text-sm text-gray-600">Disco Total</div>
                      <div className="mt-2 text-xs text-green-600">VHM Real</div>
                    </div>
                  </div>

                  {/* Quick Actions */}
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
                    <div className="bg-white rounded-xl shadow-md p-6">
                      <h3 className="text-lg font-semibold text-gray-900 mb-4">Ações Rápidas</h3>
                      <div className="space-y-3">
                        <button
                          onClick={() => setShowCreateModal(true)}
                          className="w-full flex items-center gap-3 px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-md transition-colors"
                        >
                          <UserPlus className="w-5 h-5" />
                          <span>Novo Cliente</span>
                        </button>
                        <button
                          onClick={() => loadVHMData()}
                          className="w-full flex items-center gap-3 px-3 py-1.5 bg-green-50 hover:bg-green-100 text-green-700 rounded-md transition-colors"
                        >
                          <RefreshCw className="w-5 h-5" />
                          <span>Atualizar Dados</span>
                        </button>
                        <button className="w-full flex items-center gap-3 px-3 py-1.5 bg-purple-50 hover:bg-purple-100 text-purple-700 rounded-md transition-colors text-sm">
                          <Mail className="w-4 h-4" />
                          <span>Enviar Notificação</span>
                        </button>
                      </div>
                    </div>

                    <div className="bg-white rounded-xl shadow-md p-6">
                      <h3 className="text-lg font-semibold text-gray-900 mb-4">Status VHM</h3>
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-gray-600">Conexão API</span>
                          <span className="px-2 py-1 bg-green-100 text-green-700 text-xs rounded-full">Online</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-gray-600">Clientes Suspensos</span>
                          <span className="text-sm text-gray-900">{stats.suspended_clients}</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-gray-600">Uso de Banda</span>
                          <span className="text-sm text-gray-900">{formatBytes(stats.bandwidth_usage_total)}</span>
                        </div>
                      </div>
                    </div>

                    <div className="bg-white rounded-xl shadow-md p-6">
                      <h3 className="text-lg font-semibold text-gray-900 mb-4">Informações</h3>
                      <div className="space-y-3">
                        <div className="flex items-center gap-3">
                          <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                          <div className="flex-1">
                            <div className="text-sm text-gray-900">API VHM Conectada</div>
                            <div className="text-xs text-gray-500">Dados em tempo real</div>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                          <div className="flex-1">
                            <div className="text-sm text-gray-900">Servidor: za4.mozserver.com</div>
                            <div className="text-xs text-gray-500">Porta 2087</div>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <div className="w-2 h-2 bg-orange-500 rounded-full"></div>
                          <div className="flex-1">
                            <div className="text-sm text-gray-900">Controle Total</div>
                            <div className="text-xs text-gray-500">Ações reais no VHM</div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </>
              )}
            </div>
          )}

          {
            activeSection === 'clients' && (
              <div>
                <div className="flex justify-between items-center mb-8">
                  <h1 className="text-3xl font-bold text-gray-900">Gestão de Clientes</h1>
                  <div className="flex items-center gap-4">
                    <button
                      onClick={() => handleSyncVHM()}
                      disabled={syncing}
                      className="bg-red-600 hover:bg-red-700 text-white px-3 py-1.5 rounded-md flex items-center gap-2 transition-all shadow-sm text-sm"
                    >
                      <RefreshCw className={`w-4 h-4 ${syncing ? 'animate-spin' : ''}`} />
                      Sincronizar VHM
                    </button>
                    <button
                      onClick={handleLogout}
                      className="bg-gray-600 hover:bg-red-600 text-white px-3 py-1.5 rounded-md flex items-center gap-2 transition-colors text-sm"
                    >
                      <LogOut className="w-5 h-5" />
                      Sair
                    </button>
                  </div>
                </div>

                {loading && (
                  <div className="flex items-center justify-center py-12">
                    <div className="text-gray-600">Carregando clientes...</div>
                  </div>
                )}

                {!loading && (
                  <>
                    <div className="bg-white rounded-xl shadow-md overflow-hidden">
                      <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
                        <h3 className="text-lg font-semibold text-gray-900">Clientes VHM ({clients.length})</h3>
                        <div className="flex items-center gap-4">
                          <button
                            onClick={handleSyncVHM}
                            disabled={syncing}
                            className={`${syncing ? 'bg-gray-400' : 'bg-blue-600 hover:bg-blue-700'} text-white px-3 py-1.5 rounded-md flex items-center gap-2 transition-colors font-medium text-sm`}
                          >
                            <RefreshCw className={`w-4 h-4 ${syncing ? 'animate-spin' : ''}`} />
                            {syncing ? 'Sincronizando...' : 'Sincronizar VHM'}
                          </button>
                          <button
                            onClick={openVHMPanel}
                            className="bg-red-600 hover:bg-red-700 text-white px-3 py-1.5 rounded-md flex items-center gap-2 transition-colors font-medium text-sm"
                          >
                            <Globe className="w-4 h-4" />
                            Ver Todos no VHM
                          </button>
                          <div className="relative">
                            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                            <input
                              type="text"
                              placeholder="Buscar clientes..."
                              value={searchTerm}
                              onChange={(e) => setSearchTerm(e.target.value)}
                              className="pl-10 pr-4 py-1.5 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500 w-64 text-sm"
                            />
                          </div>
                          <button
                            onClick={() => loadVHMData()}
                            className="text-blue-600 hover:text-blue-800 text-sm font-medium flex items-center gap-2"
                          >
                            <RefreshCw className="w-4 h-4" />
                            Atualizar
                          </button>
                        </div>
                      </div>
                      <div className="overflow-x-auto">
                        <table className="w-full">
                          <thead className="bg-gray-50 border-b border-gray-200">
                            <tr>
                              <th className="px-3 py-1 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Domain</th>
                              <th className="px-3 py-1 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">cPanel</th>
                              <th className="px-3 py-1 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">IP Address</th>
                              <th className="px-3 py-1 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Usuário</th>
                              <th className="px-3 py-1 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Contact Email</th>
                              <th className="px-3 py-1 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Setup Date</th>
                              <th className="px-3 py-1 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Quota</th>
                              <th className="px-3 py-1 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Disk Used</th>
                              <th className="px-3 py-1 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Ações</th>
                            </tr>
                          </thead>
                          <tbody className="bg-white divide-y divide-gray-200">
                            {filteredClients.map((client) => {
                              const sub = subscriptions.find(s => s.vhm_username === client.username);
                              return (
                                <tr key={client.username} className={`hover:bg-gray-50 border-b border-gray-50 ${client.status === 'suspended' ? 'bg-red-50' : ''}`}>
                                  <td className="px-3 py-1.5 whitespace-nowrap text-xs text-blue-600 font-medium leading-tight">
                                    <a href={`https://${client.domain}`} target="_blank" rel="noopener noreferrer" className="hover:underline">
                                      {client.domain}
                                    </a>
                                  </td>
                                  <td className="px-3 py-1.5 whitespace-nowrap">
                                    <a
                                      href={`https://${client.domain}:2083`}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="p-1 bg-orange-100 rounded-md text-orange-600 hover:bg-orange-200 transition-colors inline-block"
                                      title="Aceder ao cPanel"
                                    >
                                      <Globe className="w-3.5 h-3.5" />
                                    </a>
                                  </td>
                                  <td className="px-3 py-1.5 whitespace-nowrap text-xs text-gray-900 leading-tight">
                                    {sub?.ip_address || client.ip || '---'}
                                  </td>
                                  <td className="px-3 py-1.5 whitespace-nowrap text-xs text-gray-900 font-medium leading-tight">
                                    {client.username}
                                  </td>
                                  <td className="px-3 py-1.5 whitespace-nowrap text-xs text-blue-600 leading-tight">
                                    <a href={`mailto:${client.email}`} className="hover:underline italic">
                                      {client.email}
                                    </a>
                                  </td>
                                  <td className="px-3 py-1.5 whitespace-nowrap text-xs text-gray-500 leading-tight">
                                    {sub?.setup_date ? new Date(sub.setup_date).toLocaleString('pt-PT', { day: '2-digit', month: '2-digit', year: 'numeric' }) :
                                      client.created ? new Date(client.created).toLocaleString('pt-PT', { day: '2-digit', month: '2-digit', year: 'numeric' }) : '---'}
                                  </td>
                                  <td className="px-3 py-1.5 whitespace-nowrap text-xs text-gray-900 leading-tight">
                                    {sub?.quota || (client.disk_limit > 0 ? `${client.disk_limit} MB` : 'Unlimited')}
                                  </td>
                                  <td className="px-3 py-1.5 whitespace-nowrap text-xs text-gray-900 leading-tight">
                                    {sub?.disk_used || `${client.disk_usage} MB`}
                                  </td>
                                  <td className="px-3 py-1.5 whitespace-nowrap text-xs font-medium leading-tight">
                                    <div className="flex gap-2">
                                      <button
                                        onClick={() => setEditingAccount(client)}
                                        className="p-1 bg-blue-50 rounded-md text-blue-600 hover:bg-blue-100 transition-colors"
                                        title="Editar Conta"
                                      >
                                        <Edit className="w-3.5 h-3.5" />
                                      </button>
                                      {client.status === 'active' ? (
                                        <button
                                          onClick={() => handleSuspendClient(client.username)}
                                          className="p-1 bg-yellow-100 rounded-md text-yellow-600 hover:bg-yellow-200 transition-colors"
                                          title="Suspender Conta"
                                        >
                                          <EyeOff className="w-3.5 h-3.5" />
                                        </button>
                                      ) : (
                                        <button
                                          onClick={() => handleUnsuspendClient(client.username)}
                                          className="p-1 bg-green-100 rounded-md text-green-600 hover:bg-green-200 transition-colors"
                                          title="Ativar Conta"
                                        >
                                          <Check className="w-3.5 h-3.5" />
                                        </button>
                                      )}
                                      <button
                                        onClick={() => handleTerminateClient(client.username)}
                                        className="p-1 bg-red-100 rounded-md text-red-600 hover:bg-red-200 transition-colors"
                                        title="Terminar Conta"
                                      >
                                        <Trash2 className="w-3.5 h-3.5" />
                                      </button>
                                    </div>
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </>
                )}
              </div>
            )
          }

          {
            activeSection === 'notifications' && (
              <div>
                <div className="flex justify-between items-center mb-8">
                  <h1 className="text-3xl font-bold text-gray-900">Centro de Notificações</h1>
                  <div className="flex items-center gap-4">
                    <button
                      onClick={() => {
                        if (confirm('Deseja executar a verificação diária e enviar notificações automáticas agora?')) {
                          alert('Iniciando envio em lote...')
                        }
                      }}
                      className="bg-orange-600 hover:bg-orange-700 text-white px-3 py-1.5 rounded-md flex items-center gap-2 transition-colors text-sm"
                    >
                      <Bell className="w-4 h-4" />
                      Executar Verificação Diária
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                  {/* Stats */}
                  <div className="lg:col-span-1 space-y-6">
                    <div className="bg-white rounded-xl shadow-md p-6">
                      <h3 className="text-lg font-semibold text-gray-900 mb-4">Próximas Expirações</h3>
                      <div className="space-y-4">
                        <div className="flex items-center justify-between p-3 bg-red-50 rounded-md">
                          <div className="flex items-center gap-3">
                            <AlertCircle className="w-5 h-5 text-red-600" />
                            <span className="text-sm font-medium text-gray-900">Expiram hoje/amanhã</span>
                          </div>
                          <span className="text-sm font-bold text-red-600">
                            {subscriptions.filter(s => s.expiry_date && new Date(s.expiry_date) <= new Date(Date.now() + 86400000)).length}
                          </span>
                        </div>
                        <div className="flex items-center justify-between p-3 bg-orange-50 rounded-md">
                          <div className="flex items-center gap-3">
                            <Clock className="w-5 h-5 text-orange-600" />
                            <span className="text-sm font-medium text-gray-900">Em 7 dias</span>
                          </div>
                          <span className="text-sm font-bold text-orange-600">
                            {subscriptions.filter(s => s.expiry_date && new Date(s.expiry_date) <= new Date(Date.now() + 7 * 86400000)).length}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="bg-white rounded-xl shadow-md p-6">
                      <h3 className="text-lg font-semibold text-gray-900 mb-4">Configurações de Template</h3>
                      <p className="text-sm text-gray-600 mb-4">Os templates de email são configurados em <code>notification-system.ts</code>.</p>
                      <button className="w-full py-1.5 border border-gray-300 rounded-md text-sm hover:bg-gray-50 flex items-center justify-center gap-2">
                        <Settings className="w-4 h-4" />
                        Editar Templates
                      </button>
                    </div>
                  </div>

                  {/* Candidates Table */}
                  <div className="lg:col-span-2">
                    <div className="bg-white rounded-xl shadow-md overflow-hidden">
                      <div className="px-6 py-4 border-b border-gray-200">
                        <h3 className="text-lg font-semibold text-gray-900">Candidatos a Notificação</h3>
                      </div>
                      <div className="overflow-x-auto">
                        <table className="w-full">
                          <thead className="bg-gray-50 border-b border-gray-200">
                            <tr>
                              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Cliente / Domínio</th>
                              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Data Exp.</th>
                              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Ação</th>
                            </tr>
                          </thead>
                          <tbody className="bg-white divide-y divide-gray-200">
                            {subscriptions
                              .filter(s => s.expiry_date) // Only show those with expiry dates
                              .map((sub) => (
                                <tr key={sub.id} className="hover:bg-gray-50">
                                  <td className="px-6 py-4 whitespace-nowrap">
                                    <div className="text-sm font-medium text-gray-900">{sub.vhm_username}</div>
                                    <div className="text-xs text-gray-500">{sub.domain}</div>
                                  </td>
                                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                    {sub.expiry_date}
                                  </td>
                                  <td className="px-6 py-4 whitespace-nowrap">
                                    <span className={`px-2 py-1 text-xs font-semibold rounded-full ${sub.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                                      }`}>
                                      {sub.status}
                                    </span>
                                  </td>
                                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                                    <button
                                      onClick={async () => {
                                        alert(`E-mail de notificação enviado para ${sub.client_email || 'cliente'}`)
                                        await handleUpdateSubscription(sub.id, { last_notified_at: new Date().toISOString() })
                                      }}
                                      className="text-blue-600 hover:text-blue-900 flex items-center gap-1"
                                    >
                                      <Mail className="w-4 h-4" />
                                      Notificar
                                    </button>
                                  </td>
                                </tr>
                              ))}
                            {subscriptions.filter(s => s.expiry_date).length === 0 && (
                              <tr>
                                <td colSpan={4} className="px-6 py-10 text-center text-gray-500 italic">
                                  Sincronize o VHM e defina datas de expiração para ver candidatos aqui.
                                </td>
                              </tr>
                            )}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )
          }
        </div >
      </div >

      {/* Edit Account Modal */}
      {editingAccount && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
              <h3 className="text-lg font-bold text-gray-900">Editar Conta: {editingAccount.username}</h3>
              <button onClick={() => setEditingAccount(null)} className="text-gray-400 hover:text-gray-600">
                <X className="w-6 h-6" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">E-mail de Contacto</label>
                <input
                  type="email"
                  value={editFormEmail}
                  onChange={(e) => setEditFormEmail(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-red-500 focus:border-red-500"
                  placeholder="exemplo@gmail.com"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Cota de Disco (MB)</label>
                <div className="relative">
                  <input
                    type="number"
                    value={editFormQuota}
                    onChange={(e) => setEditFormQuota(parseInt(e.target.value) || 0)}
                    className="w-full px-3 py-1.5 border border-gray-300 rounded-md focus:ring-2 focus:ring-red-500 focus:border-red-500 text-sm"
                    placeholder="2048"
                  />
                  <span className="absolute right-3 top-2 text-gray-400 text-sm">MB</span>
                </div>
                <p className="mt-1 text-xs text-gray-500">Defina 0 para ilimitado (conforme WHM).</p>
              </div>
              <div className="bg-gray-50 p-3 rounded-md text-xs text-gray-600">
                <p><strong>Dica:</strong> Estas alterações serão enviadas diretamente para o servidor VHM através da API.</p>
              </div>
            </div>
            <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 flex justify-end gap-3">
              <button
                onClick={() => setEditingAccount(null)}
                className="px-3 py-1.5 text-sm text-gray-700 hover:text-gray-900 font-medium"
              >
                Cancelar
              </button>
              <button
                onClick={() => handleUpdateClientData(editingAccount.username, { email: editFormEmail, quota: editFormQuota })}
                disabled={isSavingAccount}
                className="px-4 py-1.5 bg-red-600 hover:bg-red-700 text-white text-sm font-bold rounded-md shadow-md transition-all flex items-center gap-2"
              >
                {isSavingAccount ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    Salvando...
                  </>
                ) : (
                  <>
                    <Check className="w-4 h-4" />
                    Salvar Alterações
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Create Account Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-white rounded-md shadow-xl max-w-2xl w-full my-8 animate-in fade-in zoom-in duration-200">
            <div className="px-6 py-3 border-b border-gray-200 flex justify-between items-center bg-gray-50">
              <div className="flex items-center gap-2">
                <UserPlus className="w-5 h-5 text-red-600" />
                <h3 className="text-lg font-bold text-gray-900">Criar uma Nova Conta (WHM)</h3>
              </div>
              <button onClick={() => setShowCreateModal(false)} className="text-gray-400 hover:text-gray-600">
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto max-h-[70vh]">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Domain Information */}
                <div className="space-y-4">
                  <h4 className="font-bold text-gray-700 border-b pb-1 text-sm uppercase">Informações do Domínio</h4>
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1">Domínio *</label>
                    <input
                      type="text"
                      placeholder="exemplo.com"
                      value={newAccountData.domain}
                      onChange={(e) => setNewAccountData({ ...newAccountData, domain: e.target.value })}
                      className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-red-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1">Usuário *</label>
                    <input
                      type="text"
                      placeholder="usuario123"
                      value={newAccountData.username}
                      onChange={(e) => setNewAccountData({ ...newAccountData, username: e.target.value })}
                      className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-red-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1">Senha (Opcional)</label>
                    <input
                      type="password"
                      placeholder="Deixe vazio para gerar"
                      value={newAccountData.password}
                      onChange={(e) => setNewAccountData({ ...newAccountData, password: e.target.value })}
                      className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-red-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1">E-mail de Contacto *</label>
                    <input
                      type="email"
                      placeholder="admin@exemplo.com"
                      value={newAccountData.email}
                      onChange={(e) => setNewAccountData({ ...newAccountData, email: e.target.value })}
                      className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-red-500"
                    />
                  </div>
                </div>

                {/* Package and Settings */}
                <div className="space-y-4">
                  <h4 className="font-bold text-gray-700 border-b pb-1 text-sm uppercase">Pacote e Recursos</h4>
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1">Pacote (Package) *</label>
                    <select
                      value={newAccountData.plan}
                      onChange={(e) => setNewAccountData({ ...newAccountData, plan: e.target.value })}
                      className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-red-500"
                    >
                      <option value="">Selecione um pacote...</option>
                      {plans.map(plan => (
                        <option key={plan.name} value={plan.name}>{plan.name}</option>
                      ))}
                    </select>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-gray-600 mb-1">Cota Disco (MB)</label>
                      <input
                        type="number"
                        placeholder="0 = Ilimitado"
                        value={newAccountData.quota}
                        onChange={(e) => setNewAccountData({ ...newAccountData, quota: parseInt(e.target.value) || 0 })}
                        className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-red-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-gray-600 mb-1">Bandwidth (MB)</label>
                      <input
                        type="number"
                        placeholder="0 = Ilimitado"
                        value={newAccountData.bwlimit}
                        onChange={(e) => setNewAccountData({ ...newAccountData, bwlimit: parseInt(e.target.value) || 0 })}
                        className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-red-500"
                      />
                    </div>
                  </div>

                  <div className="space-y-3 pt-2">
                    <label className="flex items-center gap-2 cursor-pointer group">
                      <input
                        type="checkbox"
                        checked={newAccountData.cgi === 1}
                        onChange={(e) => setNewAccountData({ ...newAccountData, cgi: e.target.checked ? 1 : 0 })}
                        className="w-4 h-4 text-red-600 rounded-sm border-gray-300"
                      />
                      <span className="text-sm text-gray-600 group-hover:text-gray-900">Acesso CGI</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer group">
                      <input
                        type="checkbox"
                        checked={newAccountData.dkim === 1}
                        onChange={(e) => setNewAccountData({ ...newAccountData, dkim: e.target.checked ? 1 : 0 })}
                        className="w-4 h-4 text-red-600 rounded-sm border-gray-300"
                      />
                      <span className="text-sm text-gray-600 group-hover:text-gray-900">Habilitar DKIM</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer group">
                      <input
                        type="checkbox"
                        checked={newAccountData.spf === 1}
                        onChange={(e) => setNewAccountData({ ...newAccountData, spf: e.target.checked ? 1 : 0 })}
                        className="w-4 h-4 text-red-600 rounded-sm border-gray-300"
                      />
                      <span className="text-sm text-gray-600 group-hover:text-gray-900">Habilitar SPF</span>
                    </label>
                  </div>
                </div>
              </div>

              <div className="mt-6 p-4 bg-blue-50 border border-blue-100 rounded-md">
                <div className="flex gap-3">
                  <AlertCircle className="w-5 h-5 text-blue-600 shrink-0" />
                  <p className="text-xs text-blue-700 leading-relaxed">
                    <strong>Nota:</strong> Esta ação cria uma conta real no servidor WHM. Certifique-se de que o domínio é válido e que tem recursos suficientes no seu plano de revenda.
                  </p>
                </div>
              </div>
            </div>

            <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 flex justify-end gap-3">
              <button
                onClick={() => setShowCreateModal(false)}
                className="px-4 py-1.5 text-sm text-gray-700 hover:text-gray-900 font-medium"
              >
                Cancelar
              </button>
              <button
                onClick={handleCreateAccount}
                disabled={isCreatingAccount}
                className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold rounded-md shadow-sm transition-all flex items-center gap-2"
              >
                {isCreatingAccount ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    Criando...
                  </>
                ) : (
                  <>
                    <Check className="w-4 h-4" />
                    Criar Conta
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default function AdminPanel() {
  return (
    <I18nProvider>
      <AdminPanelContent />
    </I18nProvider>
  )
}
