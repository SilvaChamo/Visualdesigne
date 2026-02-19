'use client'

import { useState, useEffect } from 'react'
import { I18nProvider, useI18n } from '@/lib/i18n'
import { validateAdminCredentials, generateAdminToken, validateAdminToken } from '@/lib/admin-auth'
import { vhmAPI, VHMClient, VHMStats } from '@/lib/vhm-api'
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

function AdminPanelContent() {
  const { t } = useI18n()
  const [activeSection, setActiveSection] = useState('dashboard')
  const [clients, setClients] = useState<VHMClient[]>([])
  const [stats, setStats] = useState<VHMStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showClientForm, setShowClientForm] = useState(false)
  const [editingClient, setEditingClient] = useState<VHMClient | null>(null)
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [authError, setAuthError] = useState('')
  const [searchTerm, setSearchTerm] = useState('')

  useEffect(() => {
    const savedToken = localStorage.getItem('admin-token')
    if (savedToken && validateAdminToken(savedToken)) {
      setIsAuthenticated(true)
    } else {
      setIsAuthenticated(false)
    }
    
    if (isAuthenticated) {
      loadVHMData()
    }
  }, [isAuthenticated])

  const loadVHMData = async () => {
    setLoading(true)
    setError(null)
    
    try {
      // Login to VHM API
      const loginSuccess = await vhmAPI.login()
      if (!loginSuccess) {
        throw new Error('Failed to login to VHM API')
      }

      // Load ALL clients and stats
      const [clientsData, statsData] = await Promise.all([
        vhmAPI.getAllClients(), // Get ALL clients, no limit
        vhmAPI.getStats()
      ])

      setClients(clientsData)
      setStats(statsData)
      
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
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
                placeholder="seu@email.com"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Senha</label>
              <input
                type="password"
                name="password"
                required
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
                placeholder="••••••••"
              />
            </div>
            
            {authError && (
              <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-lg text-sm">
                {authError}
              </div>
            )}
            
            <button
              type="submit"
              className="w-full bg-red-600 hover:bg-red-700 text-white py-3 px-4 rounded-lg font-medium transition-colors duration-200"
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

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Main Content */}
      <div className="flex">
        {/* Sidebar */}
        <div className="w-64 bg-white shadow-lg min-h-screen">
          <div className="p-6 border-b border-gray-200">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-red-600 rounded-lg flex items-center justify-center">
                <Globe className="w-6 h-6 text-white" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-gray-900">Painel Admin</h2>
                <p className="text-sm text-gray-600">Gestão Completa</p>
              </div>
            </div>
          </div>
          
          <nav className="p-4">
            {menuItems.map((item, index) => (
              <div key={item.id}>
                <div className="flex items-center">
                  <button
                    onClick={() => setActiveSection(item.id)}
                    className={`flex-1 flex items-center px-4 py-2 transition-all mb-2 ${
                      activeSection === item.id
                        ? 'bg-red-50 text-red-600 border-l-4 border-red-600'
                        : 'text-gray-700 hover:bg-gray-50 hover:text-gray-900'
                    }`}
                    style={{
                      borderRadius: activeSection === item.id ? '5px' : '0',
                      borderTopLeftRadius: activeSection === item.id ? '5px' : '0',
                      borderBottomLeftRadius: activeSection === item.id ? '5px' : '0'
                    }}
                  >
                    <span className="font-medium">{item.label}</span>
                  </button>
                  {activeSection === item.id && (
                    <ChevronRight className="w-4 h-4 text-red-600 ml-2" />
                  )}
                </div>
                {index < menuItems.length - 1 && (
                  <div className="border-b border-gray-200 mb-2"></div>
                )}
              </div>
            ))}
          </nav>
          
          <div className="absolute bottom-0 w-64 p-4 border-t border-gray-200">
            <div className="flex items-start gap-3 mb-3">
              <div className="w-16 h-16 rounded-full overflow-hidden relative bg-gradient-to-br from-red-500 to-red-600 shadow-lg flex-shrink-0">
                <img 
                  src="https://lh3.googleusercontent.com/a-/AOh14GjZ8Q7T2L3W4R5S6U7V8W9X0Y1Z2X3W4R5S6U7V8W9X0Q=s96-c" 
                  alt="Silva Chamo"
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    const target = e.currentTarget;
                    target.style.display = 'none';
                    const parent = target.parentElement;
                    if (parent) {
                      parent.innerHTML = '<div class="w-full h-full flex items-center justify-center bg-gradient-to-br from-red-500 to-red-600"><span class="text-white font-bold text-lg">SC</span></div>';
                    }
                  }}
                />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium text-gray-900 mb-1">Silva Chamo</div>
                <div className="text-xs text-gray-600 truncate">silva.chamo@gmail.com</div>
              </div>
            </div>
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
                    className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors"
                  >
                    <Globe className="w-5 h-5" />
                    Painel VHM
                  </button>
                  <button
                    onClick={handleLogout}
                    className="bg-gray-600 hover:bg-red-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors"
                  >
                    <LogOut className="w-5 h-5" />
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
                <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-lg mb-6">
                  Erro ao carregar dados do VHM: {error}
                </div>
              )}
              
              {!loading && !error && stats && (
                <>
                  {/* Stats Cards */}
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                    <div className="bg-white rounded-xl shadow-md p-6 hover:shadow-lg transition-shadow">
                      <div className="flex items-center justify-between mb-4">
                        <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
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
                        <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
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
                        <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
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
                        <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center">
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
                        <button className="w-full flex items-center gap-3 px-4 py-3 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-lg transition-colors">
                          <UserPlus className="w-5 h-5" />
                          <span>Novo Cliente</span>
                        </button>
                        <button 
                          onClick={() => loadVHMData()}
                          className="w-full flex items-center gap-3 px-4 py-3 bg-green-50 hover:bg-green-100 text-green-700 rounded-lg transition-colors"
                        >
                          <RefreshCw className="w-5 h-5" />
                          <span>Atualizar Dados</span>
                        </button>
                        <button className="w-full flex items-center gap-3 px-4 py-3 bg-purple-50 hover:bg-purple-100 text-purple-700 rounded-lg transition-colors">
                          <Mail className="w-5 h-5" />
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

          {activeSection === 'clients' && (
            <div>
              <div className="flex justify-between items-center mb-8">
                <h1 className="text-3xl font-bold text-gray-900">Gestão de Clientes</h1>
                <div className="flex items-center gap-4">
                  <button 
                    onClick={openVHMPanel}
                    className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors"
                  >
                    <Globe className="w-5 h-5" />
                    Painel VHM
                  </button>
                  <button
                    onClick={handleLogout}
                    className="bg-gray-600 hover:bg-red-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors"
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
                          onClick={openVHMPanel}
                          className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors font-medium"
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
                            className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 w-64"
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
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Usuário</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Domínio</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Plano</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Disco</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Banda</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Ações</th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                          {filteredClients.map((client) => (
                            <tr key={client.username} className="hover:bg-gray-50">
                              <td className="px-6 py-4 whitespace-nowrap">
                                <div>
                                  <div className="text-sm font-medium text-gray-900">{client.username}</div>
                                  <div className="text-sm text-gray-500">{client.email}</div>
                                </div>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{client.domain}</td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <span className={`px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full border ${getStatusColor(client.status)}`}>
                                  {getStatusText(client.status)}
                                </span>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{client.plan}</td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                {formatBytes(client.disk_usage)} / {formatBytes(client.disk_limit)}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                {formatBytes(client.bandwidth_usage)} / {formatBytes(client.bandwidth_limit)}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                                <div className="flex gap-2">
                                  {client.status === 'active' ? (
                                    <button
                                      onClick={() => handleSuspendClient(client.username)}
                                      className="text-orange-600 hover:text-orange-900"
                                      title="Suspender"
                                    >
                                      <AlertCircle className="w-4 h-4" />
                                    </button>
                                  ) : (
                                    <button
                                      onClick={() => handleUnsuspendClient(client.username)}
                                      className="text-green-600 hover:text-green-900"
                                      title="Reativar"
                                    >
                                      <Check className="w-4 h-4" />
                                    </button>
                                  )}
                                  <button
                                    onClick={() => handleTerminateClient(client.username)}
                                    className="text-red-600 hover:text-red-900"
                                    title="Terminar"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      </div>
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
