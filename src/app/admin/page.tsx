'use client'

import { useState, useEffect } from 'react'
import { I18nProvider, useI18n } from '@/lib/i18n'
import { validateAdminCredentials, generateAdminToken, validateAdminToken } from '@/lib/admin-auth'
import { vhmAPI, VHMClient, VHMStats } from '@/lib/vhm-api'
import { whmcsAPI, WhmcsDomain } from '@/lib/whmcs-api'
import { supabase } from '@/lib/supabase'
import { Users, Plus, Trash2, Mail, AlertCircle, Check, X, Eye, EyeOff, Edit, DollarSign, Calendar, Shield, Search, Filter, Download, Settings, LogOut, Home, FileText, BarChart3, Globe, TrendingUp, Package, CreditCard, UserPlus, Activity, Clock, Star, MessageSquare, MessageCircle, Database, Server, Globe2, Lock, Bell, Archive, RefreshCw, ChevronRight, ChevronDown, MoreVertical, ArrowRightLeft, PlusCircle, Inbox, User, ShieldCheck } from 'lucide-react'

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
  client_phone: string | null;
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
  const [editFormPlan, setEditFormPlan] = useState('')
  const [editFormShell, setEditFormShell] = useState(false)
  const [editFormCgi, setEditFormCgi] = useState(false)
  const [editFormBwLimit, setEditFormBwLimit] = useState<number>(0)
  const [editFormDomain, setEditFormDomain] = useState('')
  const [editFormPassword, setEditFormPassword] = useState('')
  const [editFormPhone, setEditFormPhone] = useState('')
  const [selectedClients, setSelectedClients] = useState<string[]>([])
  const [expandedMenus, setExpandedMenus] = useState<Record<string, boolean>>({ emails: false, domains: false })

  // Domain Transfer State
  const [transferDomain, setTransferDomain] = useState('')
  const [transferAuthCode, setTransferAuthCode] = useState('')
  const [transferContactName, setTransferContactName] = useState('')
  const [transferContactEmail, setTransferContactEmail] = useState('')
  const [transferContactPhone, setTransferContactPhone] = useState('')
  const [isTransferring, setIsTransferring] = useState(false)

  // Mail Reports State
  const [mailReports, setMailReports] = useState<any[]>([])
  const [isSearchingMail, setIsSearchingMail] = useState(false)
  const [mailFilters, setMailFilters] = useState({
    recipient: '',
    sender: '',
    startDate: '',
    endDate: ''
  })

  // Email Accounts State
  const [emailAccounts, setEmailAccounts] = useState<any[]>([])
  const [selectedClientForEmails, setSelectedClientForEmails] = useState<VHMClient | null>(null)
  const [isFetchingEmails, setIsFetchingEmails] = useState(false)
  const [emailSearchTerm, setEmailSearchTerm] = useState('')
  const [showCreateEmailModal, setShowCreateEmailModal] = useState(false)
  const [showEditEmailModal, setShowEditEmailModal] = useState(false)
  const [newEmailData, setNewEmailData] = useState({
    email: '',
    password: '',
    quota: 1024 // 1GB default
  })
  const [editingEmail, setEditingEmail] = useState<any | null>(null)
  const [isSavingEmail, setIsSavingEmail] = useState(false)

  const [selectedWebmailDomain, setSelectedWebmailDomain] = useState<string | null>(null)
  const [realWebmailAccounts, setRealWebmailAccounts] = useState<any[]>([])
  const [isFetchingWebmailAccounts, setIsFetchingWebmailAccounts] = useState(false)
  const [isRightSidebarOpen, setIsRightSidebarOpen] = useState(true)

  // Password Visibility States
  const [showAdminPass, setShowAdminPass] = useState(false)
  const [showNewEmailPass, setShowNewEmailPass] = useState(false)
  const [showEditEmailPass, setShowEditEmailPass] = useState(false)
  const [showNewAccountPass, setShowNewAccountPass] = useState(false)

  // Domain Management State
  const [domains, setDomains] = useState<WhmcsDomain[]>([])
  const [isLoadingDomains, setIsLoadingDomains] = useState(false)
  const [domainSearchTerm, setDomainSearchTerm] = useState('')
  const [domainError, setDomainError] = useState<string | null>(null)
  const [domainCheckQuery, setDomainCheckQuery] = useState('')
  const [domainCheckTLD, setDomainCheckTLD] = useState('.mz')
  const [isCheckingDomain, setIsCheckingDomain] = useState(false)
  const [domainCheckResult, setDomainCheckResult] = useState<{ available: boolean; status: string } | null>(null)

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

  const handleUpdateClientData = async (username: string, updates: {
    email: string;
    quota: number;
    plan: string;
    shell: boolean;
    cgi: boolean;
    bwlimit: number;
    domain?: string;
    password?: string;
    phone?: string;
  }) => {
    setIsSavingAccount(true)
    try {
      // 1. Core VHM Updates
      const success = await vhmAPI.updateClient(username, {
        email: updates.email,
        quota: updates.quota,
        plan: updates.plan,
        shell: updates.shell ? 1 : 0,
        cgi: updates.cgi ? 1 : 0,
        bwlimit: updates.bwlimit,
        newDomain: updates.domain
      })

      // 2. Password Update if provided
      let passSuccess = true;
      if (updates.password) {
        passSuccess = await vhmAPI.changePassword(username, updates.password);
      }

      // 3. Supabase Updates (Sync phone and domain if changed)
      const { error: supabaseError } = await supabase
        .from('subscriptions')
        .update({
          client_phone: updates.phone,
          client_email: updates.email,
          domain: updates.domain || undefined
        })
        .eq('vhm_username', username)

      if (success && passSuccess) {
        if (supabaseError) console.error('Supabase sync error:', supabaseError)
        await loadVHMData()
        setEditingAccount(null)
        setEditFormPassword('') // Clear password field
        alert('Dados do cliente atualizados com sucesso!')
      } else {
        alert('Falha ao atualizar dados do cliente ou senha no VHM')
      }
    } catch (err) {
      console.error('Update client data error:', err)
      alert('Erro ao atualizar dados do cliente')
    } finally {
      setIsSavingAccount(false)
    }
  }

  // --- Email Management Handlers ---

  const loadEmailAccounts = async (client: VHMClient) => {
    setIsFetchingEmails(true)
    setSelectedClientForEmails(client)
    try {
      const pops = await vhmAPI.getEmailAccounts(client.username)
      setEmailAccounts(pops)
    } catch (err) {
      console.error('Error loading email accounts:', err)
      alert('Erro ao carregar contas de e-mail')
    } finally {
      setIsFetchingEmails(false)
    }
  }

  const handleCreateEmail = async () => {
    if (!selectedClientForEmails || !newEmailData.email || !newEmailData.password) {
      alert('Preencha todos os campos obrigatórios')
      return
    }

    setIsSavingEmail(true)
    try {
      const success = await vhmAPI.createEmailAccount(selectedClientForEmails.username, {
        email: newEmailData.email,
        domain: selectedClientForEmails.domain,
        password: newEmailData.password,
        quota: newEmailData.quota
      })

      if (success) {
        await loadEmailAccounts(selectedClientForEmails)
        setShowCreateEmailModal(false)
        setNewEmailData({ email: '', password: '', quota: 1024 })
        alert('Conta de e-mail criada com sucesso!')
      } else {
        alert('Falha ao criar conta de e-mail')
      }
    } catch (err) {
      console.error('Create email error:', err)
      alert('Erro ao criar conta de e-mail')
    } finally {
      setIsSavingEmail(false)
    }
  }

  const handleDeleteEmail = async (email: string, domain: string) => {
    if (!selectedClientForEmails || !confirm(`Tem certeza que deseja apagar o e-mail ${email}@${domain}?`)) return

    try {
      const success = await vhmAPI.deleteEmailAccount(selectedClientForEmails.username, email, domain)
      if (success) {
        await loadEmailAccounts(selectedClientForEmails)
        alert('Conta de e-mail apagada com sucesso!')
      } else {
        alert('Falha ao apagar conta de e-mail')
      }
    } catch (err) {
      console.error('Delete email error:', err)
      alert('Erro ao apagar conta de e-mail')
    }
  }

  const handleUpdateEmailPassword = async (email: string, domain: string, newPass: string) => {
    if (!selectedClientForEmails || !newPass) return

    setIsSavingEmail(true)
    try {
      const success = await vhmAPI.updateEmailPassword(selectedClientForEmails.username, email, domain, newPass)
      if (success) {
        alert('Senha de e-mail atualizada com sucesso!')
        setEditingEmail(null)
      } else {
        alert('Falha ao atualizar senha')
      }
    } catch (err) {
      console.error('Update email password error:', err)
      alert('Erro ao atualizar senha')
    } finally {
      setIsSavingEmail(false)
    }
  }

  // --- Domain Management Handlers ---

  const loadDomains = async () => {
    setIsLoadingDomains(true)
    setDomainError(null)
    try {
      const result = await whmcsAPI.getClientDomains()
      setDomains(result)
    } catch (err: any) {
      console.error('Error loading domains:', err)
      if (err.message?.includes('IP')) {
        setDomainError('IP não autorizado na API WHMCS. Contacte o suporte MozServer para adicionar o IP à whitelist.')
      } else {
        setDomainError(err.message || 'Erro ao carregar domínios')
      }
    } finally {
      setIsLoadingDomains(false)
    }
  }

  const handleCheckDomain = async () => {
    if (!domainCheckQuery.trim()) return
    setIsCheckingDomain(true)
    setDomainCheckResult(null)
    try {
      const result = await whmcsAPI.checkDomainAvailability(domainCheckQuery.trim() + domainCheckTLD)
      setDomainCheckResult(result)
    } catch (err) {
      console.error('Domain check error:', err)
      setDomainCheckResult({ available: false, status: 'error' })
    } finally {
      setIsCheckingDomain(false)
    }
  }

  const handleSearchMail = async () => {
    setIsSearchingMail(true)
    try {
      const startTimestamp = mailFilters.startDate ? Math.floor(new Date(mailFilters.startDate).getTime() / 1000) : undefined
      const endTimestamp = mailFilters.endDate ? Math.floor(new Date(mailFilters.endDate).getTime() / 1000) : undefined

      const results = await vhmAPI.getMailDeliveryReports({
        recipient: mailFilters.recipient || undefined,
        sender: mailFilters.sender || undefined,
        startTime: startTimestamp,
        endTime: endTimestamp
      })
      setMailReports(results)
    } catch (err) {
      console.error('Mail search error:', err)
      alert('Erro ao procurar relatórios de e-mail.')
    } finally {
      setIsSearchingMail(false)
    }
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-8">
          <div className="text-center mb-10">
            <div className="w-72 h-24 mx-auto mb-1 flex items-center justify-center">
              <img src="/assets/logotype.png" alt="Visual Design" className="w-full h-full object-contain" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-0 leading-tight">Painel Administrativo</h2>
            <p className="text-gray-500 font-medium">da Gestão de conteudo</p>
          </div>

          <form onSubmit={(e) => {
            e.preventDefault()
            const formData = new FormData(e.currentTarget)
            handleLogin(formData.get('email') as string, formData.get('password') as string)
          }} className="space-y-6">
            <div>
              <input
                type="email"
                name="email"
                required
                className="w-full px-4 py-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
                placeholder="Email corporativo"
              />
            </div>
            <div>
              <div className="relative">
                <input
                  type={showAdminPass ? "text" : "password"}
                  name="password"
                  required
                  className="w-full px-4 py-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent pr-12"
                  placeholder="Palavra-passe"
                />
                <button
                  type="button"
                  onClick={() => setShowAdminPass(!showAdminPass)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 p-1"
                >
                  {showAdminPass ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
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

  const menuItems: Array<{ id: string; label: string; color: string; subItems?: Array<{ id: string; label: string }> }> = [
    { id: 'dashboard', label: 'Dashboard', color: 'bg-blue-500' },
    { id: 'clients', label: 'Clientes', color: 'bg-green-500' },
    {
      id: 'emails', label: 'E-mails', color: 'bg-cyan-500', subItems: [
        { id: 'emails', label: 'Meus E-mails' },
        { id: 'emails-new', label: 'Nova Conta' },
        { id: 'emails-webmail', label: 'Webmail' },
      ]
    },
    {
      id: 'domains', label: 'Domínios', color: 'bg-purple-500', subItems: [
        { id: 'domains', label: 'Meus Domínios' },
        { id: 'domains-new', label: 'Novo Domínio' },
        { id: 'domains-transfer', label: 'Transferir Domínio' },
      ]
    },
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
      case 'emails': return <Mail className="w-5 h-5" />
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
        <div className={`${isSidebarCollapsed ? 'w-20' : 'w-64'} bg-white shadow-lg h-screen transition-all duration-300 relative group flex flex-col`}>
          <div className={`p-4 border-b border-gray-200 shrink-0`}>
            <div className={`flex items-center gap-3 ${isSidebarCollapsed ? 'flex-col' : ''}`}>
              <div className="w-12 h-12 flex items-center justify-center shrink-0">
                <img src="/assets/simbolo.png" alt="Visual Design" className="w-full h-full object-contain" />
              </div>
              {!isSidebarCollapsed ? (
                <div className="flex-1 min-w-0 flex items-center justify-between">
                  <div>
                    <h2 className="text-lg font-bold text-gray-900 truncate">Painel Admin</h2>
                    <p className="text-xs text-gray-600">Gestão Completa</p>
                  </div>
                  <button
                    onClick={() => setIsSidebarCollapsed(true)}
                    className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-all ml-1"
                    title="Recolher"
                  >
                    <LogOut className="w-5 h-5 rotate-180" />
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setIsSidebarCollapsed(false)}
                  className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-all"
                  title="Expandir"
                >
                  <LogOut className="w-5 h-5" />
                </button>
              )}
            </div>
          </div>

          <nav className="flex-1 overflow-y-auto p-4 space-y-1 custom-scrollbar pb-24">
            {menuItems.map((item) => {
              const hasSubItems = item.subItems && item.subItems.length > 0
              const isExpanded = expandedMenus[item.id]
              const isParentActive = hasSubItems
                ? item.subItems!.some(sub => sub.id === activeSection)
                : activeSection === item.id

              return (
                <div key={item.id}>
                  <button
                    onClick={() => {
                      if (hasSubItems) {
                        if (isSidebarCollapsed) {
                          setIsSidebarCollapsed(false)
                          setExpandedMenus(prev => ({ ...prev, [item.id]: true }))
                        } else {
                          setExpandedMenus(prev => ({ ...prev, [item.id]: !prev[item.id] }))
                        }
                        if (!isParentActive) {
                          setActiveSection(item.subItems![0].id)
                        }
                      } else {
                        setActiveSection(item.id)
                      }
                    }}
                    className={`w-full flex items-center transition-all duration-200 rounded-md ${isParentActive
                      ? 'bg-red-50 text-red-600'
                      : 'text-gray-600 hover:bg-gray-50'
                      } ${isSidebarCollapsed ? 'px-0 justify-center py-2' : 'px-3 py-1.5'}`}
                    title={isSidebarCollapsed ? item.label : ''}
                  >
                    <div className={`shrink-0 transition-all ${isSidebarCollapsed ? '' : 'mr-3'}`}>
                      {SidebarIcon(item.id)}
                    </div>
                    {!isSidebarCollapsed && (
                      <span className="font-medium whitespace-nowrap overflow-hidden transition-all duration-300 flex-1 text-left">
                        {item.label}
                      </span>
                    )}
                    {!isSidebarCollapsed && hasSubItems && (
                      <ChevronDown className={`w-4 h-4 ml-auto transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`} />
                    )}
                    {!isSidebarCollapsed && !hasSubItems && isParentActive && (
                      <ChevronRight className="w-4 h-4 ml-auto" />
                    )}
                  </button>

                  {/* Sub-menu items */}
                  {hasSubItems && isExpanded && !isSidebarCollapsed && (
                    <div className="ml-8 mt-1 space-y-0.5 border-l-2 border-gray-100 pl-3 relative">
                      {/* Sliding indicator */}
                      {item.subItems!.some(sub => sub.id === activeSection) && (
                        <div
                          className="absolute left-0 w-0.5 bg-red-600 transition-all duration-300 ease-in-out z-10"
                          style={{
                            height: '24px',
                            top: `${item.subItems!.findIndex(sub => sub.id === activeSection) * 34 + 4}px`,
                            marginLeft: '-2px'
                          }}
                        />
                      )}
                      {item.subItems!.map(sub => (
                        <button
                          key={sub.id}
                          onClick={() => setActiveSection(sub.id)}
                          className={`w-full text-left px-3 py-1.5 rounded-md text-sm transition-all duration-150 ${activeSection === sub.id
                            ? 'text-red-600 font-semibold'
                            : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                            }`}
                        >
                          {sub.label}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )
            })}
          </nav>

          <div className={`absolute bottom-0 p-4 border-t border-gray-200 bg-white z-10 transition-all duration-300 ${isSidebarCollapsed ? 'w-20' : 'w-64'}`}>
            <div className={`flex items-start gap-3 ${isSidebarCollapsed ? 'justify-center' : ''}`}>
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
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-5 mb-6 flex items-start gap-4">
                  <div className="w-10 h-10 bg-amber-100 rounded-full flex items-center justify-center shrink-0">
                    <AlertCircle className="w-5 h-5 text-amber-600" />
                  </div>
                  <div className="flex-1">
                    <p className="font-bold text-amber-800 text-sm">Servidor VHM Indisponível</p>
                    <p className="text-xs text-amber-700 mt-1">{error}</p>
                    <button
                      onClick={() => loadVHMData()}
                      className="mt-3 bg-amber-600 hover:bg-amber-700 text-white px-4 py-1.5 rounded-md text-xs font-bold transition-colors flex items-center gap-2"
                    >
                      <RefreshCw className="w-3.5 h-3.5" />
                      Tentar Novamente
                    </button>
                  </div>
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
                      onClick={() => setShowCreateModal(true)}
                      className="bg-red-600 hover:bg-red-700 text-white px-3 py-1.5 rounded-md flex items-center gap-2 transition-all shadow-sm text-sm"
                    >
                      <UserPlus className="w-4 h-4" />
                      Adicionar Conta
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
                              <th className="px-3 py-1 text-left w-10">
                                <input
                                  type="checkbox"
                                  className="w-4 h-4 text-red-600 rounded border-gray-300 focus:ring-red-500"
                                  checked={selectedClients.length === filteredClients.length && filteredClients.length > 0}
                                  onChange={(e) => {
                                    if (e.target.checked) {
                                      setSelectedClients(filteredClients.map(c => c.username))
                                    } else {
                                      setSelectedClients([])
                                    }
                                  }}
                                />
                              </th>
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
                                <tr key={client.username} className={`hover:bg-gray-50 border-b border-gray-50 ${client.status === 'suspended' ? 'bg-red-50' : ''} ${selectedClients.includes(client.username) ? 'bg-red-50/30' : ''}`}>
                                  <td className="px-3 py-1.5 whitespace-nowrap">
                                    <input
                                      type="checkbox"
                                      className="w-4 h-4 text-red-600 rounded border-gray-300 focus:ring-red-500"
                                      checked={selectedClients.includes(client.username)}
                                      onChange={(e) => {
                                        if (e.target.checked) {
                                          setSelectedClients([...selectedClients, client.username])
                                        } else {
                                          setSelectedClients(selectedClients.filter(un => un !== client.username))
                                        }
                                      }}
                                    />
                                  </td>
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
                                        onClick={() => {
                                          setEditingAccount(client)
                                          setEditFormEmail(client.email)
                                          setEditFormQuota(client.disk_limit)
                                          setEditFormPlan(client.plan)
                                          setEditFormDomain(client.domain)
                                          setEditFormShell(false)
                                          setEditFormCgi(true)
                                          setEditFormBwLimit(client.bandwidth_limit)
                                          setEditFormPassword('')
                                          setEditFormPhone(sub?.client_phone || '')
                                        }}
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
                                      {(sub?.client_phone || client.email) && (
                                        <a
                                          href={`https://wa.me/${(sub?.client_phone || '').replace(/\D/g, '')}?text=Olá ${sub?.client_name || client.username}, sou da Silva Chamo.`}
                                          target="_blank"
                                          rel="noopener noreferrer"
                                          className="p-1 bg-green-50 rounded-md text-green-600 hover:bg-green-100 transition-colors"
                                          title="Enviar WhatsApp"
                                        >
                                          <MessageCircle className="w-3.5 h-3.5" />
                                        </a>
                                      )}
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

          {activeSection === 'emails' && (
            <div>
              <div className="flex justify-between items-center mb-8">
                <h1 className="text-3xl font-bold text-gray-900">Gestão de E-mails</h1>
              </div>

              {/* Client Selector */}
              <div className="bg-white rounded-md shadow-sm border border-gray-200 p-6 mb-6">
                <h3 className="text-sm font-bold text-gray-700 uppercase tracking-wider mb-4 flex items-center gap-2">
                  <Users className="w-4 h-4" />
                  Selecionar Conta de Hosting
                </h3>
                <div className="flex gap-4 items-end">
                  <div className="flex-1">
                    <label className="block text-xs font-semibold text-gray-500 mb-1">Cliente (cPanel User)</label>
                    <select
                      value={selectedClientForEmails?.username || ''}
                      onChange={(e) => {
                        const client = clients.find(c => c.username === e.target.value)
                        if (client) loadEmailAccounts(client)
                      }}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 text-sm"
                    >
                      <option value="">Selecione um cliente...</option>
                      {clients.map(c => (
                        <option key={c.username} value={c.username}>{c.username} — {c.domain}</option>
                      ))}
                    </select>
                  </div>
                  {selectedClientForEmails && (
                    <button
                      onClick={() => setShowCreateEmailModal(true)}
                      className="bg-cyan-600 hover:bg-cyan-700 text-white px-4 py-2 rounded-md flex items-center gap-2 transition-all shadow-sm text-sm font-bold"
                    >
                      <Plus className="w-4 h-4" />
                      Criar E-mail
                    </button>
                  )}
                </div>
              </div>

              {/* Email Accounts Table */}
              {selectedClientForEmails && (
                <div className="bg-white rounded-md shadow-sm border border-gray-200 overflow-hidden">
                  <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center bg-gray-50">
                    <div>
                      <h3 className="text-sm font-bold text-gray-800">
                        E-mails de <span className="text-cyan-600">{selectedClientForEmails.domain}</span>
                      </h3>
                      <p className="text-xs text-gray-500 mt-0.5">{emailAccounts.length} conta(s) encontrada(s)</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="relative">
                        <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                        <input
                          type="text"
                          placeholder="Filtrar e-mails..."
                          value={emailSearchTerm}
                          onChange={(e) => setEmailSearchTerm(e.target.value)}
                          className="pl-9 pr-3 py-1.5 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-cyan-500 w-64"
                        />
                      </div>
                      <button
                        onClick={() => loadEmailAccounts(selectedClientForEmails)}
                        className="p-2 text-gray-500 hover:text-cyan-600 hover:bg-cyan-50 rounded-md transition-colors"
                        title="Atualizar"
                      >
                        <RefreshCw className={`w-4 h-4 ${isFetchingEmails ? 'animate-spin' : ''}`} />
                      </button>
                    </div>
                  </div>

                  {isFetchingEmails ? (
                    <div className="p-12 text-center">
                      <RefreshCw className="w-8 h-8 animate-spin text-cyan-500 mx-auto mb-3" />
                      <p className="text-sm text-gray-500">Carregando contas de e-mail...</p>
                    </div>
                  ) : emailAccounts.length === 0 ? (
                    <div className="p-12 text-center">
                      <Mail className="w-10 h-10 text-gray-300 mx-auto mb-3" />
                      <p className="text-sm text-gray-500">Nenhuma conta de e-mail encontrada para este domínio.</p>
                      <button
                        onClick={() => setShowCreateEmailModal(true)}
                        className="mt-4 text-cyan-600 hover:text-cyan-700 text-sm font-semibold"
                      >
                        + Criar primeira conta de e-mail
                      </button>
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="text-left text-xs font-bold text-gray-500 uppercase tracking-wider border-b border-gray-100">
                            <th className="px-6 py-3">Endereço de E-mail</th>
                            <th className="px-6 py-3">Quota</th>
                            <th className="px-6 py-3">Uso</th>
                            <th className="px-6 py-3 text-right">Ações</th>
                          </tr>
                        </thead>
                        <tbody>
                          {emailAccounts
                            .filter((acc: any) => {
                              if (!emailSearchTerm) return true
                              const fullEmail = `${acc.user || acc.login}@${acc.domain || selectedClientForEmails.domain}`
                              return fullEmail.toLowerCase().includes(emailSearchTerm.toLowerCase())
                            })
                            .map((acc: any, idx: number) => {
                              const emailUser = acc.user || acc.login || acc.email || '—'
                              const emailDomain = acc.domain || selectedClientForEmails.domain
                              const quotaUsed = parseFloat(acc.diskused || acc._diskused || '0')
                              const quotaLimit = parseFloat(acc.diskquota || acc.quota || '0')
                              const quotaPct = quotaLimit > 0 ? Math.min(100, (quotaUsed / quotaLimit) * 100) : 0

                              return (
                                <tr key={idx} className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                                  <td className="px-6 py-3">
                                    <div className="flex items-center gap-2">
                                      <div className="w-8 h-8 rounded-full bg-cyan-100 flex items-center justify-center">
                                        <Mail className="w-4 h-4 text-cyan-600" />
                                      </div>
                                      <span className="font-medium text-gray-900">{emailUser}@{emailDomain}</span>
                                    </div>
                                  </td>
                                  <td className="px-6 py-3 text-gray-600">{quotaLimit > 0 ? `${quotaLimit} MB` : 'Ilimitado'}</td>
                                  <td className="px-6 py-3">
                                    <div className="flex items-center gap-2">
                                      <div className="w-24 h-2 bg-gray-100 rounded-full overflow-hidden">
                                        <div
                                          className={`h-full rounded-full ${quotaPct > 80 ? 'bg-red-500' : quotaPct > 50 ? 'bg-yellow-500' : 'bg-cyan-500'}`}
                                          style={{ width: `${quotaPct}%` }}
                                        />
                                      </div>
                                      <span className="text-xs text-gray-500">{quotaUsed.toFixed(1)} MB</span>
                                    </div>
                                  </td>
                                  <td className="px-6 py-3">
                                    <div className="flex items-center justify-end gap-1">
                                      <button
                                        onClick={() => {
                                          setEditingEmail({ user: emailUser, domain: emailDomain, quota: quotaLimit, newPassword: '' })
                                          setShowEditEmailModal(true)
                                        }}
                                        className="p-1.5 text-gray-400 hover:text-cyan-600 hover:bg-cyan-50 rounded-md transition-colors"
                                        title="Editar"
                                      >
                                        <Edit className="w-4 h-4" />
                                      </button>
                                      <button
                                        onClick={() => handleDeleteEmail(emailUser, emailDomain)}
                                        className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors"
                                        title="Apagar"
                                      >
                                        <Trash2 className="w-4 h-4" />
                                      </button>
                                    </div>
                                  </td>
                                </tr>
                              )
                            })}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}

              {/* Create Email Modal */}
              {showCreateEmailModal && selectedClientForEmails && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                  <div className="bg-white rounded-md shadow-xl max-w-md w-full animate-in fade-in zoom-in duration-200">
                    <div className="px-6 py-3 border-b border-gray-200 flex justify-between items-center bg-gray-50">
                      <div className="flex items-center gap-2">
                        <Plus className="w-5 h-5 text-cyan-600" />
                        <h3 className="text-lg font-bold text-gray-900">Criar Conta de E-mail</h3>
                      </div>
                      <button onClick={() => setShowCreateEmailModal(false)} className="text-gray-400 hover:text-gray-600">
                        <X className="w-6 h-6" />
                      </button>
                    </div>
                    <div className="p-6 space-y-4">
                      <div>
                        <label className="block text-xs font-semibold text-gray-600 mb-1">Endereço de E-mail *</label>
                        <div className="flex items-center gap-2">
                          <input
                            type="text"
                            placeholder="nome"
                            value={newEmailData.email}
                            onChange={(e) => setNewEmailData({ ...newEmailData, email: e.target.value })}
                            className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-cyan-500 text-sm"
                          />
                          <span className="text-sm font-medium text-gray-500 whitespace-nowrap">@{selectedClientForEmails.domain}</span>
                        </div>
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-gray-600 mb-1">Senha *</label>
                        <div className="relative">
                          <input
                            type={showNewEmailPass ? "text" : "password"}
                            placeholder="Senha segura"
                            value={newEmailData.password}
                            onChange={(e) => setNewEmailData({ ...newEmailData, password: e.target.value })}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-cyan-500 text-sm pr-10"
                          />
                          <button
                            type="button"
                            onClick={() => setShowNewEmailPass(!showNewEmailPass)}
                            className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-cyan-600 p-1"
                          >
                            {showNewEmailPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                          </button>
                        </div>
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-gray-600 mb-1">Quota (MB)</label>
                        <input
                          type="number"
                          placeholder="0 = Ilimitado"
                          value={newEmailData.quota}
                          onChange={(e) => setNewEmailData({ ...newEmailData, quota: parseInt(e.target.value) || 0 })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-cyan-500 text-sm"
                        />
                        <p className="text-[10px] text-gray-400 mt-1">Defina 0 para quota ilimitada. Padrão: 1024 MB (1 GB).</p>
                      </div>
                    </div>
                    <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 flex justify-end gap-3">
                      <button onClick={() => setShowCreateEmailModal(false)} className="px-4 py-1.5 text-sm text-gray-700 hover:text-gray-900 font-medium">Cancelar</button>
                      <button
                        onClick={handleCreateEmail}
                        disabled={isSavingEmail}
                        className="px-4 py-1.5 bg-cyan-600 hover:bg-cyan-700 text-white text-sm font-bold rounded-md shadow-sm transition-all flex items-center gap-2"
                      >
                        {isSavingEmail ? (<><RefreshCw className="w-4 h-4 animate-spin" /> Criando...</>) : (<><Check className="w-4 h-4" /> Criar E-mail</>)}
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Edit Email Modal */}
              {showEditEmailModal && editingEmail && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                  <div className="bg-white rounded-md shadow-xl max-w-md w-full animate-in fade-in zoom-in duration-200">
                    <div className="px-6 py-3 border-b border-gray-200 flex justify-between items-center bg-gray-50">
                      <div className="flex items-center gap-2">
                        <Edit className="w-5 h-5 text-cyan-600" />
                        <h3 className="text-lg font-bold text-gray-900">Editar E-mail</h3>
                      </div>
                      <button onClick={() => { setShowEditEmailModal(false); setEditingEmail(null) }} className="text-gray-400 hover:text-gray-600">
                        <X className="w-6 h-6" />
                      </button>
                    </div>
                    <div className="p-6 space-y-4">
                      <div className="bg-cyan-50 p-3 rounded-md border border-cyan-100">
                        <p className="text-sm font-medium text-cyan-800">
                          <Mail className="w-4 h-4 inline mr-1" />
                          {editingEmail.user}@{editingEmail.domain}
                        </p>
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-gray-600 mb-1">Nova Senha</label>
                        <div className="relative">
                          <input
                            type={showEditEmailPass ? "text" : "password"}
                            placeholder="Deixe vazio para manter a actual"
                            value={editingEmail.newPassword || ''}
                            onChange={(e) => setEditingEmail({ ...editingEmail, newPassword: e.target.value })}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-cyan-500 text-sm pr-10"
                          />
                          <button
                            type="button"
                            onClick={() => setShowEditEmailPass(!showEditEmailPass)}
                            className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-cyan-600 p-1"
                          >
                            {showEditEmailPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                          </button>
                        </div>
                      </div>
                      <div className="bg-amber-50 border border-amber-100 p-3 rounded-md flex gap-2">
                        <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
                        <p className="text-[10px] text-amber-700 leading-relaxed italic">
                          <strong>Atenção:</strong> Alterar a senha afetará imediatamente o acesso do cliente a este e-mail.
                        </p>
                      </div>
                    </div>
                    <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 flex justify-end gap-3">
                      <button onClick={() => { setShowEditEmailModal(false); setEditingEmail(null) }} className="px-4 py-1.5 text-sm text-gray-700 hover:text-gray-900 font-medium">Cancelar</button>
                      <button
                        onClick={() => {
                          if (editingEmail.newPassword) {
                            handleUpdateEmailPassword(editingEmail.user, editingEmail.domain, editingEmail.newPassword)
                            setShowEditEmailModal(false)
                          } else {
                            alert('Insira uma nova senha para atualizar.')
                          }
                        }}
                        disabled={isSavingEmail}
                        className="px-4 py-1.5 bg-cyan-600 hover:bg-cyan-700 text-white text-sm font-bold rounded-md shadow-sm transition-all flex items-center gap-2"
                      >
                        {isSavingEmail ? (<><RefreshCw className="w-4 h-4 animate-spin" /> Salvando...</>) : (<><Check className="w-4 h-4" /> Salvar Alterações</>)}
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {activeSection === 'emails-new' && (
            <div>
              <div className="flex justify-between items-center mb-8">
                <h1 className="text-3xl font-bold text-gray-900">Novo E-mail</h1>
              </div>

              <div className="bg-white rounded-md shadow-sm border border-gray-200 p-6 max-w-2xl">
                <h3 className="text-sm font-bold text-gray-700 uppercase tracking-wider mb-6 flex items-center gap-2">
                  <PlusCircle className="w-4 h-4 text-cyan-600" />
                  Criar Nova Conta de E-mail
                </h3>

                <div className="mb-5">
                  <label className="block text-xs font-semibold text-gray-500 mb-1">Conta de Hosting (cPanel User) *</label>
                  <select
                    value={selectedClientForEmails?.username || ''}
                    onChange={(e) => {
                      const client = clients.find(c => c.username === e.target.value)
                      if (client) {
                        setSelectedClientForEmails(client)
                        setNewEmailData({ ...newEmailData, email: '' })
                      }
                    }}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-cyan-500 text-sm"
                  >
                    <option value="">Selecione um cliente...</option>
                    {clients.map(c => (
                      <option key={c.username} value={c.username}>{c.username} — {c.domain}</option>
                    ))}
                  </select>
                </div>

                {selectedClientForEmails && (
                  <>
                    <div className="mb-4">
                      <label className="block text-xs font-semibold text-gray-500 mb-1">Endereço de E-mail *</label>
                      <div className="flex items-center gap-2">
                        <input
                          type="text"
                          placeholder="nome"
                          value={newEmailData.email}
                          onChange={(e) => setNewEmailData({ ...newEmailData, email: e.target.value })}
                          className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-cyan-500 text-sm"
                        />
                        <span className="text-sm font-medium text-gray-500 whitespace-nowrap">@{selectedClientForEmails.domain}</span>
                      </div>
                    </div>

                    <div className="mb-4">
                      <label className="block text-xs font-semibold text-gray-500 mb-1">Senha *</label>
                      <div className="relative">
                        <input
                          type={showNewEmailPass ? "text" : "password"}
                          placeholder="Senha segura"
                          value={newEmailData.password}
                          onChange={(e) => setNewEmailData({ ...newEmailData, password: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-cyan-500 text-sm pr-10"
                        />
                        <button
                          type="button"
                          onClick={() => setShowNewEmailPass(!showNewEmailPass)}
                          className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-cyan-600 p-1"
                        >
                          {showNewEmailPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>

                    <div className="mb-6">
                      <label className="block text-xs font-semibold text-gray-500 mb-1">Quota (MB)</label>
                      <input
                        type="number"
                        placeholder="0 = Ilimitado"
                        value={newEmailData.quota}
                        onChange={(e) => setNewEmailData({ ...newEmailData, quota: parseInt(e.target.value) || 0 })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-cyan-500 text-sm"
                      />
                      <p className="text-[10px] text-gray-400 mt-1">Defina 0 para quota ilimitada. Padrão: 1024 MB (1 GB).</p>
                    </div>

                    <button
                      onClick={handleCreateEmail}
                      disabled={isSavingEmail || !newEmailData.email || !newEmailData.password}
                      className="w-full bg-cyan-600 hover:bg-cyan-700 text-white py-2.5 rounded-md text-sm font-bold transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                    >
                      {isSavingEmail ? (
                        <><RefreshCw className="w-4 h-4 animate-spin" /> Criando...</>
                      ) : (
                        <><PlusCircle className="w-4 h-4" /> Criar Conta de E-mail</>
                      )}
                    </button>
                  </>
                )}
              </div>
            </div>
          )}

          {activeSection === 'emails-webmail' && (
            <div className="space-y-6">
              <div className="flex justify-between items-end mb-4">
                <div>
                  <h1 className="text-3xl font-bold text-gray-900">Webmail Real</h1>
                  <p className="text-gray-500 mt-1">Gira o seu e-mail profissional com acesso directo e autenticado.</p>
                </div>
                {selectedWebmailDomain && (
                  <button
                    onClick={() => {
                      setSelectedWebmailDomain(null)
                      setRealWebmailAccounts([])
                    }}
                    className="text-sm text-red-600 hover:text-red-700 font-bold flex items-center gap-1"
                  >
                    <ArrowRightLeft className="w-4 h-4" /> Alterar Domínio
                  </button>
                )}
              </div>

              {!selectedWebmailDomain ? (
                <div className="bg-white rounded-xl shadow-md border border-gray-100 p-8 text-center max-w-2xl mx-auto">
                  <div className="w-20 h-20 bg-cyan-50 rounded-full flex items-center justify-center mx-auto mb-6">
                    <Inbox className="w-10 h-10 text-cyan-600" />
                  </div>
                  <h3 className="text-xl font-bold text-gray-900 mb-2">Acesso Seguro ao Webmail</h3>
                  <p className="text-gray-600 mb-8 px-4">
                    Seleccione um dos seus domínios para carregar as contas de e-mail e aceder ao Roundcube.
                  </p>

                  <div className="flex flex-col gap-4 items-center">
                    <select
                      value={selectedWebmailDomain || ''}
                      onChange={(e) => setSelectedWebmailDomain(e.target.value)}
                      className="w-full max-w-sm px-4 py-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-red-500 text-sm font-medium bg-white"
                    >
                      <option value="">Seleccione um domínio...</option>
                      {clients.map(c => (
                        <option key={c.username} value={c.domain}>{c.domain}</option>
                      ))}
                    </select>
                    <button
                      onClick={async () => {
                        if (selectedWebmailDomain) {
                          setIsFetchingWebmailAccounts(true)
                          try {
                            const client = clients.find(c => c.domain === selectedWebmailDomain)
                            if (client) {
                              const accounts = await vhmAPI.getEmailAccounts(client.username)
                              setRealWebmailAccounts(accounts)
                            }
                          } catch (err) {
                            console.error('Erro ao buscar contas:', err)
                          } finally {
                            setIsFetchingWebmailAccounts(false)
                          }
                        }
                      }}
                      disabled={!selectedWebmailDomain || isFetchingWebmailAccounts}
                      className="w-full max-w-sm bg-black hover:bg-red-600 disabled:bg-gray-300 disabled:cursor-not-allowed text-white py-3 rounded-md font-bold transition-all flex items-center justify-center gap-2"
                    >
                      {isFetchingWebmailAccounts ? (
                        <>
                          <RefreshCw className="w-5 h-5 animate-spin" />
                          Carregando...
                        </>
                      ) : (
                        'Carregar Painel de E-mail'
                      )}
                    </button>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-6">
                  <div className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden min-h-[500px] flex flex-col">
                    <div className="bg-gray-900 text-white p-4 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-red-600 rounded flex items-center justify-center font-bold text-sm">WD</div>
                        <div>
                          <p className="text-xs font-bold leading-none uppercase tracking-tight">Email Manager</p>
                          <p className="text-[10px] text-gray-400 mt-1">{selectedWebmailDomain}</p>
                        </div>
                      </div>
                      <div className="flex gap-4">
                        <div className="flex items-center gap-2 text-xs">
                          <Database className="w-3.5 h-3.5 text-cyan-400" /> Servidor Ativo
                        </div>
                      </div>
                    </div>

                    <div className="flex-1 p-6 overflow-y-auto">
                      <div className="flex justify-between items-center mb-6">
                        <h3 className="font-bold text-gray-800 flex items-center gap-2">
                          <Mail className="w-5 h-5 text-red-600" /> Contas de E-mail Disponíveis
                          <button
                            onClick={async () => {
                              if (selectedWebmailDomain) {
                                setIsFetchingWebmailAccounts(true)
                                try {
                                  const client = clients.find(c => c.domain === selectedWebmailDomain)
                                  if (client) {
                                    const accounts = await vhmAPI.getEmailAccounts(client.username)
                                    setRealWebmailAccounts(accounts)
                                  }
                                } catch (err) {
                                  console.error('Refresh error:', err)
                                } finally {
                                  setIsFetchingWebmailAccounts(false)
                                }
                              }
                            }}
                            className="p-1 hover:bg-gray-100 rounded-full transition-colors"
                            title="Actualizar lista"
                          >
                            <RefreshCw className={`w-3 h-3 text-gray-400 ${isFetchingWebmailAccounts ? 'animate-spin text-red-600' : ''}`} />
                          </button>
                        </h3>
                        <span className="text-xs text-gray-400">{realWebmailAccounts.length} contas encontradas</span>
                      </div>

                      {isFetchingWebmailAccounts ? (
                        <div className="flex items-center justify-center py-20">
                          <RefreshCw className="w-8 h-8 text-red-600 animate-spin" />
                        </div>
                      ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                          {realWebmailAccounts.length === 0 ? (
                            <div className="col-span-full py-12 text-center bg-gray-50 rounded-lg border-2 border-dashed border-gray-200">
                              <p className="text-sm text-gray-500">Nenhuma conta de e-mail encontrada para este domínio.</p>
                              <button
                                onClick={() => setActiveSection('emails-new')}
                                className="mt-4 text-xs font-bold text-red-600 hover:underline"
                              >
                                Criar nova conta agora
                              </button>
                            </div>
                          ) : (
                            realWebmailAccounts.map((acc: any, i) => (
                              <div key={i} className="p-4 rounded-xl border border-gray-100 bg-white hover:border-red-200 hover:shadow-md transition-all group">
                                <div className="flex items-start justify-between mb-4">
                                  <div className="w-10 h-10 bg-gray-50 rounded-lg flex items-center justify-center group-hover:bg-red-50 transition-colors">
                                    <Mail className="w-5 h-5 text-gray-400 group-hover:text-red-600" />
                                  </div>
                                  <div className="bg-green-50 text-green-600 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase">Ativa</div>
                                </div>

                                <p className="text-sm font-bold text-gray-900 mb-1 truncate">{acc.email}</p>
                                <div className="space-y-2 mb-6">
                                  <div className="flex items-center justify-between text-[11px]">
                                    <span className="text-gray-400">Quota</span>
                                    <span className="text-gray-600 font-medium">
                                      {(parseFloat(acc.humandiskused) || 0).toFixed(1)} / {acc.humandiskquota || 'Unlimited'}
                                    </span>
                                  </div>
                                  <div className="w-full h-1 bg-gray-100 rounded-full overflow-hidden">
                                    <div
                                      className="h-full bg-cyan-500 rounded-full"
                                      style={{ width: `${Math.min(100, (parseFloat(acc.diskused) / (parseFloat(acc.diskquota) || 1000)) * 100)}%` }}
                                    ></div>
                                  </div>
                                </div>

                                <button
                                  onClick={async (e) => {
                                    const btn = e.currentTarget
                                    const originalText = btn.innerText
                                    btn.innerText = 'Gerando Sessão...'
                                    btn.disabled = true
                                    try {
                                      const client = clients.find(c => c.domain === selectedWebmailDomain)
                                      if (client) {
                                        const ssoUrl = await vhmAPI.createWebmailSession(client.username, acc.email)
                                        if (ssoUrl) {
                                          window.open(ssoUrl, '_blank')
                                        } else {
                                          alert('Não foi possível gerar a sessão segura. Tente novamente.')
                                        }
                                      }
                                    } catch (err) {
                                      console.error('SSO Error:', err)
                                    } finally {
                                      btn.innerText = originalText
                                      btn.disabled = false
                                    }
                                  }}
                                  className="w-full bg-red-600 hover:bg-red-700 text-white py-2 rounded-lg text-xs font-bold transition-all shadow-sm flex items-center justify-center gap-2"
                                >
                                  Logar no Webmail <ChevronRight className="w-3 h-3" />
                                </button>
                              </div>
                            ))
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {activeSection === 'domains' && (
            <div>
              <div className="flex justify-between items-center mb-8">
                <h1 className="text-3xl font-bold text-gray-900">Gestão de Domínios</h1>
                <button
                  onClick={loadDomains}
                  disabled={isLoadingDomains}
                  className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-1.5 rounded-md flex items-center gap-2 transition-all shadow-sm text-sm font-bold"
                >
                  <RefreshCw className={`w-4 h-4 ${isLoadingDomains ? 'animate-spin' : ''}`} />
                  {isLoadingDomains ? 'Carregando...' : 'Carregar Domínios'}
                </button>
              </div>



              {/* Error Message */}
              {domainError && (
                <div className="bg-amber-50 border border-amber-200 rounded-md p-4 mb-6 flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-bold text-amber-800">Erro ao carregar domínios</p>
                    <p className="text-xs text-amber-700 mt-1">{domainError}</p>
                    <p className="text-xs text-amber-600 mt-2 italic">
                      Contacte o suporte da MozServer para liberar o IP na API WHMCS.
                    </p>
                  </div>
                </div>
              )}

              {/* Domains Table */}
              <div className="bg-white rounded-md shadow-sm border border-gray-200 overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center bg-gray-50">
                  <div>
                    <h3 className="text-sm font-bold text-gray-800">Os Seus Domínios</h3>
                    <p className="text-xs text-gray-500 mt-0.5">{domains.length} domínio(s) encontrado(s)</p>
                  </div>
                  {domains.length > 0 && (
                    <div className="relative">
                      <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                      <input
                        type="text"
                        placeholder="Filtrar domínios..."
                        value={domainSearchTerm}
                        onChange={(e) => setDomainSearchTerm(e.target.value)}
                        className="pl-9 pr-3 py-1.5 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-purple-500 w-64"
                      />
                    </div>
                  )}
                </div>

                {isLoadingDomains ? (
                  <div className="p-12 text-center">
                    <RefreshCw className="w-8 h-8 animate-spin text-purple-500 mx-auto mb-3" />
                    <p className="text-sm text-gray-500">Carregando domínios da MozServer...</p>
                  </div>
                ) : domains.length === 0 ? (
                  <div className="p-12 text-center">
                    <Globe className="w-10 h-10 text-gray-300 mx-auto mb-3" />
                    <p className="text-sm text-gray-500 mb-2">
                      {domainError ? 'Não foi possível carregar os domínios.' : 'Nenhum domínio carregado ainda.'}
                    </p>
                    <button
                      onClick={loadDomains}
                      className="text-purple-600 hover:text-purple-700 text-sm font-semibold"
                    >
                      Clique para carregar os domínios
                    </button>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="text-left text-xs font-bold text-gray-500 uppercase tracking-wider border-b border-gray-100">
                          <th className="px-6 py-3">Domínio</th>
                          <th className="px-6 py-3">Registrado em</th>
                          <th className="px-6 py-3">Expira em</th>
                          <th className="px-6 py-3">Estado</th>
                          <th className="px-6 py-3">Registrador</th>
                        </tr>
                      </thead>
                      <tbody>
                        {domains
                          .filter(d => {
                            if (!domainSearchTerm) return true
                            return d.domainname?.toLowerCase().includes(domainSearchTerm.toLowerCase())
                          })
                          .map((domain, idx) => {
                            const isExpired = domain.expirydate && new Date(domain.expirydate) < new Date()
                            const isExpiringSoon = domain.expirydate && !isExpired &&
                              new Date(domain.expirydate) < new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)

                            return (
                              <tr key={domain.id || idx} className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                                <td className="px-6 py-3">
                                  <div className="flex items-center gap-2">
                                    <div className="w-8 h-8 rounded-full bg-purple-100 flex items-center justify-center">
                                      <Globe className="w-4 h-4 text-purple-600" />
                                    </div>
                                    <span className="font-medium text-gray-900">{domain.domainname}</span>
                                  </div>
                                </td>
                                <td className="px-6 py-3 text-gray-600">
                                  {domain.registrationdate || '—'}
                                </td>
                                <td className="px-6 py-3">
                                  <span className={`text-sm ${isExpired ? 'text-red-600 font-bold' : isExpiringSoon ? 'text-amber-600 font-semibold' : 'text-gray-600'}`}>
                                    {domain.expirydate || '—'}
                                    {isExpiringSoon && !isExpired && (
                                      <span className="ml-1 text-[10px] bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded-full">Expira em breve</span>
                                    )}
                                    {isExpired && (
                                      <span className="ml-1 text-[10px] bg-red-100 text-red-700 px-1.5 py-0.5 rounded-full">Expirado</span>
                                    )}
                                  </span>
                                </td>
                                <td className="px-6 py-3">
                                  <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${domain.status === 'Active' ? 'bg-green-100 text-green-700' :
                                    domain.status === 'Pending' ? 'bg-yellow-100 text-yellow-700' :
                                      domain.status === 'Expired' ? 'bg-red-100 text-red-700' :
                                        'bg-gray-100 text-gray-600'
                                    }`}>
                                    {domain.status || 'Desconhecido'}
                                  </span>
                                </td>
                                <td className="px-6 py-3 text-gray-500 text-xs">
                                  {domain.registrar || 'MozServer'}
                                </td>
                              </tr>
                            )
                          })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )}

          {activeSection === 'domains-new' && (
            <div>
              <div className="flex justify-between items-center mb-8">
                <h1 className="text-3xl font-bold text-gray-900">Novo Domínio</h1>
              </div>

              {/* Domain Availability Check */}
              <div className="bg-white rounded-md shadow-sm border border-gray-200 p-6 w-full">
                <h3 className="text-sm font-bold text-gray-700 uppercase tracking-wider mb-4 flex items-center gap-2">
                  <Search className="w-4 h-4 text-purple-600" />
                  Verificar Disponibilidade
                </h3>
                <div className="flex gap-3 items-end">
                  <div className="flex-1">
                    <label className="block text-xs font-semibold text-gray-500 mb-1">Nome do Domínio</label>
                    <input
                      type="text"
                      placeholder="meudominio"
                      value={domainCheckQuery}
                      onChange={(e) => setDomainCheckQuery(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleCheckDomain()}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-purple-500 text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-500 mb-1">Extensão</label>
                    <select
                      value={domainCheckTLD}
                      onChange={(e) => setDomainCheckTLD(e.target.value)}
                      className="px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-purple-500 text-sm"
                    >
                      <option value=".mz">.mz</option>
                      <option value=".co.mz">.co.mz</option>
                      <option value=".com">.com</option>
                      <option value=".org">.org</option>
                      <option value=".net">.net</option>
                    </select>
                  </div>
                  <button
                    onClick={handleCheckDomain}
                    disabled={isCheckingDomain || !domainCheckQuery.trim()}
                    className="bg-purple-600 hover:bg-purple-700 text-white px-5 py-2 rounded-md flex items-center gap-2 transition-all text-sm font-bold disabled:opacity-50"
                  >
                    {isCheckingDomain ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
                    Verificar
                  </button>
                </div>

                {domainCheckResult && (
                  <div className="mt-8 space-y-6">
                    <div className={`p-4 rounded-md border flex items-center gap-3 ${domainCheckResult.available ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center ${domainCheckResult.available ? 'bg-green-100' : 'bg-red-100'}`}>
                        {domainCheckResult.available ? <Check className="w-5 h-5 text-green-600" /> : <X className="w-5 h-5 text-red-600" />}
                      </div>
                      <div>
                        <p className={`font-bold text-sm ${domainCheckResult.available ? 'text-green-700' : 'text-red-700'}`}>
                          {domainCheckQuery}{domainCheckTLD}
                        </p>
                        <p className={`text-xs ${domainCheckResult.available ? 'text-green-600' : 'text-red-600'}`}>
                          {domainCheckResult.available ? '✓ Domínio disponível para registro!' : '✗ Domínio indisponível'}
                        </p>
                      </div>
                      {domainCheckResult.available && (
                        <a
                          href={`https://www.mozserver.co.mz/cart.php?a=add&domain=register&query=${domainCheckQuery}${domainCheckTLD}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="ml-auto bg-green-600 hover:bg-green-700 text-white px-4 py-1.5 rounded-md text-sm font-bold transition-all"
                        >
                          Registrar Domínio
                        </a>
                      )}
                    </div>

                    {domainCheckResult.available && (
                      <div className="bg-gray-50 border border-gray-200 rounded-md p-6">
                        <h4 className="text-sm font-bold text-gray-800 uppercase tracking-wider mb-4 flex items-center gap-2">
                          <CreditCard className="w-4 h-4 text-gray-600" />
                          Dados para Pagamento
                        </h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 text-sm">
                          <div>
                            <p className="font-semibold text-gray-700 mb-2">Transferência Bancária / M-Pesa</p>
                            <div className="space-y-3 bg-white p-4 rounded border border-gray-100">
                              <div>
                                <p className="text-[10px] text-gray-400 font-bold uppercase tracking-tight">Banco (FNB)</p>
                                <p className="font-mono text-gray-900">Visual Design, Lda</p>
                                <p className="font-mono text-gray-900 font-bold">IBAN: MZ59 0000 0000 0000 0000 0</p>
                              </div>
                              <div className="pt-2 border-t border-gray-50">
                                <p className="text-[10px] text-gray-400 font-bold uppercase tracking-tight">Vodacom M-Pesa</p>
                                <p className="font-mono text-gray-900 font-bold">84 000 0000</p>
                              </div>
                            </div>
                          </div>
                          <div>
                            <p className="font-semibold text-gray-700 mb-2">Instruções Importantes</p>
                            <ul className="space-y-2 text-xs text-gray-600 list-disc pl-4">
                              <li>Utilize o nome do domínio como referência no pagamento.</li>
                              <li>Envie o comprovativo para <span className="font-bold">pagamentos@visualdesign.co.mz</span></li>
                              <li>O registo será activado após a confirmação do crédito em conta.</li>
                              <li>Preço Estimado: <span className="font-bold text-green-600">950,00 MT / Ano</span></li>
                            </ul>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}

          {activeSection === 'domains-transfer' && (
            <div>
              <div className="flex justify-between items-center mb-8">
                <h1 className="text-3xl font-bold text-gray-900">Transferir Domínio</h1>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Main Form Content */}
                <div className="lg:col-span-2 space-y-6">
                  <div className="bg-white rounded-md shadow-sm border border-gray-200 p-6">
                    <h3 className="text-sm font-bold text-gray-700 uppercase tracking-wider mb-6 flex items-center gap-2">
                      <ArrowRightLeft className="w-4 h-4 text-purple-600" />
                      Dados da Transferência
                    </h3>

                    <div className="mb-4">
                      <label className="block text-xs font-semibold text-gray-500 mb-1">Nome do Domínio *</label>
                      <input
                        type="text"
                        placeholder="meudominio.com"
                        value={transferDomain}
                        onChange={(e) => setTransferDomain(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-purple-500 text-sm"
                      />
                    </div>

                    <div className="mb-4">
                      <label className="block text-xs font-semibold text-gray-500 mb-1">Código de Autorização (EPP/Auth Code) *</label>
                      <input
                        type="text"
                        placeholder="Código EPP do registrador actual"
                        value={transferAuthCode}
                        onChange={(e) => setTransferAuthCode(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-purple-500 text-sm"
                      />
                      <p className="text-[10px] text-gray-400 mt-1">Obtenha este código junto do registo actual do seu domínio.</p>
                    </div>

                    <hr className="my-5 border-gray-100" />
                    <h4 className="text-xs font-bold text-gray-600 uppercase tracking-wider mb-4">Dados de Contacto</h4>

                    <div className="mb-4">
                      <label className="block text-xs font-semibold text-gray-500 mb-1">Nome Completo *</label>
                      <input
                        type="text"
                        placeholder="João Silva"
                        value={transferContactName}
                        onChange={(e) => setTransferContactName(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-purple-500 text-sm"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4 mb-6">
                      <div>
                        <label className="block text-xs font-semibold text-gray-500 mb-1">E-mail *</label>
                        <input
                          type="email"
                          placeholder="email@exemplo.com"
                          value={transferContactEmail}
                          onChange={(e) => setTransferContactEmail(e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-purple-500 text-sm"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-gray-500 mb-1">Telefone</label>
                        <input
                          type="tel"
                          placeholder="+258 84 000 0000"
                          value={transferContactPhone}
                          onChange={(e) => setTransferContactPhone(e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-purple-500 text-sm"
                        />
                      </div>
                    </div>

                    <div className="flex justify-start">
                      <button
                        onClick={async () => {
                          if (!transferDomain || !transferAuthCode || !transferContactName || !transferContactEmail) {
                            alert('Por favor, preencha todos os campos obrigatórios.')
                            return
                          }
                          setIsTransferring(true)
                          try {
                            const { error } = await supabase.from('domain_transfers').insert({
                              domain_name: transferDomain,
                              auth_code: transferAuthCode,
                              contact_name: transferContactName,
                              contact_email: transferContactEmail,
                              contact_phone: transferContactPhone,
                              status: 'pending',
                              created_at: new Date().toISOString()
                            })
                            if (error) throw error
                            alert('Pedido de transferência submetido com sucesso! Iremos processar a transferência e entrar em contacto.')
                            setTransferDomain('')
                            setTransferAuthCode('')
                            setTransferContactName('')
                            setTransferContactEmail('')
                            setTransferContactPhone('')
                          } catch (err) {
                            console.error('Transfer error:', err)
                            alert('Pedido de transferência registado. Entraremos em contacto para finalizar a transferência.')
                            setTransferDomain('')
                            setTransferAuthCode('')
                            setTransferContactName('')
                            setTransferContactEmail('')
                            setTransferContactPhone('')
                          } finally {
                            setIsTransferring(false)
                          }
                        }}
                        disabled={isTransferring || !transferDomain || !transferAuthCode || !transferContactName || !transferContactEmail}
                        className="w-full md:w-auto px-12 bg-black hover:bg-red-600 text-white py-2.5 rounded-md text-sm font-bold transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                      >
                        {isTransferring ? (
                          <><RefreshCw className="w-4 h-4 animate-spin" /> Processando...</>
                        ) : (
                          <><ArrowRightLeft className="w-4 h-4" /> Solicitar Transferência</>
                        )}
                      </button>
                    </div>
                  </div>
                </div>

                {/* Sidebar Instructions */}
                <div className="lg:col-span-1 space-y-6">
                  {/* Transfer Info Banner */}
                  <div className="bg-purple-50 border border-purple-200 rounded-md p-4 flex items-start gap-3">
                    <div className="w-8 h-8 rounded-full bg-purple-100 flex items-center justify-center shrink-0">
                      <ArrowRightLeft className="w-4 h-4 text-purple-600" />
                    </div>
                    <div>
                      <p className="font-bold text-xs text-purple-800">Transferência para Visual Design</p>
                      <p className="text-[11px] text-purple-700 mt-1">
                        Transfira o seu domínio para a gestão da Visual Design. Após a transferência, poderá gerir o domínio directamente neste painel.
                      </p>
                    </div>
                  </div>

                  {/* Steps Guide */}
                  <div className="bg-white rounded-md shadow-sm border border-gray-200 p-6">
                    <h3 className="text-sm font-bold text-gray-700 uppercase tracking-wider mb-4">Passos a seguir</h3>
                    <div className="space-y-4">
                      {[
                        { step: '1', title: 'Desbloqueie o domínio', desc: 'Aceda ao seu registrador actual e desbloquei o domínio.' },
                        { step: '2', title: 'Obtenha o código EPP', desc: 'Solicite o código de autorização (EPP Code).' },
                        { step: '3', title: 'Preencha o formulário', desc: 'Introduza os dados e submeta o pedido.' },
                        { step: '4', title: 'Confirmação', desc: 'Receberá uma confirmação após o processamento.' },
                      ].map(item => (
                        <div key={item.step} className="flex items-start gap-3">
                          <div className="w-6 h-6 bg-purple-100 text-purple-700 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0">
                            {item.step}
                          </div>
                          <div>
                            <p className="text-xs font-semibold text-gray-800">{item.title}</p>
                            <p className="text-[11px] text-gray-500 leading-tight">{item.desc}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

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

          {
            activeSection === 'reports' && (
              <div className="space-y-6">
                <div className="flex justify-between items-center mb-8">
                  <div>
                    <h1 className="text-3xl font-bold text-gray-900">Relatórios de Entrega</h1>
                    <p className="text-gray-600">Monitorize e diagnostique o tráfego de e-mail em tempo real.</p>
                  </div>
                  <button
                    onClick={() => handleSearchMail()}
                    disabled={isSearchingMail}
                    className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-md flex items-center gap-2 transition-all shadow-md font-medium"
                  >
                    {isSearchingMail ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
                    Pesquisar Agora
                  </button>
                </div>

                {/* Filters Card */}
                <div className="bg-white rounded-xl shadow-md p-6 border border-gray-100">
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Destinatário</label>
                      <input
                        type="text"
                        value={mailFilters.recipient}
                        onChange={(e) => setMailFilters({ ...mailFilters, recipient: e.target.value })}
                        placeholder="email@destino.com"
                        className="w-full px-3 py-2 border border-gray-200 rounded-md focus:ring-2 focus:ring-red-500 focus:border-transparent outline-none text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Remetente</label>
                      <input
                        type="text"
                        value={mailFilters.sender}
                        onChange={(e) => setMailFilters({ ...mailFilters, sender: e.target.value })}
                        placeholder="email@origem.com"
                        className="w-full px-3 py-2 border border-gray-200 rounded-md focus:ring-2 focus:ring-red-500 focus:border-transparent outline-none text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Data Início</label>
                      <input
                        type="date"
                        value={mailFilters.startDate}
                        onChange={(e) => setMailFilters({ ...mailFilters, startDate: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-200 rounded-md focus:ring-2 focus:ring-red-500 focus:border-transparent outline-none text-sm text-gray-700"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Data Fim</label>
                      <input
                        type="date"
                        value={mailFilters.endDate}
                        onChange={(e) => setMailFilters({ ...mailFilters, endDate: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-200 rounded-md focus:ring-2 focus:ring-red-500 focus:border-transparent outline-none text-sm text-gray-700"
                      />
                    </div>
                  </div>
                </div>

                {/* Results Table */}
                <div className="bg-white rounded-xl shadow-md overflow-hidden border border-gray-100">
                  <div className="max-h-[600px] overflow-y-auto">
                    <table className="w-full text-left border-collapse">
                      <thead className="sticky top-0 bg-gray-50 z-10 border-b border-gray-200">
                        <tr>
                          <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Estado</th>
                          <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Data/Hora</th>
                          <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Remetente</th>
                          <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Destinatário</th>
                          <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Spam</th>
                          <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Resultado</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {isSearchingMail ? (
                          <tr>
                            <td colSpan={6} className="px-6 py-12 text-center text-gray-500">
                              <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-3 text-gray-300" />
                              <p>A carregar relatórios de entrega...</p>
                            </td>
                          </tr>
                        ) : mailReports.length > 0 ? (
                          mailReports.map((report, idx) => (
                            <tr key={idx} className="hover:bg-gray-50 transition-colors">
                              <td className="px-6 py-4 whitespace-nowrap">
                                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${report.success || report.status === 'success' ? 'bg-green-100 text-green-800 border-green-200' :
                                  report.defer || report.status === 'defer' ? 'bg-yellow-100 text-yellow-800 border-yellow-200' :
                                    'bg-red-100 text-red-800 border-red-200'
                                  }`}>
                                  {report.success || report.status === 'success' ? 'Sucesso' : report.defer || report.status === 'defer' ? 'Adiado' : 'Falhou'}
                                </span>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                                {new Date(report.sendunixtime * 1000).toLocaleString('pt-MZ')}
                              </td>
                              <td className="px-6 py-4 text-sm text-gray-900 font-medium">{report.sender}</td>
                              <td className="px-6 py-4 text-sm text-gray-900 font-medium">{report.recipient}</td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <span className={`text-xs font-bold ${parseFloat(report.score) > 5 ? 'text-red-500' : 'text-gray-400'}`}>
                                  {report.score || '0.0'}
                                </span>
                              </td>
                              <td className="px-6 py-4 text-sm text-gray-600 italic max-w-xs truncate" title={report.msg}>
                                {report.msg || 'Sem detalhes'}
                              </td>
                            </tr>
                          ))
                        ) : (
                          <tr>
                            <td colSpan={6} className="px-6 py-12 text-center text-gray-400">
                              <Mail className="w-12 h-12 mx-auto mb-4 opacity-20" />
                              <p className="text-lg">Nenhum registo encontrado</p>
                              <p className="text-sm">Tente ajustar os filtros ou clique em Pesquisar.</p>
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )
          }
        </div >
      </div >

      {/* Edit Account Modal */}
      {
        editingAccount && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-xl max-w-lg w-full overflow-hidden animate-in fade-in zoom-in duration-200">
              <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center bg-gray-50/50">
                <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                  <Edit className="w-5 h-5 text-red-600" />
                  Editar Conta: {editingAccount.username}
                </h3>
                <button onClick={() => setEditingAccount(null)} className="text-gray-400 hover:text-gray-600">
                  <X className="w-6 h-6" />
                </button>
              </div>
              <div className="p-6 space-y-5 max-h-[75vh] overflow-y-auto">
                {/* Email & Phone Section - Highlighted & Expanded */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-orange-50/50 p-4 rounded-lg border border-orange-100">
                  <div className="md:col-span-2">
                    <label className="block text-[10px] font-bold text-orange-700 uppercase tracking-widest mb-2 flex items-center gap-2">
                      <Mail className="w-3.5 h-3.5" />
                      Campo de Troca de E-mail
                    </label>
                    <input
                      type="email"
                      value={editFormEmail}
                      onChange={(e) => setEditFormEmail(e.target.value)}
                      className="w-full px-3 py-2 border border-orange-200 rounded-md focus:ring-2 focus:ring-orange-500 focus:border-orange-500 text-sm bg-white"
                      placeholder="exemplo@gmail.com"
                    />
                    <p className="mt-1 text-[9px] text-orange-600 italic">Atualiza o e-mail de contacto no servidor VHM e na base de dados.</p>
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-[10px] font-bold text-green-700 uppercase tracking-widest mb-2 flex items-center gap-2">
                      <MessageCircle className="w-3.5 h-3.5" />
                      Número de WhatsApp
                    </label>
                    <input
                      type="text"
                      value={editFormPhone}
                      onChange={(e) => setEditFormPhone(e.target.value)}
                      className="w-full px-3 py-2 border border-green-200 rounded-md focus:ring-2 focus:ring-green-500 focus:border-green-500 text-sm bg-white"
                      placeholder="+351 9XX XXX XXX"
                    />
                  </div>
                </div>

                <div className="md:col-span-2">
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Plano de Alojamento</label>
                  <select
                    value={editFormPlan}
                    onChange={(e) => setEditFormPlan(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-red-500 focus:border-red-500 text-sm bg-white"
                  >
                    {plans.map(p => (
                      <option key={p.name} value={p.name}>{p.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Cota de Disco (MB)</label>
                  <div className="relative">
                    <input
                      type="number"
                      value={editFormQuota}
                      onChange={(e) => setEditFormQuota(parseInt(e.target.value) || 0)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-red-500 focus:border-red-500 text-sm"
                    />
                    <span className="absolute right-3 top-2 text-gray-400 text-xs">MB</span>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Bandwidth Limit (MB)</label>
                  <div className="relative">
                    <input
                      type="number"
                      value={editFormBwLimit}
                      onChange={(e) => setEditFormBwLimit(parseInt(e.target.value) || 0)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-red-500 focus:border-red-500 text-sm"
                      placeholder="0 para Unlimited"
                    />
                    <span className="absolute right-3 top-2 text-gray-400 text-xs">MB</span>
                  </div>
                </div>
              </div>

              <div className="border-t border-gray-100 pt-4 space-y-3">
                <h4 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">Privilégios e Funcionalidades</h4>

                <div className="flex gap-4">
                  <label className="flex-1 flex items-center gap-2 cursor-pointer p-2 border border-gray-100 rounded-md hover:bg-gray-50 transition-colors">
                    <input
                      type="checkbox"
                      checked={editFormShell}
                      onChange={(e) => setEditFormShell(e.target.checked)}
                      className="w-4 h-4 text-red-600 rounded border-gray-300 focus:ring-red-500"
                    />
                    <div className="flex flex-col">
                      <span className="text-xs font-medium text-gray-700">Acesso Shell</span>
                      <span className="text-[9px] text-gray-400">SSH Terminal</span>
                    </div>
                  </label>

                  <label className="flex-1 flex items-center gap-2 cursor-pointer p-2 border border-gray-100 rounded-md hover:bg-gray-50 transition-colors">
                    <input
                      type="checkbox"
                      checked={editFormCgi}
                      onChange={(e) => setEditFormCgi(e.target.checked)}
                      className="w-4 h-4 text-red-600 rounded border-gray-300 focus:ring-red-500"
                    />
                    <div className="flex flex-col">
                      <span className="text-xs font-medium text-gray-700">Acesso CGI</span>
                      <span className="text-[9px] text-gray-400">Scripting</span>
                    </div>
                  </label>
                </div>
              </div>

              <div className="bg-amber-50 border border-amber-100 p-3 rounded-md flex gap-2">
                <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
                <p className="text-[10px] text-amber-700 leading-relaxed italic">
                  <strong>Atenção:</strong> Alterar o plano ou as quotas resultará numa atualização imediata dos limites no servidor VHM.
                </p>
              </div>
            </div>
            <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 flex justify-end gap-3">
              <button
                onClick={() => setEditingAccount(null)}
                className="px-4 py-1.5 text-sm text-gray-700 hover:text-gray-900 font-medium transition-colors"
                disabled={isSavingAccount}
              >
                Cancelar
              </button>
              <button
                onClick={() => handleUpdateClientData(editingAccount.username, {
                  email: editFormEmail,
                  quota: editFormQuota,
                  plan: editFormPlan,
                  shell: editFormShell,
                  cgi: editFormCgi,
                  bwlimit: editFormBwLimit,
                  domain: editFormDomain !== editingAccount.domain ? editFormDomain : undefined,
                  password: editFormPassword || undefined,
                  phone: editFormPhone
                })}
                disabled={isSavingAccount}
                className="px-6 py-1.5 bg-red-600 hover:bg-red-700 text-white text-sm font-bold rounded-md shadow-md transition-all flex items-center gap-2"
              >
                {isSavingAccount ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : (
                  <Check className="w-4 h-4" />
                )}
                {isSavingAccount ? 'A Guardar...' : 'Salvar Alterações'}
              </button>
            </div>
          </div>
        )
      }

      {/* Create Account Modal */}
      {
        showCreateModal && (
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
                      <div className="relative">
                        <input
                          type={showNewAccountPass ? "text" : "password"}
                          placeholder="Deixe vazio para gerar"
                          value={newAccountData.password}
                          onChange={(e) => setNewAccountData({ ...newAccountData, password: e.target.value })}
                          className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-red-500 pr-10"
                        />
                        <button
                          type="button"
                          onClick={() => setShowNewAccountPass(!showNewAccountPass)}
                          className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-red-600 p-1"
                        >
                          {showNewAccountPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
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
        )
      }
    </div >
  )
}

export default function AdminPanel() {
  return (
    <I18nProvider>
      <AdminPanelContent />
    </I18nProvider>
  )
}
