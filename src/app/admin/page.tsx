'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { I18nProvider, useI18n } from '@/lib/i18n'
import { SubdomainsSection, DatabasesSection, FTPSection, EmailManagementSection, CPUsersSection, ResellerSection, PHPConfigSection, SecuritySection, SSLSection, APIConfigSection, ListSubdomainsSection, ModifyWebsiteSection, SuspendWebsiteSection, DeleteWebsiteSection, WPListSection, WPPluginsSection, WPRestoreBackupSection, WPRemoteBackupSection, DNSNameserverSection, DNSDefaultNSSection, DNSCreateZoneSection, DNSDeleteZoneSection, CloudFlareSection, DNSResetSection, EmailDeleteSection, EmailLimitsSection, EmailForwardingSection, CatchAllEmailSection, PatternForwardingSection, PlusAddressingSection, EmailChangePasswordSection, DKIMManagerSection, GitDeploySection } from './CyberPanelSections'
import { CpanelDashboard } from './CpanelDashboard'
// VHM removido - tipos mantidos localmente para compatibilidade
interface VHMClient {
  id: string;
  username: string;
  domain: string;
  plan: string;
  status: string;
  created: string;
  expires: string;
  disk_usage: number;
  disk_limit: number;
  bandwidth_usage: number;
  bandwidth_limit: number;
  email: string;
  package: string;
  ip: string;
}

interface VHMStats {
  total_clients: number;
  active_clients: number;
  suspended_clients: number;
  total_domains: number;
  disk_usage_total: number;
  bandwidth_usage_total: number;
}
import { whmcsAPI, WhmcsDomain } from '@/lib/whmcs-api'
import { ciuemAPI } from '@/lib/ciuem-whois-api'
import { cyberPanelAPI, CyberPanelWebsite, CyberPanelPackage, CyberPanelUser } from '@/lib/cyberpanel-api'
import { supabase } from '@/lib/supabase'
import { generateNotificationReport, calculateDaysUntilExpiry } from '@/lib/notification-system'
import {
  Users, Plus, Trash2, Mail, AlertCircle, Check, X, Eye, EyeOff, Edit, DollarSign, Calendar, Shield, Search, Filter, Download, Settings, Cpu, Share2, Bell, AlertTriangle, Save, Globe, Info, Server, Key, KeyRound, Monitor, Hash, Lock, Smartphone, MessageCircle, HeartHandshake, UserX, Database, Terminal, ShieldCheck, LogOut, Home, FileText, BarChart3, TrendingUp, Package, CreditCard, UserPlus, Activity, Clock, Star, MessageSquare, Globe2, Archive, RefreshCw, ChevronRight, ChevronDown, MoreVertical, ArrowRightLeft, PlusCircle, Inbox, User, Wallet, Sparkles, ArrowRight, ExternalLink, GitBranch, Upload, GitCommit
} from 'lucide-react'

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
  const [activeSection, setActiveSection] = useState<string>('dashboard')
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
  const [showPassword, setShowPassword] = useState(false)
  const [authError, setAuthError] = useState('')
  const [loginEmail, setLoginEmail] = useState('')
  const [loginPassword, setLoginPassword] = useState('')
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

  // Dashboard Users State
  const [dashboardUsers, setDashboardUsers] = useState<any[]>([])
  const [isFetchingUsers, setIsFetchingUsers] = useState(false)
  const [showUserForm, setShowUserForm] = useState(false)
  const [editingUser, setEditingUser] = useState<any>(null)
  const [userForm, setUserForm] = useState({
    name: '',
    email: '',
    password: '',
    vhm_username: '',
    domain: ''
  })
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
  const [emailCheckResult, setEmailCheckResult] = useState<{ exists: boolean; account?: string } | null>(null)

  // CyberPanel Infrastructure State
  const [cyberPanelSites, setCyberPanelSites] = useState<CyberPanelWebsite[]>([])
  const [cyberPanelPackages, setCyberPanelPackages] = useState<CyberPanelPackage[]>([])
  const [cyberPanelUsers, setCyberPanelUsers] = useState<CyberPanelUser[]>([])
  const [isFetchingCyberPanel, setIsFetchingCyberPanel] = useState(false)

  // Package Management State
  const [infraActiveTab, setInfraActiveTab] = useState<'websites' | 'packages'>('websites')
  const [showCreatePackageModal, setShowCreatePackageModal] = useState(false)
  const [isSavingPackage, setIsSavingPackage] = useState(false)
  const [newPackageData, setNewPackageData] = useState({
    packageName: '',
    diskSpace: 1000,
    bandwidth: 10000,
    emailAccounts: 10,
    dataBases: 1,
    ftpAccounts: 1,
    allowedDomains: 1
  })
  const [showCreateCyberSiteModal, setShowCreateCyberSiteModal] = useState(false)
  const [isSavingCyberSite, setIsSavingCyberSite] = useState(false)
  const [newCyberSiteData, setNewCyberSiteData] = useState({
    domainName: '',
    adminEmail: '',
    packageName: 'Default',
    phpSelection: 'PHP 8.2'
  })

  // WP Installation State
  const [showWPModal, setShowWPModal] = useState(false)
  const [selectedWPDomain, setSelectedWPDomain] = useState('')
  const [isInstallingWP, setIsInstallingWP] = useState(false)
  const [wpData, setWpData] = useState({ title: '', user: 'admin', password: '' })
  const [wpInstallLiteSpeed, setWpInstallLiteSpeed] = useState(true)

  // States for DNS Manager
  const [dnsRecords, setDnsRecords] = useState<any[]>([])
  const [isFetchingDns, setIsFetchingDns] = useState(false)
  const [isSavingDns, setIsSavingDns] = useState(false)
  const [selectedDnsDomain, setSelectedDnsDomain] = useState('')
  const [dnsFormData, setDnsFormData] = useState({ name: '', recordType: 'A', value: '', ttl: '3600' })

  // States for Package Management
  const [packages, setPackages] = useState<any[]>([])
  const [isFetchingPackages, setIsFetchingPackages] = useState(false)
  const [packageFormData, setPackageFormData] = useState({
    packageName: '',
    diskSpace: '1000',
    bandwidth: '10000',
    emailAccounts: '10',
    dataBases: '5',
    ftpAccounts: '2',
    allowedDomains: '1'
  })
  const router = useRouter()

  // Verificar autenticação no mount
  useEffect(() => {
    const savedToken = localStorage.getItem('admin-token')
    if (savedToken) {
      try {
        const decoded = atob(savedToken)
        const [email] = decoded.split(':')
        if (email) setIsAuthenticated(true)
      } catch {
        localStorage.removeItem('admin-token')
      }
    }
  }, [])
  const [isSavingEmail, setIsSavingEmail] = useState(false)

  const [selectedWebmailDomain, setSelectedWebmailDomain] = useState<string | null>(null)
  const [ciuemApiKey, setCiuemApiKey] = useState('')
  const [vhmApiToken, setVhmApiToken] = useState('')
  const [isSavingConfig, setIsSavingConfig] = useState(false)
  // Load settings from localStorage on mount
  useEffect(() => {
    const savedCiuemKey = localStorage.getItem('vhm_ciuem_api_key')
    const savedVhmToken = localStorage.getItem('vhm_api_token')
    if (savedCiuemKey) setCiuemApiKey(savedCiuemKey)
    if (savedVhmToken) setVhmApiToken(savedVhmToken)
  }, [])

  // VHM removido - token não utilizado

  const [realWebmailAccounts, setRealWebmailAccounts] = useState<any[]>([])
  const [isFetchingWebmailAccounts, setIsFetchingWebmailAccounts] = useState(false)
  const [isRightSidebarOpen, setIsRightSidebarOpen] = useState(true)
  const [billingInfo, setBillingInfo] = useState<{
    balance: string;
    status: string;
    nextDueDate: string;
    paidInvoices: number;
    daysToRenew: number;
  } | null>(null)
  const [notificationCount, setNotificationCount] = useState(0)

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
    if (isAuthenticated) {
      loadSubscriptions()
      loadCyberPanelData()
    }
  }, [isAuthenticated])

  const loadCyberPanelData = async () => {
    setIsFetchingCyberPanel(true)
    try {
      const [sites, packages, users] = await Promise.all([
        cyberPanelAPI.listWebsites(),
        cyberPanelAPI.listPackages(),
        cyberPanelAPI.listUsers()
      ]);
      setCyberPanelPackages(packages)
      setCyberPanelUsers(users)

      // If API returned 0 sites, fall back to Supabase before overwriting state
      if (sites.length === 0) {
        const { data: sbSites } = await supabase.from('cyberpanel_sites').select('*')
        if (sbSites && sbSites.length > 0) {
          setCyberPanelSites(sbSites.map((s: any) => ({
            domain: s.domain, adminEmail: s.admin_email || '', package: s.package || 'Default',
            owner: s.owner || 'admin', status: s.status || 'Active',
            diskUsage: s.disk_usage || '', bandwidthUsage: s.bandwidth_usage || '',
          })))
          console.log(`API returned 0 sites → loaded ${sbSites.length} from Supabase`)
        } else {
          setCyberPanelSites([])
        }
      } else {
        setCyberPanelSites(sites)
      }
      console.log(`Loaded ${sites.length} CyberPanel sites, ${packages.length} packages, ${users.length} users from VPS`)

      // Log utilizadores sincronizados (admin + visualdesign)
      const cpUsers = users.map(u => u.userName)
      console.log('CyberPanel users synced:', cpUsers.join(', '))

      // Sincronizar sites com Supabase
      if (sites.length > 0) {
        for (const site of sites) {
          await supabase.from('cyberpanel_sites').upsert({
            domain: site.domain,
            admin_email: site.adminEmail,
            package: site.package,
            owner: site.owner,
            status: site.status,
            disk_usage: site.diskUsage,
            bandwidth_usage: site.bandwidthUsage,
            synced_at: new Date().toISOString(),
          }, { onConflict: 'domain' })
        }
        console.log(`Synced ${sites.length} sites to Supabase`)
      }

      // Sincronizar utilizadores com Supabase
      if (users.length > 0) {
        for (const user of users) {
          await supabase.from('cyberpanel_users').upsert({
            username: user.userName,
            first_name: user.firstName,
            last_name: user.lastName,
            email: user.email,
            acl: user.acl,
            websites_limit: user.websitesLimit,
            status: user.status || 'Active',
            synced_at: new Date().toISOString(),
          }, { onConflict: 'username' })
        }
        console.log(`Synced ${users.length} users to Supabase`)
      }
    } catch (err) {
      console.error('Error loading CyberPanel data:', err)
      // Fallback: tentar carregar do Supabase se CyberPanel falhar
      try {
        const { data } = await supabase.from('cyberpanel_sites').select('*')
        if (data && data.length > 0) {
          setCyberPanelSites(data.map((s: any) => ({
            domain: s.domain,
            adminEmail: s.admin_email,
            package: s.package,
            owner: s.owner,
            status: s.status || 'Active',
            diskUsage: s.disk_usage || '',
            bandwidthUsage: s.bandwidth_usage || '',
          })))
          console.log(`Loaded ${data.length} sites from Supabase fallback`)
        }
      } catch (sbErr) {
        console.error('Supabase fallback also failed:', sbErr)
      }
    } finally {
      setIsFetchingCyberPanel(false)
    }
  }

  const loadSubscriptions = async () => {
    try {
      const { data, error } = await supabase
        .from('subscriptions')
        .select('*')
        .order('expiry_date', { ascending: true })

      if (error) throw error
      setSubscriptions(data || [])

      // Calculate active notifications
      const subClients = (data || []).map(s => ({
        id: s.id,
        name: s.vhm_username,
        email: s.client_email,
        domain: s.domain,
        status: s.status as any,
        plan: s.plan,
        price: 0,
        currency: 'MT',
        expiryDate: s.expiry_date || '',
        registeredAt: s.created_at
      }))
      const report = generateNotificationReport(subClients)
      setNotificationCount(report.expiringIn30Days + report.expiringIn15Days + report.expiringIn7Days + report.expiringIn1Day + report.expired)
    } catch (err) {
      console.error('Error loading subscriptions:', err)
    }
  }

  const handleSyncVHM = async () => {
    setSyncing(true)
    try {
      // VHM removido - recarregar dados do Supabase
      await loadSubscriptions()
      alert('Dados recarregados do Supabase com sucesso!')
    } catch (err: any) {
      console.error('Sync error:', err)
      alert('Erro ao recarregar dados: ' + (err.message || 'Erro desconhecido'))
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
      // VHM removido - carregar dados do Supabase
      const { data: cachedSubs, error: subError } = await supabase
        .from('subscriptions')
        .select('*')
        .order('vhm_username', { ascending: true })

      if (!subError && cachedSubs) {
        const mappedClients: VHMClient[] = cachedSubs.map(sub => ({
          id: sub.vhm_username,
          username: sub.vhm_username,
          domain: sub.domain,
          plan: sub.plan,
          status: sub.status as any,
          created: sub.setup_date,
          expires: 'N/A',
          disk_usage: parseFloat(sub.disk_used) || 0,
          disk_limit: parseFloat(sub.quota) || 0,
          bandwidth_usage: 0,
          bandwidth_limit: 0,
          email: sub.client_email,
          package: sub.plan,
          ip: sub.ip_address || 'N/A'
        }))
        setClients(mappedClients)

        setStats({
          total_clients: mappedClients.length,
          active_clients: mappedClients.filter(c => c.status === 'active').length,
          suspended_clients: mappedClients.filter(c => c.status === 'suspended').length,
          total_domains: mappedClients.length,
          disk_usage_total: 0,
          bandwidth_usage_total: 0
        })
      } else {
        setError('Falha ao carregar dados do Supabase')
      }
    } finally {
      setLoading(false)
    }
  }

  const handleLogin = (email: string, password: string) => {
    const ADMIN_EMAIL = 'silva.chamo@gmail.com'
    const ADMIN_PASS = '0001'
    if (email === ADMIN_EMAIL && password === ADMIN_PASS) {
      // Admin → painel admin
      const token = btoa(`${email}:${Date.now()}`)
      localStorage.setItem('admin-token', token)
      setIsAuthenticated(true)
      setAuthError('')
    } else if (email.includes('@') && password.length >= 4) {
      // Utilizador normal → dashboard cliente
      localStorage.setItem('user-session', btoa(`${email}:${Date.now()}`))
      router.push('/dashboard')
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
      // VHM removido - atualizar status no Supabase
      const { error: updateErr } = await supabase.from('subscriptions').update({ status: 'suspended' }).eq('vhm_username', username)
      if (!updateErr) {
        await loadVHMData()
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
      // VHM removido - atualizar status no Supabase
      const { error: updateErr } = await supabase.from('subscriptions').update({ status: 'active' }).eq('vhm_username', username)
      if (!updateErr) {
        await loadVHMData()
        alert('Cliente reativado com sucesso!')
      } else {
        alert('Falha ao reativar cliente')
      }
    } catch (err) {
      console.error('Unsuspend error:', err)
      alert('Erro ao reativar cliente')
    }
  }

  const handleExportClientsCSV = () => {
    if (clients.length === 0) {
      alert('Nenhum dado para exportar')
      return
    }

    const headers = ['Username', 'Domain', 'Plan', 'Status', 'Email', 'IP', 'Created']
    const csvContent = [
      headers.join(','),
      ...clients.map(c => [
        c.username,
        c.domain,
        c.plan,
        c.status,
        c.email,
        c.ip,
        c.created
      ].map(field => `"${field || ''}"`).join(','))
    ].join('\n')

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    const url = URL.createObjectURL(blob)
    link.setAttribute('href', url)
    link.setAttribute('download', `contas_${new Date().toISOString().split('T')[0]}.csv`)
    link.style.visibility = 'hidden'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  const openVHMPanel = () => {
    // Abrir CyberPanel em vez do VHM
    window.open('https://109.199.104.22:8090', '_blank', 'noopener,noreferrer')
  }

  const handleTerminateClient = async (username: string) => {
    if (!confirm(`Tem certeza que deseja TERMINAR o cliente ${username}? Esta ação é irreversível!`)) {
      return
    }

    try {
      // VHM removido - remover do Supabase
      const { error: delErr } = await supabase.from('subscriptions').delete().eq('vhm_username', username)
      if (!delErr) {
        await loadVHMData()
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
      // 1. Criar website no CyberPanel
      const cpSiteOk = await cyberPanelAPI.createWebsite({
        domainName: newAccountData.domain,
        ownerEmail: newAccountData.email,
        packageName: newAccountData.plan || 'Default',
        phpSelection: 'PHP 8.2'
      })

      // 2. Criar utilizador no CyberPanel
      const cpUserOk = newAccountData.username && newAccountData.password
        ? await cyberPanelAPI.createUser({
            firstName: newAccountData.username,
            lastName: '',
            email: newAccountData.email,
            userName: newAccountData.username,
            password: newAccountData.password,
            websitesLimit: 1,
            acl: 'user'
          })
        : true

      // 3. Guardar na Supabase subscriptions
      const { error: insertErr } = await supabase.from('subscriptions').insert({
        vhm_username: newAccountData.username,
        client_email: newAccountData.email,
        domain: newAccountData.domain,
        plan: newAccountData.plan,
        status: 'active',
        setup_date: new Date().toISOString()
      })

      if (!insertErr) {
        await loadCyberPanelData() // sync tudo para Supabase
        const cpStatus = cpSiteOk ? '✓ Website criado no CyberPanel' : '⚠ Website CyberPanel: verificar manualmente'
        const userStatus = cpUserOk ? '✓ Utilizador criado no CyberPanel' : '⚠ Utilizador CyberPanel: verificar manualmente'
        alert(`Conta criada com sucesso!\n${cpStatus}\n${userStatus}`)
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
        alert(`Falha ao criar conta: ${insertErr.message || 'Erro desconhecido'}`)
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
      // VHM removido - atualizar apenas no Supabase
      const { error: supabaseError } = await supabase
        .from('subscriptions')
        .update({
          client_phone: updates.phone,
          client_email: updates.email,
          domain: updates.domain || undefined,
          plan: updates.plan
        })
        .eq('vhm_username', username)

      if (!supabaseError) {
        await loadVHMData()
        setEditingAccount(null)
        setEditFormPassword('')
        alert('Dados do cliente atualizados com sucesso!')
      } else {
        alert('Falha ao atualizar dados do cliente')
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
      // VHM removido - carregar emails do CyberPanel se disponível
      const pops: any[] = []
      setEmailAccounts(pops)
    } catch (err) {
      console.error('Error loading email accounts:', err)
      alert('Erro ao carregar contas de e-mail')
    } finally {
      setIsFetchingEmails(false)
    }
  }

  const handleCreateEmail = async () => {
    const domain = selectedClientForEmails?.domain
    if (!domain || !newEmailData.email || !newEmailData.password) {
      alert('Preencha todos os campos obrigatórios')
      return
    }

    setIsSavingEmail(true)
    try {
      const ok = await cyberPanelAPI.createEmail({
        domainName: domain,
        emailUser: newEmailData.email,
        emailPass: newEmailData.password,
        quota: newEmailData.quota || 0,
      })
      if (ok) {
        setShowCreateEmailModal(false)
        setNewEmailData({ email: '', password: '', quota: 1024 })
        alert(`E-mail ${newEmailData.email}@${domain} criado com sucesso!`)
      } else {
        alert(`Falha ao criar e-mail. Verifique se o domínio "${domain}" existe no CyberPanel.`)
      }
    } catch (err: any) {
      alert(`Erro: ${err.message || 'Erro ao criar conta de e-mail'}`)
    } finally {
      setIsSavingEmail(false)
    }
  }

  const handleDeleteEmail = async (email: string, domain: string) => {
    if (!selectedClientForEmails || !confirm(`Tem certeza que deseja apagar o e-mail ${email}@${domain}?`)) return

    try {
      // VHM removido
      const success = false
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
      // VHM removido
      const success = false
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

  // --- CyberPanel Email Management Handlers ---

  const loadCyberEmailAccounts = async (domain: string) => {
    setIsFetchingEmails(true)
    try {
      const response = await fetch(`/api/cyberpanel-email?domain=${domain}`)
      const data = await response.json()
      if (data.success) {
        setEmailAccounts(data.emails || [])
      } else {
        alert('Erro ao carregar e-mails: ' + data.error)
      }
    } catch (err) {
      console.error('Error loading CyberPanel emails:', err)
      alert('Erro de rede ao carregar e-mails.')
    } finally {
      setIsFetchingEmails(false)
    }
  }

  const handleCreateCyberEmail = async (domain: string) => {
    if (!newEmailData.email || !newEmailData.password) {
      alert('Preencha Utilizador e Password!')
      return
    }
    setIsSavingEmail(true)
    try {
      const response = await fetch('/api/cyberpanel-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          domainName: domain,
          userName: newEmailData.email,
          password: newEmailData.password
        })
      })
      const data = await response.json()
      if (data.success) {
        await loadCyberEmailAccounts(domain)
        setShowCreateEmailModal(false)
        setNewEmailData({ email: '', password: '', quota: 1024 })
        alert('Conta de E-mail criada com sucesso!')
      } else {
        alert('Falha: ' + data.error)
      }
    } catch (err) {
      console.error('Create Cyber email error:', err)
      alert('Erro inesperado ao criar e-mail.')
    } finally {
      setIsSavingEmail(false)
    }
  }

  const handleDeleteCyberEmail = async (fullEmail: string, domain: string) => {
    if (!confirm(`Tem certeza que deseja apagar a caixa ${fullEmail}?`)) return
    try {
      const response = await fetch('/api/cyberpanel-email', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: fullEmail })
      })
      const data = await response.json()
      if (data.success) {
        await loadCyberEmailAccounts(domain)
        alert('Conta apagada com sucesso!')
      } else {
        alert('Falha ao apagar: ' + data.error)
      }
    } catch (err) {
      console.error('Delete Cyber email error:', err)
      alert('Erro ao apagar conta.')
    }
  }

  // --- CyberPanel DNS Handlers ---
  const loadDnsRecords = async (domain: string) => {
    setIsFetchingDns(true)
    setSelectedDnsDomain(domain)
    try {
      const response = await fetch(`/api/cyberpanel-dns?domain=${domain}`)
      const data = await response.json()
      if (data.success) {
        setDnsRecords(data.records || [])
      } else {
        alert('Erro ao listar DNS: ' + data.error)
      }
    } catch (err) {
      console.error('Error loading DNS:', err)
    } finally {
      setIsFetchingDns(false)
    }
  }

  const handleCreateDnsRecord = async () => {
    if (!dnsFormData.name || !dnsFormData.value) {
      alert('Preencha o Nome e Valor do registo.')
      return
    }
    setIsSavingDns(true)
    try {
      const response = await fetch('/api/cyberpanel-dns', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          domainName: selectedDnsDomain,
          name: dnsFormData.name,
          type: dnsFormData.recordType,
          value: dnsFormData.value,
          ttl: dnsFormData.ttl
        })
      })
      const data = await response.json()
      if (data.success) {
        await loadDnsRecords(selectedDnsDomain)
        setDnsFormData({ name: '', recordType: 'A', value: '', ttl: '3600' })
        alert('Registo criado com sucesso!')
      } else {
        alert('Erro: ' + data.error)
      }
    } catch (err) {
      console.error('Create DNS error:', err)
    } finally {
      setIsSavingDns(false)
    }
  }

  const handleDeleteDnsRecord = async (id: string) => {
    if (!confirm('Deseja mesmo apagar este registo DNS?')) return
    try {
      const response = await fetch('/api/cyberpanel-dns', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ domainName: selectedDnsDomain, id })
      })
      const data = await response.json()
      if (data.success) {
        await loadDnsRecords(selectedDnsDomain)
      } else {
        alert('Erro: ' + data.error)
      }
    } catch (err) {
      console.error('Delete DNS error:', err)
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

  const handleRegisterCiuem = async () => {
    if (!domainCheckQuery || !ciuemApiKey) return

    const confirmReg = confirm(`Confirma o registo direto do domínio ${domainCheckQuery}${domainCheckTLD} via CIUEM?\n\nO valor será descontado do seu saldo de Agente.`)
    if (!confirmReg) return

    setIsSavingConfig(true) // Reusing as loading state for registration
    try {
      ciuemAPI.setCredentials(ciuemApiKey)
      const result = await ciuemAPI.registerDomain({
        domain: domainCheckQuery.trim() + domainCheckTLD,
        registrant_name: "Visual Design Admin", // Placeholder or from settings
        registrant_email: "admin@visualdesign.co.mz",
        period_years: 1
      })

      if (result.success) {
        alert(`Sucesso! Domínio registado com ID: ${result.order_id}`)
        setDomainCheckResult(null)
      }
    } catch (err: any) {
      console.error('CIUEM Registration error:', err)
      alert(`Erro no registo: ${err.message}`)
    } finally {
      setIsSavingConfig(false)
    }
  }

  const handleSearchMail = async () => {
    setIsSearchingMail(true)
    try {
      const startTimestamp = mailFilters.startDate ? Math.floor(new Date(mailFilters.startDate).getTime() / 1000) : undefined
      const endTimestamp = mailFilters.endDate ? Math.floor(new Date(mailFilters.endDate).getTime() / 1000) : undefined

      // VHM removido - relatórios de mail não disponíveis
      setMailReports([])
    } catch (err) {
      console.error('Mail search error:', err)
      alert('Erro ao procurar relatórios de e-mail.')
    } finally {
      setIsSearchingMail(false)
    }
  }

  const handleCreatePackage = async () => {
    setIsSavingPackage(true)
    setError(null)
    try {
      if (!newPackageData.packageName.trim()) {
        throw new Error('O nome do pacote é obrigatório')
      }

      const success = await cyberPanelAPI.createPackage({
        packageName: newPackageData.packageName.trim().replace(/\s+/g, '_'),
        diskSpace: newPackageData.diskSpace,
        bandwidth: newPackageData.bandwidth,
        emailAccounts: newPackageData.emailAccounts,
        dataBases: newPackageData.dataBases,
        ftpAccounts: newPackageData.ftpAccounts,
        allowedDomains: newPackageData.allowedDomains
      })

      if (success) {
        // Refresh packages
        const pkgs = await cyberPanelAPI.listPackages()
        setCyberPanelPackages(pkgs)
        setShowCreatePackageModal(false)
        setNewPackageData({
          packageName: '',
          diskSpace: 1000,
          bandwidth: 10000,
          emailAccounts: 10,
          dataBases: 1,
          ftpAccounts: 1,
          allowedDomains: 1
        })
      } else {
        throw new Error('Falha ao criar o pacote no CyberPanel')
      }
    } catch (err: any) {
      setError(err.message || 'Ocorreu um erro ao criar o pacote')
    } finally {
      setIsSavingPackage(false)
    }
  }

  const handleCreateCyberSite = async () => {
    setIsSavingCyberSite(true)
    setError(null)
    try {
      if (!newCyberSiteData.domainName.trim() || !newCyberSiteData.adminEmail.trim()) {
        throw new Error('Domínio e email são obrigatórios')
      }

      const domainLower = newCyberSiteData.domainName.trim().toLowerCase()
      const alreadyExists = cyberPanelSites.some(s => s.domain.toLowerCase() === domainLower)
      if (alreadyExists) {
        throw new Error(`O domínio "${newCyberSiteData.domainName.trim()}" já existe no servidor CyberPanel. Usa um domínio diferente.`)
      }

      const success = await cyberPanelAPI.createWebsite({
        domainName: newCyberSiteData.domainName.trim(),
        ownerEmail: newCyberSiteData.adminEmail.trim(),
        packageName: newCyberSiteData.packageName,
        phpSelection: newCyberSiteData.phpSelection
      })

      if (success) {
        await loadCyberPanelData() // refresh + sync Supabase
        setShowCreateCyberSiteModal(false)
        setNewCyberSiteData({
          domainName: '',
          adminEmail: '',
          packageName: 'Default',
          phpSelection: 'PHP 8.2'
        })
        alert(`Website ${newCyberSiteData.domainName.trim()} criado com sucesso no CyberPanel!`)
      } else {
        throw new Error('CyberPanel recusou a criação. Domínio já pode existir ou a API está desactivada.')
      }
    } catch (err: any) {
      setError(err.message || 'Ocorreu um erro ao criar o website')
    } finally {
      setIsSavingCyberSite(false)
    }
  }

  const handleInstallWP = async () => {
    setIsInstallingWP(true)
    setError(null)
    try {
      if (!wpData.title.trim() || !wpData.user.trim() || !wpData.password.trim()) {
        throw new Error('Todos os campos são obrigatórios')
      }

      const success = await cyberPanelAPI.installWordPress({
        domainName: selectedWPDomain,
        wpTitle: wpData.title.trim(),
        wpUser: wpData.user.trim(),
        wpPassword: wpData.password.trim()
      })

      if (success) {
        // Auto-install LiteSpeed Cache if checked
        if (wpInstallLiteSpeed) {
          await cyberPanelAPI.installWPPlugin(selectedWPDomain, 'litespeed-cache')
        }
        setShowWPModal(false)
        setWpData({ title: '', user: 'admin', password: '' })
        await loadCyberPanelData() // refresh + sync Supabase
        alert(`WordPress instalado com sucesso em ${selectedWPDomain}!${wpInstallLiteSpeed ? '\nLiteSpeed Cache instalado e activado.' : ''}`)
      } else {
        throw new Error('Falha ao instalar o WordPress via CyberPanel. Verifique as credenciais no servidor via SSH.')
      }
    } catch (err: any) {
      setError(err.message || 'Erro ao comunicar com o servidor CyberPanel')
    } finally {
      setIsInstallingWP(false)
    }
  }

  const handleDeletePackage = async (packageName: string) => {
    if (packageName.toLowerCase() === 'default') {
      alert('Não é permitido apagar o pacote Default.');
      return;
    }
    if (!confirm(`Tem a certeza que deseja apagar o pacote "${packageName}"?`)) return;

    setIsFetchingPackages(true);
    setError(null);
    try {
      const res = await fetch('/api/cyberpanel-packages', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ packageName })
      });
      const data = await res.json();
      if (data.success) {
        loadCyberPanelData();
      } else {
        throw new Error(data.error || 'Erro ao apagar pacote');
      }
    } catch (err: any) {
      setError(err.message);
      setIsFetchingPackages(false);
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-black flex flex-col items-center justify-center p-4 relative overflow-hidden">
        {/* Gradiente vermelho visível - canto superior esquerdo */}
        <div className="absolute top-[-200px] left-[-200px] w-[800px] h-[800px] bg-gradient-to-br from-red-600/40 via-red-800/20 to-transparent rounded-full blur-[120px] pointer-events-none" />
        {/* Gradiente vermelho - canto inferior direito */}
        <div className="absolute bottom-[-200px] right-[-200px] w-[600px] h-[600px] bg-gradient-to-tl from-red-700/30 via-red-900/15 to-transparent rounded-full blur-[100px] pointer-events-none" />
        {/* Gradiente central subtil */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[400px] bg-red-600/5 rounded-full blur-[80px] pointer-events-none" />

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="w-full max-w-md relative z-10"
        >
          {/* Logo grande - apenas logotipo, sem título nem descrição */}
          <div className="flex justify-center mb-10">
            <img src="/assets/logotipoII.png" alt="Visual Design" className="h-26 w-auto object-contain" style={{ height: '6.5rem' }} />
          </div>

          {/* Formulário com fundo preto transparente */}
          <div className="bg-white/5 border border-white/10 p-7 backdrop-blur-sm" style={{ borderRadius: '10px' }}>
            <div className="space-y-5">
              {/* Campo E-mail com label */}
              <div>
                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 ml-1">E-mail</label>
                <div className="relative group">
                  <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 group-focus-within:text-red-500 transition-colors">
                    <Mail className="w-4 h-4" />
                  </div>
                  <input
                    type="email"
                    value={loginEmail}
                    onChange={(e) => { setLoginEmail(e.target.value); setAuthError('') }}
                    onKeyDown={(e) => { if (e.key === 'Enter') handleLogin(loginEmail, loginPassword) }}
                    className="w-full pl-11 pr-4 py-3.5 bg-black/60 border border-white/10 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-red-600/30 focus:border-red-500/40 transition-all text-sm"
                    style={{ borderRadius: '8px' }}
                    placeholder="exemplo@gmail.com"
                  />
                </div>
              </div>

              {/* Campo Palavra-passe com label */}
              <div>
                <div className="flex justify-between items-center mb-2 ml-1">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Palavra-passe</label>
                  <a href="#" className="text-[10px] font-bold text-red-500 hover:text-red-400 uppercase tracking-widest transition-colors">Esqueceu?</a>
                </div>
                <div className="relative group">
                  <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 group-focus-within:text-red-500 transition-colors">
                    <Lock className="w-4 h-4" />
                  </div>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={loginPassword}
                    onChange={(e) => { setLoginPassword(e.target.value); setAuthError('') }}
                    onKeyDown={(e) => { if (e.key === 'Enter') handleLogin(loginEmail, loginPassword) }}
                    className="w-full pl-11 pr-11 py-3.5 bg-black/60 border border-white/10 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-red-600/30 focus:border-red-500/40 transition-all text-sm"
                    style={{ borderRadius: '8px' }}
                    placeholder="••••••••"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white transition-colors"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {authError && (
                <div className="bg-red-500/15 border border-red-500/30 text-red-400 px-4 py-2.5 text-xs flex items-center gap-2" style={{ borderRadius: '8px' }}>
                  <AlertCircle className="w-3.5 h-3.5" />
                  {authError}
                </div>
              )}

              <button
                onClick={() => handleLogin(loginEmail, loginPassword)}
                className="w-full bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white py-3.5 font-black uppercase tracking-widest transition-all shadow-xl shadow-red-900/30 text-sm flex items-center justify-center gap-2 group"
                style={{ borderRadius: '8px' }}
              >
                Entrar na Conta
                <svg className="w-4 h-4 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" /></svg>
              </button>
            </div>
          </div>

          {/* Texto + botão horizontal */}
          <div className="mt-6 flex items-center justify-center gap-4">
            <p className="text-gray-500 text-xs whitespace-nowrap">Ainda não é nosso cliente?</p>
            <a href="/precos/hospedagem" className="inline-flex items-center gap-2 px-5 py-2 bg-white/5 hover:bg-white/10 border border-white/10 text-white text-[10px] font-bold uppercase tracking-widest transition-all whitespace-nowrap" style={{ borderRadius: '8px' }}>
              Ver Planos
            </a>
          </div>

          {/* Avatares africanos e texto social */}
          <div className="mt-6 flex items-center justify-center gap-4">
            <div className="flex -space-x-2">
              <div className="w-8 h-8 rounded-full border-2 border-black bg-gray-800 overflow-hidden">
                <img src="https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=80&h=80&fit=crop&crop=face" alt="" className="w-full h-full object-cover" />
              </div>
              <div className="w-8 h-8 rounded-full border-2 border-black bg-gray-800 overflow-hidden">
                <img src="https://images.unsplash.com/photo-1531746020798-e6953c6e8e04?w=80&h=80&fit=crop&crop=face" alt="" className="w-full h-full object-cover" />
              </div>
              <div className="w-8 h-8 rounded-full border-2 border-black bg-gray-800 overflow-hidden">
                <img src="https://images.unsplash.com/photo-1506277886164-e25aa3f4ef7f?w=80&h=80&fit=crop&crop=face" alt="" className="w-full h-full object-cover" />
              </div>
            </div>
            <p className="text-xs text-gray-500">
              Junte-se a mais de <span className="text-white font-bold">500+</span> profissionais.
            </p>
          </div>

          <div className="mt-5 flex items-center justify-center gap-2 text-gray-600">
            <Shield className="w-3.5 h-3.5" />
            <span className="text-[10px] font-bold uppercase tracking-widest">Acesso Seguro SSL 256-bit</span>
          </div>
        </motion.div>

        {/* Linha vermelha sólida no bottom */}
        <div className="absolute bottom-0 left-0 right-0 h-1 bg-red-600" />
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

  const menuItems: Array<{ id: string; label: string; color: string; isNew?: boolean; subItems?: Array<{ id: string; label: string }> }> = [
    { id: 'dashboard',     label: 'Dashboard',       color: 'bg-blue-500' },
    { id: 'clients',       label: 'Contas',          color: 'bg-green-500' },
    { id: 'billing',       label: 'Faturação',       color: 'bg-indigo-500' },
    { id: 'notifications', label: 'Notificações',    color: 'bg-orange-500' },
    { id: 'reports',       label: 'Relatórios',      color: 'bg-pink-500' },
    { id: 'analytics',     label: 'Análises',        color: 'bg-teal-500' },
    { id: 'settings',      label: 'Configurações',   color: 'bg-gray-500' },
    { id: 'git-deploy',    label: 'Deploy / GitHub', color: 'bg-green-700' },
  ]

  const SidebarIcon = (id: string) => {
    switch (id) {
      case 'dashboard': return <Home className="w-5 h-5" />
      case 'clients': return <Users className="w-5 h-5" />
      case 'users': return <UserPlus className="w-5 h-5" />
      case 'emails': return <Mail className="w-5 h-5" />
      case 'domains': return <Globe className="w-5 h-5" />
      case 'packages': return <Package className="w-5 h-5" />
      case 'notifications': return <Bell className="w-5 h-5" />
      case 'billing': return <CreditCard className="w-5 h-5" />
      case 'reports': return <FileText className="w-5 h-5" />
      case 'analytics': return <BarChart3 className="w-5 h-5" />
      case 'settings': return <Settings className="w-5 h-5" />
      case 'security': return <Shield className="w-5 h-5" />
      case 'infrastructure': return <Server className="w-5 h-5" />
      case 'wordpress': return <Globe2 className="w-5 h-5" />
      case 'wordpress-mgmt': return <Globe2 className="w-5 h-5" />
      case 'websites-mgmt': return <Globe className="w-5 h-5" />
      case 'backup': return <Database className="w-5 h-5" />
      case 'domains-dns': return <Server className="w-5 h-5" />
      case 'cp-users': return <Users className="w-5 h-5" />
      case 'packages-mgmt': return <Package className="w-5 h-5" />
      case 'cp-reseller': return <Shield className="w-5 h-5" />
      case 'cp-php': return <Settings className="w-5 h-5" />
      case 'cp-api': return <Database className="w-5 h-5" />
      case 'cp-security': return <Shield className="w-5 h-5" />
      case 'git-deploy': return <GitBranch className="w-5 h-5" />
      default: return <BarChart3 className="w-5 h-5" />
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Main Content */}
      <div className="flex">
        {/* Sidebar */}
        <div className={`${isSidebarCollapsed ? 'w-20' : 'w-64'} bg-white shadow-lg h-screen sticky top-0 transition-all duration-300 z-50 group flex flex-col shrink-0`}>
          <div className={`p-3 border-b border-gray-200 shrink-0`}>
            <div className={`flex items-center gap-0 ${isSidebarCollapsed ? 'flex-col' : ''}`}>
              <div className="w-16 h-16 flex items-center justify-center shrink-0">
                <img src="/assets/simbolo.png" alt="Visual Design" className="w-full h-full object-contain" />
              </div>
              {!isSidebarCollapsed ? (
                <div className="flex-1 min-w-0 flex items-center justify-between">
                  <div>
                    <h2 className="text-lg font-bold text-gray-900 truncate">Painel Admin</h2>
                    <p className="text-xs text-gray-600">Painel Completo</p>
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

          <nav className="flex-1 overflow-y-auto p-4 space-y-1 custom-scrollbar">
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
                    {!isSidebarCollapsed && (item as any).isNew && (
                      <span className="ml-2 px-1.5 py-0.5 text-[10px] font-bold text-white bg-orange-500 rounded-md">
                        NEW
                      </span>
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

          <div className="shrink-0 p-4 border-t border-gray-200 bg-white">
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
          {activeSection === 'users' && (
            <div className="space-y-8">
              <div className="flex justify-between items-center">
                <div>
                  <h1 className="text-3xl font-bold text-gray-900">Usuários</h1>
                  <p className="text-gray-500 text-sm mt-1">Gerencie as credenciais de acesso das contas ao Dashboard.</p>
                </div>
                <button
                  onClick={() => {
                    setEditingUser(null)
                    setUserForm({ name: '', email: '', password: '', vhm_username: '', domain: '' })
                    setShowUserForm(true)
                  }}
                  className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-md flex items-center gap-2 transition-all font-bold shadow-lg shadow-red-900/10"
                >
                  <UserPlus className="w-4 h-4" />
                  Novo Usuário
                </button>
              </div>

              {/* Users Table */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr className="text-left text-xs font-bold text-gray-500 uppercase tracking-widest">
                      <th className="px-6 py-4">Usuário / E-mail</th>
                      <th className="px-6 py-4">Cliente / Empresa</th>
                      <th className="px-6 py-4">Domínio Pai</th>
                      <th className="px-6 py-4">Estado</th>
                      <th className="px-6 py-4 text-right">Ações</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {/* Placeholder for real data or empty state */}
                    {dashboardUsers.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="px-6 py-12 text-center text-gray-400">
                          <Users className="w-12 h-12 mx-auto mb-3 opacity-20" />
                          Nenhum usuário cadastrado.
                        </td>
                      </tr>
                    ) : (
                      dashboardUsers.map((user) => (
                        <tr key={user.id} className="hover:bg-gray-50 transition-colors">
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-full bg-red-100 text-red-600 flex items-center justify-center font-bold">
                                {user.name.charAt(0)}
                              </div>
                              <div>
                                <p className="font-bold text-gray-900">{user.name}</p>
                                <p className="text-xs text-gray-500">{user.email}</p>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4 text-gray-600">{user.vhm_username || '—'}</td>
                          <td className="px-6 py-4 font-mono text-xs text-blue-600">{user.domain || '—'}</td>
                          <td className="px-6 py-4">
                            <span className="px-2 py-1 bg-green-50 text-green-600 text-[10px] font-bold rounded-full uppercase">Ativo</span>
                          </td>
                          <td className="px-6 py-4 text-right space-x-2">
                            <button
                              onClick={() => {
                                setEditingUser(user)
                                setUserForm({
                                  name: user.name,
                                  email: user.email,
                                  password: '',
                                  vhm_username: user.vhm_username || '',
                                  domain: user.domain || ''
                                })
                                setShowUserForm(true)
                              }}
                              className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-md"
                              title="Alterar Senha / Editar"
                            >
                              <Lock className="w-4 h-4" />
                            </button>
                            <button className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-md">
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {showUserForm && (
            <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden"
              >
                <div className="p-6 border-b border-gray-100 flex justify-between items-center">
                  <h3 className="text-xl font-bold text-gray-900">{editingUser ? 'Editar Usuário' : 'Novo Usuário Dashboard'}</h3>
                  <button onClick={() => setShowUserForm(false)} className="text-gray-400 hover:text-gray-600"><X className="w-6 h-6" /></button>
                </div>
                <div className="p-6 space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Nome Completo</label>
                    <input
                      type="text"
                      value={userForm.name}
                      onChange={(e) => setUserForm({ ...userForm, name: e.target.value })}
                      className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-red-500 outline-none transition-all"
                      placeholder="Ex: Silva Chamo"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">E-mail de Acesso</label>
                    <input
                      type="email"
                      value={userForm.email}
                      onChange={(e) => setUserForm({ ...userForm, email: e.target.value })}
                      className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-red-500 outline-none transition-all"
                      placeholder="email@exemplo.com"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">
                      {editingUser ? 'Nova Palavra-passe (opcional)' : 'Palavra-passe'}
                    </label>
                    <input
                      type="password"
                      value={userForm.password}
                      onChange={(e) => setUserForm({ ...userForm, password: e.target.value })}
                      className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-red-500 outline-none transition-all"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Usuário</label>
                      <input
                        type="text"
                        value={userForm.vhm_username}
                        onChange={(e) => setUserForm({ ...userForm, vhm_username: e.target.value })}
                        className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-red-500 outline-none transition-all"
                        placeholder="Ex: user123"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Domínio</label>
                      <input
                        type="text"
                        value={userForm.domain}
                        onChange={(e) => setUserForm({ ...userForm, domain: e.target.value })}
                        className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-red-500 outline-none transition-all"
                        placeholder="dominio.co.mz"
                      />
                    </div>
                  </div>
                </div>
                <div className="p-6 bg-gray-50 flex gap-3">
                  <button
                    onClick={() => setShowUserForm(false)}
                    className="flex-1 py-3 text-gray-600 font-bold hover:bg-gray-100 rounded-xl transition-all"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={async () => {
                      // Logic to save user to dashboardUsers state (and eventually Supabase)
                      if (!userForm.name || !userForm.email) {
                        alert('Preencha nome e e-mail')
                        return
                      }

                      const newUser = {
                        id: editingUser ? editingUser.id : Date.now().toString(),
                        ...userForm
                      }

                      if (editingUser) {
                        setDashboardUsers(prev => prev.map(u => u.id === editingUser.id ? newUser : u))
                      } else {
                        setDashboardUsers(prev => [...prev, newUser])
                      }

                      setShowUserForm(false)
                      alert(editingUser ? 'Usuário actualizado!' : 'Usuário criado com sucesso!')
                    }}
                    className="flex-1 py-3 bg-red-600 text-white font-bold hover:bg-red-700 rounded-xl transition-all shadow-lg shadow-red-900/20"
                  >
                    {editingUser ? 'Salvar Alterações' : 'Criar Conta'}
                  </button>
                </div>
              </motion.div>
            </div>
          )}

          {activeSection === 'dashboard' && (
            <div className="space-y-6">
              <div className="flex justify-between items-center">
                <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
                <div className="flex items-center gap-4">
                  <button
                    onClick={openVHMPanel}
                    className="bg-red-600 hover:bg-red-700 text-white px-3 py-1.5 rounded-md flex items-center gap-2 transition-colors text-sm"
                  >
                    <Globe className="w-4 h-4" />
                    Painel CyberPanel
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

              <CpanelDashboard
                onNavigate={setActiveSection}
                sites={cyberPanelSites}
                users={cyberPanelUsers}
                isFetching={isFetchingCyberPanel}
                onRefresh={loadCyberPanelData}
              />

              {loading && (
                <div className="flex items-center justify-center py-12">
                  <div className="text-gray-600">Carregando dados...</div>
                </div>
              )}

              {error && (
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-5 mb-6 flex items-start gap-4">
                  <div className="w-10 h-10 bg-amber-100 rounded-full flex items-center justify-center shrink-0">
                    <AlertCircle className="w-5 h-5 text-amber-600" />
                  </div>
                  <div className="flex-1">
                    <p className="font-bold text-amber-800 text-sm">Servidor Indisponível</p>
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
                    <div className="bg-white rounded-xl shadow-md p-6 hover:shadow-lg transition-shadow flex items-center gap-4">
                      <div className="w-12 h-12 bg-blue-100 rounded-md flex items-center justify-center shrink-0">
                        <Users className="w-6 h-6 text-blue-600" />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-baseline justify-between">
                          <div className="text-2xl font-bold text-gray-900 leading-none">{stats.total_clients}</div>
                          <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Total</div>
                        </div>
                        <div className="text-sm text-gray-600 mt-1">Contas</div>
                      </div>
                    </div>

                    <div className="bg-white rounded-xl shadow-md p-6 hover:shadow-lg transition-shadow flex items-center gap-4">
                      <div className="w-12 h-12 bg-green-100 rounded-md flex items-center justify-center shrink-0">
                        <Check className="w-6 h-6 text-green-600" />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-baseline justify-between">
                          <div className="text-2xl font-bold text-gray-900 leading-none">{stats.active_clients}</div>
                          <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Ativos</div>
                        </div>
                        <div className="text-sm text-gray-600 mt-1">Contas Ativas</div>
                      </div>
                    </div>

                    <div className="bg-white rounded-xl shadow-md p-6 hover:shadow-lg transition-shadow flex items-center gap-4">
                      <div className="w-12 h-12 bg-purple-100 rounded-md flex items-center justify-center shrink-0">
                        <Globe2 className="w-6 h-6 text-purple-600" />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-baseline justify-between">
                          <div className="text-2xl font-bold text-gray-900 leading-none">{stats.total_domains}</div>
                          <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Total</div>
                        </div>
                        <div className="text-sm text-gray-600 mt-1">Domínios</div>
                      </div>
                    </div>

                    <div className="bg-white rounded-xl shadow-md p-6 hover:shadow-lg transition-shadow flex items-center gap-4">
                      <div className="w-12 h-12 bg-orange-100 rounded-md flex items-center justify-center shrink-0">
                        <Database className="w-6 h-6 text-orange-600" />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-baseline justify-between">
                          <div className="text-2xl font-bold text-gray-900 leading-none">{formatBytes(stats.disk_usage_total)}</div>
                          <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Uso</div>
                        </div>
                        <div className="text-sm text-gray-600 mt-1">Disco Total</div>
                      </div>
                    </div>
                  </div>

                  {/* Secondary Cards Row */}
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                    <div className="bg-white rounded-xl shadow-md p-6">
                      <h3 className="text-lg font-semibold text-gray-900 mb-4">Ações Rápidas</h3>
                      <div className="space-y-3">
                        <button
                          onClick={() => setShowCreateModal(true)}
                          className="w-full flex items-center gap-3 px-3 py-2 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-md transition-colors"
                        >
                          <UserPlus className="w-5 h-5" />
                          <span>Novo Cliente</span>
                        </button>
                        <button
                          onClick={() => loadVHMData()}
                          className="w-full flex items-center gap-3 px-3 py-2 bg-green-50 hover:bg-green-100 text-green-700 rounded-md transition-colors"
                        >
                          <RefreshCw className="w-5 h-5" />
                          <span>Atualizar Dados</span>
                        </button>
                        <button className="w-full flex items-center gap-3 px-3 py-2 bg-purple-50 hover:bg-purple-100 text-purple-700 rounded-md transition-colors text-sm">
                          <Mail className="w-4 h-4" />
                          <span>Enviar Notificação</span>
                        </button>
                      </div>
                    </div>

                    <div className="bg-white rounded-xl shadow-md p-6">
                      <h3 className="text-lg font-semibold text-gray-900 mb-4">Status Servidor</h3>
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-gray-600">Conexão API</span>
                          <span className="px-2 py-1 bg-green-100 text-green-700 text-xs rounded-full">Online</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-gray-600">Contas Suspensas</span>
                          <span className="text-sm text-gray-900 font-medium">{stats.suspended_clients}</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-gray-600">Uso de Banda</span>
                          <span className="text-sm text-gray-900 font-medium">{formatBytes(stats.bandwidth_usage_total)}</span>
                        </div>
                      </div>
                    </div>

                    <div className="bg-white rounded-xl shadow-md p-6">
                      <h3 className="text-lg font-semibold text-gray-900 mb-4">Informações</h3>
                      <div className="space-y-3">
                        <div className="flex items-center gap-3">
                          <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                          <div className="flex-1">
                            <div className="text-sm text-gray-900">API CyberPanel</div>
                            <div className="text-xs text-gray-500">za4.mozserver.com</div>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                          <div className="flex-1">
                            <div className="text-sm text-gray-900">Porta Segura 2087</div>
                            <div className="text-xs text-gray-500">DNS: Visual Design</div>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <div className="w-2 h-2 bg-orange-500 rounded-full"></div>
                          <div className="flex-1">
                            <div className="text-sm text-gray-900">Sincronização Ativa</div>
                            <div className="text-xs text-gray-500">Base Supabase OK</div>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="bg-white rounded-xl shadow-md p-6">
                      <h3 className="text-lg font-semibold text-gray-900 mb-4">Conta Principal</h3>
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-gray-600">Estado da Conta</span>
                          <span className={`px-2 py-1 ${billingInfo?.status === 'Active' || billingInfo?.status === 'Ativo' ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-700'} text-xs rounded-full font-medium`}>
                            {billingInfo?.status || 'Ativo'}
                          </span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-gray-600">Saldo / Créditos</span>
                          <span className="text-sm font-bold text-gray-900">{billingInfo?.balance || '0.00 MT'}</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-gray-600">Renovação MozServer</span>
                          <div className="text-right">
                            <span className={`text-sm font-bold ${billingInfo && billingInfo.daysToRenew < 15 ? 'text-red-600' : 'text-gray-900'}`}>
                              {billingInfo?.daysToRenew || 0} dias
                            </span>
                            <div className="text-[10px] text-gray-500 font-medium">{billingInfo?.nextDueDate}</div>
                          </div>
                        </div>
                        <div className="pt-2 mt-2 border-t border-gray-100 flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            < Bell className="w-4 h-4 text-red-500" />
                            <span className="text-sm text-gray-700">Notificações</span>
                          </div>
                          <span className="bg-red-600 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
                            {notificationCount} Activas
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                </>
              )}
            </div>
          )}


          {/* ── NOVO PAINEL ESTILO CPANEL ── */}
          {activeSection === 'infrastructure' && (
            <div className="space-y-4">
              <CpanelDashboard
                onNavigate={setActiveSection}
                sites={cyberPanelSites}
                users={cyberPanelUsers}
                isFetching={isFetchingCyberPanel}
                onRefresh={loadCyberPanelData}
              />
            </div>
          )}

          {/* INFRA ANTIGA: para reactivar, muda 'false' para 'true' e o id para 'infrastructure' */}
          {false && activeSection === 'infrastructure-old' && (
            <div className="space-y-8">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                    <Globe2 className="h-6 w-6 text-blue-600" />
                    Gestão de Infraestrutura (VPS)
                  </h2>
                  <p className="text-sm text-gray-500 mt-1">Servidor Contabo Cloud • CyberPanel & OpenLiteSpeed</p>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText('109.199.104.22');
                      alert('IP copiado para a área de transferência!');
                    }}
                    className="bg-blue-50 text-blue-700 font-medium px-4 py-2 flex items-center gap-2 border border-blue-200 transition-colors hover:bg-blue-100 rounded-md shadow-sm"
                  >
                    <Server className="h-4 w-4" />
                    IP: 109.199.104.22
                    <span className="text-xs ml-1 bg-white px-2 py-0.5 rounded-full shadow-sm text-blue-600 font-bold border border-blue-100">Copiar</span>
                  </button>
                  <button
                    onClick={() => loadCyberPanelData()}
                    className="bg-gray-100 text-gray-700 rounded-md py-1.5 px-3 flex items-center hover:bg-gray-200 transition-colors"
                  >
                    <RefreshCw className={`h-4 w-4 mr-2 ${isFetchingCyberPanel ? 'animate-spin' : ''}`} />
                    Atualizar
                  </button>
                </div>
              </div>

              {/* Server Stats */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-white rounded-xl shadow-md border border-gray-100 p-6">
                  <div className="flex items-center gap-4 mb-4">
                    <div className="w-10 h-10 bg-cyan-50 rounded-lg flex items-center justify-center text-cyan-600">
                      <Activity className="w-6 h-6" />
                    </div>
                    <div>
                      <h3 className="text-xs font-bold text-gray-500 uppercase tracking-widest">CPU / RAM</h3>
                      <p className="text-xl font-bold text-gray-900">12GB RAM</p>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <div className="flex justify-between text-xs font-medium">
                      <span className="text-gray-500">Uso de Memória</span>
                      <span className="text-gray-900">2%</span>
                    </div>
                    <div className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden">
                      <div className="w-[2%] h-full bg-cyan-500 rounded-full"></div>
                    </div>
                  </div>
                </div>

                <div className="bg-white rounded-xl shadow-md border border-gray-100 p-6">
                  <div className="flex items-center gap-4 mb-4">
                    <div className="w-10 h-10 bg-purple-50 rounded-lg flex items-center justify-center text-purple-600">
                      <Database className="w-6 h-6" />
                    </div>
                    <div>
                      <h3 className="text-xs font-bold text-gray-500 uppercase tracking-widest">Armazenamento</h3>
                      <p className="text-xl font-bold text-gray-900">100GB NVMe</p>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <div className="flex justify-between text-xs font-medium">
                      <span className="text-gray-500">Espaço em Disco</span>
                      <span className="text-gray-900">2.0%</span>
                    </div>
                    <div className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden">
                      <div className="w-[2%] h-full bg-purple-500 rounded-full"></div>
                    </div>
                  </div>
                </div>

                <div className="bg-white rounded-xl shadow-md border border-gray-100 p-6">
                  <div className="flex items-center gap-4 mb-4">
                    <div className="w-10 h-10 bg-green-50 rounded-lg flex items-center justify-center text-green-600">
                      <Globe className="w-6 h-6" />
                    </div>
                    <div>
                      <h3 className="text-xs font-bold text-gray-500 uppercase tracking-widest">Acesso Painel</h3>
                      <p className="text-xl font-bold text-gray-900">CyberPanel</p>
                    </div>
                  </div>
                  <a
                    href="https://109.199.104.22:8090"
                    target="_blank"
                    className="flex items-center gap-2 text-xs font-bold text-cyan-600 hover:text-cyan-700 transition-colors"
                  >
                    ABRIR PAINEL WEB <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              </div>

              {/* Infrastructure Tabs */}
              <div className="flex bg-white rounded-lg shadow-sm border border-gray-200 p-1 mb-6 max-w-sm">
                <button
                  onClick={() => setInfraActiveTab('websites')}
                  className={`flex-1 py-2 text-sm font-bold rounded-md transition-all ${infraActiveTab === 'websites' ? 'bg-cyan-50 text-cyan-700 shadow-sm' : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'}`}
                >
                  <Globe className="w-4 h-4 inline-block mr-2" />
                  Websites
                </button>
                <button
                  onClick={() => setInfraActiveTab('packages')}
                  className={`flex-1 py-2 text-sm font-bold rounded-md transition-all ${infraActiveTab === 'packages' ? 'bg-cyan-50 text-cyan-700 shadow-sm' : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'}`}
                >
                  <Package className="w-4 h-4 inline-block mr-2" />
                  Pacotes
                </button>
              </div>

              {/* Websites List */}
              {infraActiveTab === 'websites' && (
                <div className="bg-white rounded-xl shadow-md border border-gray-200 overflow-hidden animate-in fade-in duration-300">
                  <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center bg-gray-50">
                    <h3 className="text-sm font-bold text-gray-800">Websites no Novo Servidor</h3>
                    <button
                      onClick={() => setShowCreateCyberSiteModal(true)}
                      className="text-xs font-bold text-cyan-600 hover:bg-cyan-50 px-3 py-1 rounded transition-colors border border-cyan-200"
                    >
                      + Criar Novo Site
                    </button>
                  </div>

                  {isFetchingCyberPanel ? (
                    <div className="p-12 text-center text-gray-500">
                      <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-3 text-cyan-500" />
                      Carregando sites...
                    </div>
                  ) : cyberPanelSites.length === 0 ? (
                    <div className="p-8 text-center space-y-4">
                      <Globe2 className="w-10 h-10 text-gray-300 mx-auto" />
                      <p className="text-sm text-gray-500">A API do CyberPanel não devolveu sites.<br/>Adiciona manualmente os domínios que já existem no servidor.</p>
                      <div className="flex gap-2 max-w-sm mx-auto">
                        <input id="manualDomainInput" type="text" placeholder="ex: visualdesigne.com" className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500" />
                        <button
                          onClick={async () => {
                            const input = (document.getElementById('manualDomainInput') as HTMLInputElement)
                            const domain = input?.value?.trim().toLowerCase()
                            if (!domain) return
                            await supabase.from('cyberpanel_sites').upsert({ domain, owner: 'admin', status: 'Active', package: 'Default', admin_email: '', disk_usage: '', bandwidth_usage: '', synced_at: new Date().toISOString() }, { onConflict: 'domain' })
                            await loadCyberPanelData()
                            if (input) input.value = ''
                          }}
                          className="bg-cyan-600 hover:bg-cyan-700 text-white px-4 py-2 rounded-lg text-sm font-bold transition-colors">
                          Adicionar
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead className="bg-gray-50 text-gray-500 uppercase text-[10px] font-bold tracking-widest">
                          <tr>
                            <th className="px-6 py-4 text-left">Domínio</th>
                            <th className="px-6 py-4 text-left">Pacote</th>
                            <th className="px-6 py-4 text-left">Dono</th>
                            <th className="px-6 py-4 text-left">Status</th>
                            <th className="px-6 py-4 text-right">Ações</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                          {cyberPanelSites.map((site) => (
                            <tr key={site.domain} className="hover:bg-gray-50 transition-colors">
                              <td className="px-6 py-4 font-medium text-gray-900">{site.domain}</td>
                              <td className="px-6 py-4 text-gray-600">{site.package}</td>
                              <td className="px-6 py-4 text-gray-600">{site.owner}</td>
                              <td className="px-6 py-4">
                                <span className={`px-2 py-0.5 text-[10px] font-bold rounded-full border ${site.status === 'Active' ? 'bg-green-100 text-green-700 border-green-200' : 'bg-gray-100 text-gray-700 border-gray-200'}`}>
                                  {site.status}
                                </span>
                              </td>
                              <td className="px-6 py-4 text-right flex justify-end gap-2">
                                <button
                                  onClick={() => loadDnsRecords(site.domain)}
                                  title="Gerir DNS (Registos A, TXT, CNAME)"
                                  className="text-gray-400 hover:text-purple-600 p-1.5 transition-colors bg-gray-50 hover:bg-purple-50 rounded-md border border-transparent hover:border-purple-200"
                                >
                                  <Server className="w-4 h-4" />
                                </button>
                                <button
                                  onClick={() => loadCyberEmailAccounts(site.domain)}
                                  title="Gerir Contas de E-mail"
                                  className="text-gray-400 hover:text-amber-600 p-1.5 transition-colors bg-gray-50 hover:bg-amber-50 rounded-md border border-transparent hover:border-amber-200"
                                >
                                  <Mail className="w-4 h-4" />
                                </button>
                                <a
                                  href={`https://109.199.104.22:8090/snappymail/`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  title="Aceder ao Webmail Externamente"
                                  className="text-gray-400 hover:text-teal-600 p-1.5 transition-colors bg-gray-50 hover:bg-teal-50 rounded-md border border-transparent hover:border-teal-200 flex items-center"
                                >
                                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"></path></svg>
                                </a>
                                <div className="w-px h-6 bg-gray-200 mx-1"></div>
                                <button
                                  onClick={() => {
                                    setSelectedWPDomain(site.domain);
                                    setShowWPModal(true);
                                  }}
                                  title="Instalar WordPress (1-Click)"
                                  className="text-gray-400 hover:text-blue-600 p-1.5 transition-colors bg-gray-50 hover:bg-blue-50 rounded-md border border-transparent hover:border-blue-200"
                                >
                                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                                    <path d="M12.158 12.786l-2.698 7.84c.806.236 1.657.365 2.54.365 1.047 0 2.05-.18 2.986-.51-.024-.037-.046-.078-.065-.123l-2.763-7.572zm5.405-2.835c-.17-.885-.595-1.597-1.146-2.073-.55-.477-1.222-.716-1.956-.716-.145 0-.306.015-.476.046-.17.03-.336.07-.487.123-.153.05-.306.11-.458.17-.152.062-.312.132-.472.215-.245.123-.487.23-.717.323-.23.09-.457.17-.672.23-.213.06-.442.107-.67.14-.23.03-.473.045-.717.045-.64 0-1.19-.107-1.634-.323-.443-.215-.794-.522-1.04-.906-.244-.385-.365-.845-.365-1.37 0-.584.14-1.09.412-1.506.273-.415.655-.74 1.13-1.03.472-.292 1.053-.523 1.725-.693.67-.17 1.436-.26 2.274-.26 1.13 0 2.152.17 3.052.507.9.34 1.677.815 2.316 1.447.64.63 1.122 1.383 1.44 2.244.32.863.487 1.8.487 2.8-.002.585-.05 1.14-.14 1.66zM2.84 12c0-5.06 4.103-9.16 9.16-9.16 1.6 0 3.104.412 4.416 1.14-1.127-1.03-2.67-1.64-4.355-1.64-3.488 0-6.315 2.827-6.315 6.315 0 .205.01.408.03.61-.132.844-.198 1.7-.198 2.57 0 1.25.19 2.45.54 3.58l-1.42 2.03C3.543 15.91 2.84 14.032 2.84 12zm2.096 1.815c.168.966.452 1.898.835 2.78l1.458 3.32c-.524-.486-.98-.99-1.39-1.5-2.074-2.585-3.08-5.34-3.08-8.24m7.222.97l2.872 7.89c.815-.316 1.572-.756 2.26-1.332-1.58.2-3.23-.284-4.46-1.31M12 0C5.372 0 0 5.372 0 12s5.372 12 12 12 12-5.372 12-12S18.628 0 12 0z" />
                                  </svg>
                                </button>
                                <button className="text-gray-400 hover:text-cyan-600 p-1.5 transition-colors bg-gray-50 hover:bg-cyan-50 rounded-md border border-transparent hover:border-cyan-200">
                                  <Settings className="w-4 h-4" />
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}

              {/* Packages List */}
              {infraActiveTab === 'packages' && (
                <div className="bg-white rounded-xl shadow-md border border-gray-200 overflow-hidden animate-in fade-in duration-300">
                  <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center bg-gray-50">
                    <h3 className="text-sm font-bold text-gray-800">Planos de Alojamento</h3>
                    <button
                      onClick={() => setShowCreatePackageModal(true)}
                      className="text-xs font-bold text-cyan-600 hover:bg-cyan-50 px-3 py-1 rounded transition-colors border border-cyan-200"
                    >
                      + Criar Novo Pacote
                    </button>
                  </div>

                  {isFetchingCyberPanel ? (
                    <div className="p-12 text-center text-gray-500">
                      <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-3 text-cyan-500" />
                      Carregando pacotes...
                    </div>
                  ) : cyberPanelPackages.length === 0 ? (
                    <div className="p-16 text-center">
                      <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4">
                        <Package className="w-8 h-8 text-gray-300" />
                      </div>
                      <p className="text-sm text-gray-500 max-w-sm mx-auto">
                        Nenhum pacote encontrado. O "Default" não foi detectado.
                      </p>
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead className="bg-gray-50 text-gray-500 uppercase text-[10px] font-bold tracking-widest">
                          <tr>
                            <th className="px-6 py-4 text-left">Pacote</th>
                            <th className="px-6 py-4 text-center">Disco</th>
                            <th className="px-6 py-4 text-center">Banda</th>
                            <th className="px-6 py-4 text-center">Domínios</th>
                            <th className="px-6 py-4 text-center">E-mails</th>
                            <th className="px-6 py-4 text-center">DBs</th>
                            <th className="px-6 py-4 text-center">FTP</th>
                            <th className="px-6 py-4 text-right">Ações</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                          {cyberPanelPackages.map((pkg) => (
                            <tr key={pkg.packageName} className="hover:bg-gray-50 transition-colors">
                              <td className="px-6 py-4 font-bold text-gray-900">{pkg.packageName}</td>
                              <td className="px-6 py-4 text-center text-gray-600">{pkg.diskSpace > 1000000 ? 'Ilimitado' : `${pkg.diskSpace} MB`}</td>
                              <td className="px-6 py-4 text-center text-gray-600">{pkg.bandwidth > 1000000 ? 'Ilimitado' : `${pkg.bandwidth} MB`}</td>
                              <td className="px-6 py-4 text-center text-gray-600">{pkg.allowedDomains}</td>
                              <td className="px-6 py-4 text-center text-gray-600">{pkg.emailAccounts}</td>
                              <td className="px-6 py-4 text-center text-gray-600">{pkg.dataBases}</td>
                              <td className="px-6 py-4 text-center text-gray-600">{pkg.ftpAccounts}</td>
                              <td className="px-6 py-4 text-right">
                                {pkg.packageName === 'Default' ? (
                                  <span className="text-xs text-gray-400 italic">Padrão do Sistema</span>
                                ) : (
                                  <button className="text-red-400 hover:text-red-600 p-1.5 transition-colors">
                                    <Trash2 className="w-4 h-4" />
                                  </button>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {activeSection === 'settings' && (
            <div className="max-w-4xl">
              <h1 className="text-3xl font-bold text-gray-900 mb-8">Configurações do Painel</h1>

              <div className="space-y-6">
                {/* CIUEM API Config */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8">
                  <div className="flex items-center gap-3 mb-6">
                    <div className="w-12 h-12 rounded-2xl bg-purple-50 flex items-center justify-center text-purple-600 border border-purple-100">
                      <Globe className="w-6 h-6" />
                    </div>
                    <div>
                      <h3 className="text-xl font-bold text-gray-900">Integração Whois.co.mz (CIUEM)</h3>
                      <p className="text-sm text-gray-500">Configure o acesso direto para registo de domínios .mz</p>
                    </div>
                  </div>

                  <div className="space-y-4 max-w-2xl">
                    <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg">
                      <h4 className="flex items-center gap-2 text-sm font-bold text-amber-800 mb-2">
                        <Info className="w-4 h-4" />
                        Requisitos Importantes
                      </h4>
                      <ul className="text-xs text-amber-700 space-y-1 list-disc pl-4">
                        <li>Conta de Agente Registador em <a href="https://registo.ciuem.mz" target="_blank" className="font-bold underline">registo.ciuem.mz</a></li>
                        <li>Mínimo de 10 domínios registados na plataforma.</li>
                        <li>Depósito caução de 5.000,00 MT para ativação da API.</li>
                      </ul>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-1.5 ml-1">Chave de API (Secret Token)</label>
                      <div className="relative group">
                        <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-purple-500 transition-colors">
                          <Lock className="w-5 h-5" />
                        </div>
                        <input
                          type="password"
                          value={ciuemApiKey}
                          onChange={(e) => setCiuemApiKey(e.target.value)}
                          placeholder="Introduza o seu Token da CIUEM"
                          className="w-full pl-12 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-4 focus:ring-purple-600/5 focus:bg-white focus:border-purple-600 outline-none transition-all font-mono text-sm"
                        />
                      </div>
                      <p className="text-[10px] text-gray-400 mt-2 italic">Não partilhe esta chave com ninguém. Ela permite transações financeiras em seu nome na CIUEM.</p>
                    </div>

                    <button
                      onClick={async () => {
                        setIsSavingConfig(true)
                        // Simulate saving to database/localStorage
                        localStorage.setItem('vhm_ciuem_api_key', ciuemApiKey)
                        setTimeout(() => {
                          setIsSavingConfig(false)
                          alert('Configurações guardadas com sucesso!')
                        }, 1000)
                      }}
                      disabled={isSavingConfig}
                      className="px-8 py-3 bg-gray-900 hover:bg-black text-white rounded-xl font-bold text-sm transition-all shadow-lg flex items-center gap-2"
                    >
                      {isSavingConfig ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                      Guardar Configurações
                    </button>
                  </div>
                </div>

                {/* VHM API Config */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8">
                  <div className="flex items-center gap-3 mb-6">
                    <div className="w-12 h-12 rounded-2xl bg-blue-50 flex items-center justify-center text-blue-600 border border-blue-100">
                      <Server className="w-6 h-6" />
                    </div>
                    <div>
                      <h3 className="text-xl font-bold text-gray-900">Integração CyberPanel</h3>
                      <p className="text-sm text-gray-500">Controle direto das contas de hospedagem e revenda</p>
                    </div>
                  </div>

                  <div className="space-y-4 max-w-2xl">
                    <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                      <h4 className="flex items-center gap-2 text-sm font-bold text-blue-800 mb-2">
                        <Info className="w-4 h-4" />
                        Gestão de Acesso
                      </h4>
                      <p className="text-xs text-blue-700">
                        Se o seu acesso estiver bloqueado (Erro 403), tente gerar um novo Token no WHM e atualizá-lo aqui.
                        Certifique-se também de que o seu IP está na Whitelist do servidor.
                      </p>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-1.5 ml-1">API Token</label>
                      <div className="relative group">
                        <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-blue-500 transition-colors">
                          <Lock className="w-5 h-5" />
                        </div>
                        <input
                          type="password"
                          value={vhmApiToken}
                          onChange={(e) => setVhmApiToken(e.target.value)}
                          placeholder="Introduza o Token de API do WHM"
                          className="w-full pl-12 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-4 focus:ring-blue-600/5 focus:bg-white focus:border-blue-600 outline-none transition-all font-mono text-sm"
                        />
                      </div>
                    </div>

                    <button
                      onClick={async () => {
                        setIsSavingConfig(true)
                        localStorage.setItem('vhm_api_token', vhmApiToken)
                        // Guardar configuração
                        setTimeout(() => {
                          setIsSavingConfig(false)
                          alert('Configurações guardadas com sucesso!')
                        }, 1000)
                      }}
                      disabled={isSavingConfig}
                      className="px-8 py-3 bg-gray-900 hover:bg-black text-white rounded-xl font-bold text-sm transition-all shadow-lg flex items-center gap-2"
                    >
                      {isSavingConfig ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                      Guardar Configuração
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {
            activeSection === 'clients' && (
              <div>
                <div className="flex justify-between items-center mb-8">
                  <h1 className="text-3xl font-bold text-gray-900">Contas</h1>
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
                    <div className="text-gray-600">Carregando contas...</div>
                  </div>
                )}

                {!loading && (
                  <>
                    <div className="bg-white rounded-xl shadow-md overflow-hidden">
                      <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
                        <h3 className="text-lg font-semibold text-gray-900">Contas ({clients.length})</h3>
                        <div className="flex items-center gap-4">
                          <button
                            onClick={handleSyncVHM}
                            disabled={syncing}
                            className={`${syncing ? 'bg-gray-400' : 'bg-blue-600 hover:bg-blue-700'} text-white px-3 py-1.5 rounded-md flex items-center gap-2 transition-colors font-medium text-sm`}
                          >
                            <RefreshCw className={`w-4 h-4 ${syncing ? 'animate-spin' : ''}`} />
                            {syncing ? 'Sincronizando...' : 'Sincronizar Dados'}
                          </button>
                          <button
                            onClick={handleExportClientsCSV}
                            className="bg-gray-100 hover:bg-gray-200 text-gray-700 px-3 py-1.5 rounded-md flex items-center gap-2 transition-colors font-medium text-sm border border-gray-300"
                          >
                            <Download className="w-4 h-4" />
                            Exportar CSV
                          </button>
                          <button
                            onClick={openVHMPanel}
                            className="bg-red-600 hover:bg-red-700 text-white px-3 py-1.5 rounded-md flex items-center gap-2 transition-colors font-medium text-sm"
                          >
                            <Globe className="w-4 h-4" />
                            Ver Todos no CyberPanel
                          </button>
                          <div className="relative">
                            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                            <input
                              type="text"
                              placeholder="Buscar contas..."
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
            )}

          {activeSection === 'emails' && (
            <div>
              <div className="flex justify-between items-center mb-8">
                <h1 className="text-3xl font-bold text-gray-900">E-mails</h1>
              </div>

              {/* Client Selector */}
              <div className="bg-white rounded-md shadow-sm border border-gray-200 p-6 mb-6">
                <h3 className="text-sm font-bold text-gray-700 uppercase tracking-wider mb-4 flex items-center gap-2">
                  <Users className="w-4 h-4" />
                  Selecionar Conta de Hosting
                </h3>
                <div className="flex gap-4 items-end">
                  <div className="flex-1">
                    <label className="block text-xs font-semibold text-gray-500 mb-1">Domínio</label>
                    <select
                      value={selectedClientForEmails?.domain || ''}
                      onChange={(e) => {
                        const site = cyberPanelSites.find(s => s.domain === e.target.value)
                        if (site) loadEmailAccounts({ domain: site.domain, username: site.owner || 'admin' } as any)
                      }}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 text-sm"
                    >
                      <option value="">Selecione um domínio...</option>
                      {cyberPanelSites.map(s => (
                        <option key={s.domain} value={s.domain}>{s.domain} ({s.status})</option>
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
                  <label className="block text-xs font-semibold text-gray-500 mb-1">Domínio *</label>
                  <select
                    value={selectedClientForEmails?.domain || ''}
                    onChange={(e) => {
                      const site = cyberPanelSites.find(s => s.domain === e.target.value)
                      if (site) {
                        setSelectedClientForEmails({ domain: site.domain, username: site.owner || 'admin' } as any)
                        setNewEmailData({ ...newEmailData, email: '' })
                      }
                    }}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-cyan-500 text-sm"
                  >
                    <option value="">Selecione um domínio...</option>
                    {cyberPanelSites.map(s => (
                      <option key={s.domain} value={s.domain}>{s.domain} ({s.status})</option>
                    ))}
                  </select>
                  {cyberPanelSites.length === 0 && (
                    <p className="text-[10px] text-amber-600 mt-1">Nenhum domínio encontrado. Crie um website primeiro ou refresca o painel.</p>
                  )}
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
                      {cyberPanelSites.map(s => (
                        <option key={s.domain} value={s.domain}>{s.domain} ({s.status})</option>
                      ))}
                    </select>
                    <button
                      onClick={async () => {
                        if (selectedWebmailDomain) {
                          setIsFetchingWebmailAccounts(true)
                          try {
                            const emails = await cyberPanelAPI.listEmails(selectedWebmailDomain)
                            setRealWebmailAccounts(emails)
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
                                    // VHM removido - usar CyberPanel emails
                                    setRealWebmailAccounts([])
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
                                        // VHM removido - abrir webmail do CyberPanel
                                        const webmailUrl = `https://${selectedWebmailDomain}:2096`
                                        window.open(webmailUrl, '_blank')
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
                <h1 className="text-3xl font-bold text-gray-900">Domínios</h1>
                <button
                  onClick={loadCyberPanelData}
                  disabled={isFetchingCyberPanel}
                  className="bg-black hover:bg-red-600 text-white px-4 py-1.5 rounded-md flex items-center gap-2 transition-all shadow-sm text-sm font-bold"
                >
                  <RefreshCw className={`w-4 h-4 ${isFetchingCyberPanel ? 'animate-spin' : ''}`} />
                  {isFetchingCyberPanel ? 'Carregando...' : 'Atualizar Domínios'}
                </button>
              </div>

              {/* Domains Table - CyberPanel */}
              <div className="bg-white rounded-md shadow-sm border border-gray-200 overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center bg-gray-50">
                  <div>
                    <h3 className="text-sm font-bold text-gray-800">Domínios no CyberPanel</h3>
                    <p className="text-xs text-gray-500 mt-0.5">{cyberPanelSites.length} domínio(s) encontrado(s)</p>
                  </div>
                  {cyberPanelSites.length > 0 && (
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

                {isFetchingCyberPanel ? (
                  <div className="p-12 text-center">
                    <RefreshCw className="w-8 h-8 animate-spin text-purple-500 mx-auto mb-3" />
                    <p className="text-sm text-gray-500">Carregando domínios do CyberPanel...</p>
                  </div>
                ) : cyberPanelSites.length === 0 ? (
                  <div className="p-12 text-center">
                    <Globe className="w-10 h-10 text-gray-300 mx-auto mb-3" />
                    <p className="text-sm text-gray-500 mb-2">Nenhum domínio encontrado no CyberPanel.</p>
                    <button
                      onClick={loadCyberPanelData}
                      className="text-black hover:text-red-600 text-sm font-semibold"
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
                          <th className="px-6 py-3">Pacote</th>
                          <th className="px-6 py-3">Admin</th>
                          <th className="px-6 py-3">Estado</th>
                          <th className="px-6 py-3">Ações</th>
                        </tr>
                      </thead>
                      <tbody>
                        {cyberPanelSites
                          .filter(s => {
                            if (!domainSearchTerm) return true
                            return s.domain?.toLowerCase().includes(domainSearchTerm.toLowerCase())
                          })
                          .map((site, idx) => (
                            <tr key={idx} className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                              <td className="px-6 py-3">
                                <div className="flex items-center gap-2">
                                  <div className="w-8 h-8 rounded-full bg-purple-100 flex items-center justify-center">
                                    <Globe className="w-4 h-4 text-purple-600" />
                                  </div>
                                  <div>
                                    <span className="font-medium text-gray-900">{site.domain}</span>
                                    <p className="text-[10px] text-gray-400">{site.owner || ''}</p>
                                  </div>
                                </div>
                              </td>
                              <td className="px-6 py-3 text-gray-600">{site.package || '—'}</td>
                              <td className="px-6 py-3 text-gray-600 text-xs">{site.adminEmail || '—'}</td>
                              <td className="px-6 py-3">
                                <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                                  site.status === 'Active' || !site.status ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                                }`}>
                                  {site.status || 'Ativo'}
                                </span>
                              </td>
                              <td className="px-6 py-3">
                                <div className="flex items-center gap-2">
                                  <button
                                    onClick={() => { setSelectedDnsDomain(site.domain); setActiveSection('domains-dns'); loadDnsRecords(site.domain) }}
                                    className="text-black hover:text-red-600 text-xs font-semibold"
                                    title="Gerir DNS"
                                  >
                                    DNS
                                  </button>
                                  <button
                                    onClick={() => { loadCyberEmailAccounts(site.domain) ; setActiveSection('emails') }}
                                    className="text-black hover:text-red-600 text-xs font-semibold"
                                    title="E-mails"
                                  >
                                    E-mails
                                  </button>
                                </div>
                              </td>
                            </tr>
                          ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )}

          {activeSection === 'domains-dns' && (
            <div className="space-y-6 max-w-5xl">
              <div className="flex justify-between items-center mb-8">
                <div>
                  <h1 className="text-3xl font-bold text-gray-900">Gestão de DNS</h1>
                  <p className="text-gray-500 mt-1">Gira os registos A, CNAME, TXT, MX e outros para os seus domínios alojados na infraestrutura.</p>
                </div>
              </div>

              <div className="bg-white rounded-xl shadow-md border border-gray-100 overflow-hidden">
                <div className="p-6 border-b border-gray-100 bg-gray-50 flex gap-4 items-end">
                  <div className="flex-1">
                    <label className="block text-xs font-bold text-gray-700 mb-1">Selecione o Domínio</label>
                    <div className="relative">
                      <select
                        value={selectedDnsDomain}
                        onChange={(e) => {
                          setSelectedDnsDomain(e.target.value);
                          if (e.target.value) {
                            loadDnsRecords(e.target.value);
                          } else {
                            setDnsRecords([]);
                          }
                        }}
                        className="w-full pl-10 pr-4 py-2 bg-white border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500"
                      >
                        <option value="">Escolha um domínio...</option>
                        {cyberPanelSites.map(site => (
                          <option key={site.domain} value={site.domain}>{site.domain}</option>
                        ))}
                      </select>
                      <Globe className="w-4 h-4 text-gray-400 absolute left-3 top-2.5" />
                    </div>
                  </div>
                  <button
                    onClick={() => loadDnsRecords(selectedDnsDomain)}
                    disabled={!selectedDnsDomain || isFetchingDns}
                    className="px-4 py-2 bg-white border border-gray-200 text-gray-700 hover:bg-gray-50 hover:text-purple-600 rounded-lg text-sm font-semibold transition-colors flex items-center gap-2 disabled:opacity-50"
                  >
                    <RefreshCw className={`w-4 h-4 ${isFetchingDns ? 'animate-spin text-purple-600' : ''}`} />
                    Atualizar Registos
                  </button>
                </div>

                {error && (
                  <div className="m-6 p-4 bg-red-50 border border-red-100 text-red-600 text-sm rounded-lg flex items-start gap-3">
                    <AlertCircle className="w-5 h-5 flex-shrink-0" />
                    <div>{error}</div>
                  </div>
                )}

                {selectedDnsDomain ? (
                  <div className="p-6">
                    {/* Add New Record Form */}
                    <div className="mb-8 p-5 bg-purple-50/50 rounded-xl border border-purple-100">
                      <h3 className="text-sm font-bold text-gray-900 mb-4 flex items-center gap-2">
                        <Plus className="w-4 h-4 text-purple-600" />
                        Adicionar Novo Registo
                      </h3>
                      <div className="grid grid-cols-12 gap-4 items-end">
                        <div className="col-span-2">
                          <label className="block text-xs font-semibold text-gray-600 mb-1">Tipo</label>
                          <select
                            value={dnsFormData.recordType}
                            onChange={(e) => setDnsFormData({ ...dnsFormData, recordType: e.target.value })}
                            className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20"
                          >
                            <option value="A">A</option>
                            <option value="AAAA">AAAA</option>
                            <option value="CNAME">CNAME</option>
                            <option value="MX">MX</option>
                            <option value="TXT">TXT</option>
                            <option value="NS">NS</option>
                            <option value="SRV">SRV</option>
                          </select>
                        </div>
                        <div className="col-span-3">
                          <label className="block text-xs font-semibold text-gray-600 mb-1">Nome (Name)</label>
                          <input
                            type="text"
                            placeholder="ex: @ ou subdominio"
                            value={dnsFormData.name}
                            onChange={(e) => setDnsFormData({ ...dnsFormData, name: e.target.value })}
                            className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20"
                          />
                        </div>
                        <div className="col-span-4">
                          <label className="block text-xs font-semibold text-gray-600 mb-1">Valor (Value)</label>
                          <input
                            type="text"
                            placeholder="ex: 192.168.1.1 ou v=spf1..."
                            value={dnsFormData.value}
                            onChange={(e) => setDnsFormData({ ...dnsFormData, value: e.target.value })}
                            className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20"
                          />
                        </div>
                        <div className="col-span-1">
                          <label className="block text-xs font-semibold text-gray-600 mb-1">TTL</label>
                          <input
                            type="text"
                            placeholder="3600"
                            value={dnsFormData.ttl}
                            onChange={(e) => setDnsFormData({ ...dnsFormData, ttl: e.target.value })}
                            className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20"
                          />
                        </div>
                        <div className="col-span-2">
                          <button
                            onClick={handleCreateDnsRecord}
                            disabled={isSavingDns || !dnsFormData.name || !dnsFormData.value}
                            className="w-full px-4 py-2 bg-black hover:bg-red-600 text-white font-bold text-sm rounded-lg shadow-sm transition-colors disabled:opacity-50"
                          >
                            {isSavingDns ? <RefreshCw className="w-4 h-4 animate-spin mx-auto" /> : 'Adicionar'}
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Records Table */}
                    <div className="border border-gray-200 rounded-xl overflow-hidden">
                      <table className="w-full text-sm text-left">
                        <thead className="bg-gray-50 text-gray-500 text-xs uppercase font-bold tracking-wider">
                          <tr>
                            <th className="px-6 py-4">Nome</th>
                            <th className="px-6 py-4 w-24">Tipo</th>
                            <th className="px-6 py-4">Conteúdo / Valor</th>
                            <th className="px-6 py-4 w-24">TTL</th>
                            <th className="px-6 py-4 text-right w-24">Ações</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                          {isFetchingDns && dnsRecords.length === 0 ? (
                            <tr>
                              <td colSpan={5} className="px-6 py-12 text-center text-gray-400">
                                <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-purple-400" />
                                <p>A carregar registos DNS...</p>
                              </td>
                            </tr>
                          ) : dnsRecords.length === 0 ? (
                            <tr>
                              <td colSpan={5} className="px-6 py-12 text-center text-gray-400">
                                <Server className="w-8 h-8 mx-auto mb-2 opacity-20" />
                                <p>Nenhum registo encontrado para este domínio.</p>
                              </td>
                            </tr>
                          ) : (
                            dnsRecords.map((record, index) => (
                              <tr key={index} className="hover:bg-purple-50/30 transition-colors">
                                <td className="px-6 py-3 font-medium text-gray-900">{record.name}</td>
                                <td className="px-6 py-3">
                                  <span className={`px-2 py-1 rounded text-xs font-bold ${record.type === 'A' ? 'bg-blue-100 text-blue-700' :
                                    record.type === 'CNAME' ? 'bg-purple-100 text-purple-700' :
                                      record.type === 'TXT' ? 'bg-green-100 text-green-700' :
                                        record.type === 'MX' ? 'bg-orange-100 text-orange-700' :
                                          'bg-gray-100 text-gray-700'
                                    }`}>
                                    {record.type}
                                  </span>
                                </td>
                                <td className="px-6 py-3 text-gray-600 font-mono text-xs break-all">{record.content}</td>
                                <td className="px-6 py-3 text-gray-500">{record.ttl}</td>
                                <td className="px-6 py-3 text-right">
                                  {record.type !== 'SOA' && (
                                    <button
                                      onClick={() => handleDeleteDnsRecord(record.id)}
                                      className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded transition-colors"
                                      title="Apagar Registo"
                                    >
                                      <Trash2 className="w-4 h-4" />
                                    </button>
                                  )}
                                </td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                ) : (
                  <div className="p-16 text-center text-gray-400">
                    <Globe className="w-12 h-12 mx-auto mb-4 opacity-20" />
                    <p>Selecione um domínio acima para gerir os seus registos DNS.</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {activeSection === 'packages-list' && (
            <div className="space-y-6 max-w-5xl">
              <div className="flex justify-between items-center mb-8">
                <div>
                  <h1 className="text-3xl font-bold text-gray-900">Pacotes de Alojamento</h1>
                  <p className="text-gray-500 mt-1">Gira as quotas de armazenamento, tráfego e limites da sua revenda.</p>
                </div>
                <button
                  onClick={() => {
                    loadCyberPanelData()
                  }}
                  className="bg-gray-100 hover:bg-gray-200 text-gray-700 px-4 py-2 rounded-md flex items-center gap-2 transition-all font-bold"
                >
                  <RefreshCw className={`w-4 h-4 ${isFetchingPackages ? 'animate-spin text-emerald-600' : ''}`} />
                  Atualizar
                </button>
              </div>

              {error && (
                <div className="p-4 bg-red-50 border border-red-100 text-red-600 rounded-lg flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 flex-shrink-0" />
                  <div>{error}</div>
                </div>
              )}

              <div className="bg-white rounded-xl shadow-md border border-gray-100 overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 border-b border-gray-100">
                    <tr className="text-left text-xs font-bold text-gray-500 uppercase tracking-wider">
                      <th className="px-6 py-4">Nome do Pacote</th>
                      <th className="px-6 py-4">Disco (MB)</th>
                      <th className="px-6 py-4">Tráfego (MB)</th>
                      <th className="px-6 py-4">E-mails</th>
                      <th className="px-6 py-4">BDs</th>
                      <th className="px-6 py-4">Domínios</th>
                      <th className="px-6 py-4 text-right">Ações</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {packages.length === 0 && !isFetchingPackages ? (
                      <tr>
                        <td colSpan={7} className="px-6 py-12 text-center text-gray-400">
                          <Package className="w-12 h-12 mx-auto mb-3 opacity-20" />
                          Nenhum pacote encontrado.
                        </td>
                      </tr>
                    ) : (
                      packages.map((pkg, idx) => (
                        <tr key={idx} className="hover:bg-gray-50 transition-colors">
                          <td className="px-6 py-3 font-bold text-gray-900">{pkg.name}</td>
                          <td className="px-6 py-3 text-gray-600">{pkg.diskSpace}</td>
                          <td className="px-6 py-3 text-gray-600">{pkg.bandwidth}</td>
                          <td className="px-6 py-3 text-gray-600">{pkg.emailAccounts}</td>
                          <td className="px-6 py-3 text-gray-600">{pkg.dataBases}</td>
                          <td className="px-6 py-3 text-gray-600">{pkg.allowedDomains}</td>
                          <td className="px-6 py-3 text-right">
                            <button
                              onClick={() => handleDeletePackage(pkg.name)}
                              className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                              title="Apagar Pacote"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {activeSection === 'packages-new' && (
            <div className="space-y-6 max-w-3xl">
              <div>
                <h1 className="text-3xl font-bold text-gray-900">Criar Novo Pacote</h1>
                <p className="text-gray-500 mt-1">Defina os limites de recursos para este plano.</p>
              </div>

              {error && (
                <div className="p-4 bg-red-50 border border-red-100 text-red-600 rounded-lg flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 flex-shrink-0" />
                  <div>{error}</div>
                </div>
              )}

              <form onSubmit={async (e) => {
                e.preventDefault()
                setIsSavingPackage(true)
                setError(null)
                try {
                  const res = await fetch('/api/cyberpanel-packages', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(packageFormData)
                  })
                  const data = await res.json()
                  if (data.success) {
                    alert('Pacote criado com sucesso!')
                    loadCyberPanelData()
                    setPackageFormData({ packageName: '', diskSpace: '1000', bandwidth: '10000', emailAccounts: '10', dataBases: '5', ftpAccounts: '2', allowedDomains: '1' })
                  } else {
                    throw new Error(data.error || 'Erro ao criar pacote')
                  }
                } catch (err: any) {
                  setError(err.message)
                } finally {
                  setIsSavingPackage(false)
                }
              }} className="bg-white rounded-xl shadow-md border border-gray-100 p-8 space-y-6">
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">Nome do Pacote</label>
                  <input
                    type="text"
                    required
                    value={packageFormData.packageName}
                    onChange={(e) => setPackageFormData({ ...packageFormData, packageName: e.target.value })}
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-emerald-500"
                    placeholder="Ex: Start, Pro, Business"
                  />
                  <p className="text-xs text-gray-500 mt-1">Apenas letras sem espaços.</p>
                </div>

                <div className="grid grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-2">Espaço em Disco (MB)</label>
                    <input
                      type="number"
                      required
                      value={packageFormData.diskSpace}
                      onChange={(e) => setPackageFormData({ ...packageFormData, diskSpace: e.target.value })}
                      className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-2">Tráfego Mensal (MB)</label>
                    <input
                      type="number"
                      required
                      value={packageFormData.bandwidth}
                      onChange={(e) => setPackageFormData({ ...packageFormData, bandwidth: e.target.value })}
                      className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-2">Contas de E-mail</label>
                    <input
                      type="number"
                      required
                      value={packageFormData.emailAccounts}
                      onChange={(e) => setPackageFormData({ ...packageFormData, emailAccounts: e.target.value })}
                      className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-2">Bases de Dados</label>
                    <input
                      type="number"
                      required
                      value={packageFormData.dataBases}
                      onChange={(e) => setPackageFormData({ ...packageFormData, dataBases: e.target.value })}
                      className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-2">Contas FTP</label>
                    <input
                      type="number"
                      required
                      value={packageFormData.ftpAccounts}
                      onChange={(e) => setPackageFormData({ ...packageFormData, ftpAccounts: e.target.value })}
                      className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-2">Domínios Extra Permitidos</label>
                    <input
                      type="number"
                      required
                      value={packageFormData.allowedDomains}
                      onChange={(e) => setPackageFormData({ ...packageFormData, allowedDomains: e.target.value })}
                      className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>
                </div>

                <div className="pt-4 border-t border-gray-100 flex justify-end">
                  <button
                    type="submit"
                    disabled={isSavingPackage}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-3 rounded-lg font-bold flex items-center gap-2 transition-all disabled:opacity-50"
                  >
                    {isSavingPackage ? <RefreshCw className="w-5 h-5 animate-spin" /> : <Package className="w-5 h-5" />}
                    Criar Pacote
                  </button>
                </div>
              </form>
            </div>
          )}

          {activeSection === 'domains-new' && (
            <div className="space-y-8">
              <div className="flex justify-between items-center">
                <h1 className="text-3xl font-bold text-gray-900">Criar Website</h1>
              </div>

              {/* Create Website in CyberPanel */}
              <div className="bg-white rounded-xl shadow-md border border-gray-100 p-8">
                <h3 className="text-sm font-bold text-gray-700 uppercase tracking-wider mb-6 flex items-center gap-2">
                  <Server className="w-4 h-4 text-red-600" />
                  Criar Website no Servidor CyberPanel
                </h3>
                {error && <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">{error}</div>}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-6">
                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1.5">Domínio <span className="text-red-500">*</span></label>
                    <input type="text" value={newCyberSiteData.domainName} onChange={(e) => setNewCyberSiteData({ ...newCyberSiteData, domainName: e.target.value })}
                      placeholder="exemplo.co.mz" className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1.5">E-mail do Admin <span className="text-red-500">*</span></label>
                    <input type="email" value={newCyberSiteData.adminEmail} onChange={(e) => setNewCyberSiteData({ ...newCyberSiteData, adminEmail: e.target.value })}
                      placeholder="admin@exemplo.co.mz" className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1.5">Pacote de Hosting</label>
                    <select value={newCyberSiteData.packageName} onChange={(e) => setNewCyberSiteData({ ...newCyberSiteData, packageName: e.target.value })}
                      className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500">
                      {cyberPanelPackages.length > 0 ? cyberPanelPackages.map(p => <option key={p.packageName} value={p.packageName}>{p.packageName}</option>) : <option value="Default">Default</option>}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1.5">Versão PHP</label>
                    <select value={newCyberSiteData.phpSelection} onChange={(e) => setNewCyberSiteData({ ...newCyberSiteData, phpSelection: e.target.value })}
                      className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500">
                      <option>PHP 7.4</option><option>PHP 8.0</option><option>PHP 8.1</option><option>PHP 8.2</option><option>PHP 8.3</option>
                    </select>
                  </div>
                </div>
                <div className="flex justify-end">
                  <button onClick={handleCreateCyberSite} disabled={isSavingCyberSite || !newCyberSiteData.domainName.trim() || !newCyberSiteData.adminEmail.trim()}
                    className="bg-black hover:bg-red-600 text-white px-7 py-2.5 rounded-lg text-sm font-bold transition-all disabled:opacity-50 flex items-center gap-2">
                    {isSavingCyberSite ? <><RefreshCw className="w-4 h-4 animate-spin" /> A criar...</> : <><Globe2 className="w-4 h-4" /> Criar Website no CyberPanel</>}
                  </button>
                </div>
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
                    className="bg-black hover:bg-red-600 text-white px-5 py-2 rounded-md flex items-center gap-2 transition-all text-sm font-bold disabled:opacity-50"
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
                        ciuemApiKey && domainCheckTLD === '.co.mz' ? (
                          <button
                            onClick={handleRegisterCiuem}
                            disabled={isSavingConfig}
                            className="ml-auto bg-black hover:bg-red-600 text-white px-4 py-1.5 rounded-md text-sm font-bold transition-all flex items-center gap-2"
                          >
                            {isSavingConfig ? <RefreshCw className="w-4 h-4 animate-spin" /> : <PlusCircle className="w-4 h-4" />}
                            Registrar via CIUEM
                          </button>
                        ) : domainCheckTLD === '.co.mz' ? (
                          <div className="ml-auto flex flex-col items-end gap-2">
                            <span className="text-[10px] font-bold text-amber-600 uppercase tracking-widest bg-amber-50 px-2 py-1 rounded border border-amber-100 italic">
                              Requer Registo Manual
                            </span>
                            <a
                              href="https://whois.co.mz/whois/"
                              target="_blank"
                              rel="noopener noreferrer"
                              className="bg-black hover:bg-red-600 text-white px-4 py-1.5 rounded-md text-sm font-bold transition-all flex items-center gap-2"
                            >
                              <ExternalLink className="w-4 h-4" />
                              Portal Whois.co.mz
                            </a>
                          </div>
                        ) : (
                          <a
                            href={`https://www.mozserver.co.mz/cart.php?a=add&domain=register&query=${domainCheckQuery}${domainCheckTLD}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="ml-auto bg-green-600 hover:bg-green-700 text-white px-4 py-1.5 rounded-md text-sm font-bold transition-all"
                          >
                            Registrar Domínio
                          </a>
                        )
                      )}
                    </div>

                    {domainCheckTLD === '.co.mz' && !ciuemApiKey && (
                      <div className="mt-4 p-4 bg-purple-50 border border-purple-100 rounded-md">
                        <div className="flex gap-3">
                          <Info className="w-5 h-5 text-purple-600 shrink-0 mt-0.5" />
                          <div>
                            <p className="text-sm font-bold text-purple-900">Nota sobre domínios .co.mz</p>
                            <p className="text-xs text-purple-800 mt-1">
                              O registo automático para extensões <span className="font-bold">.co.mz</span> requer configuração da sua Chave API nas <button onClick={() => setActiveSection('settings')} className="font-bold underline">Configurações</button>.
                              Caso ainda não tenha uma chave, utilize o portal oficial.
                            </p>
                          </div>
                        </div>
                      </div>
                    )}

                    {ciuemApiKey && domainCheckTLD === '.co.mz' && domainCheckResult.available && (
                      <div className="mt-4 p-4 bg-green-50 border border-green-100 rounded-md">
                        <div className="flex gap-3">
                          <Check className="w-5 h-5 text-green-600 shrink-0 mt-0.5" />
                          <div>
                            <p className="text-sm font-bold text-green-900">Configuração de Agente Detectada</p>
                            <p className="text-xs text-green-800 mt-1">
                              Você pode processar este registo diretamente. O custo estimado de 950 MT será descontado do seu saldo CIUEM.
                            </p>
                          </div>
                        </div>
                      </div>
                    )}

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

          {activeSection === 'wordpress-deploy' && (
            <div className="space-y-6 max-w-4xl">
              <div className="flex justify-between items-center mb-8">
                <div>
                  <h1 className="text-3xl font-bold text-gray-900">Deploy WordPress</h1>
                  <p className="text-gray-500 mt-1">Instale o WordPress com 1-click num dos websites da Nova Infraestrutura.</p>
                </div>
              </div>

              <div className="bg-white rounded-xl shadow-md border border-gray-100 p-8">
                <div className="space-y-6">
                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1">Domínio de Destino</label>
                    <select
                      value={selectedWPDomain || ''}
                      onChange={(e) => setSelectedWPDomain(e.target.value)}
                      className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#00749C]/20 focus:border-[#00749C]"
                    >
                      <option value="">Selecione um domínio...</option>
                      {cyberPanelSites.map(site => (
                        <option key={site.domain} value={site.domain}>{site.domain}</option>
                      ))}
                    </select>
                    {cyberPanelSites.length === 0 && (
                      <p className="text-[10px] text-red-500 mt-1">Nenhum site encontrado. Crie um website na tab Infraestrutura primeiro.</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1">Título do Website</label>
                    <input
                      type="text"
                      value={wpData.title}
                      onChange={(e) => setWpData({ ...wpData, title: e.target.value })}
                      placeholder="Ex: Meu Novo Site"
                      className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#00749C]/20 focus:border-[#00749C]"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-gray-700 mb-1">Nome de Utilizador</label>
                      <input
                        type="text"
                        value={wpData.user}
                        onChange={(e) => setWpData({ ...wpData, user: e.target.value })}
                        placeholder="admin"
                        className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#00749C]/20 focus:border-[#00749C]"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-gray-700 mb-1">Palavra-passe Segura</label>
                      <input
                        type="text"
                        value={wpData.password}
                        onChange={(e) => setWpData({ ...wpData, password: e.target.value })}
                        placeholder="P@ssw0rd!"
                        className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#00749C]/20 focus:border-[#00749C]"
                      />
                    </div>
                  </div>

                  <div className="pt-4 border-t border-gray-100 space-y-4">
                    <label className="flex items-center gap-3 cursor-pointer select-none group">
                      <input
                        type="checkbox"
                        checked={wpInstallLiteSpeed}
                        onChange={(e) => setWpInstallLiteSpeed(e.target.checked)}
                        className="w-4 h-4 accent-green-600 cursor-pointer"
                      />
                      <div>
                        <span className="text-sm font-bold text-gray-800">Instalar LiteSpeed Cache</span>
                        <p className="text-xs text-gray-400">Plugin de cache e optimização instalado e activado automaticamente após o WordPress</p>
                      </div>
                    </label>
                    <div className="flex justify-end">
                      <button
                        onClick={handleInstallWP}
                        disabled={isInstallingWP || !selectedWPDomain || !wpData.title.trim() || !wpData.user.trim() || !wpData.password.trim()}
                        className="px-8 py-3 bg-black hover:bg-red-600 text-white text-sm font-bold rounded-lg shadow-md transition-all flex items-center gap-2 disabled:opacity-50"
                      >
                        {isInstallingWP ? (<><RefreshCw className="w-4 h-4 animate-spin" /> Instalando...</>) : (<><Globe2 className="w-4 h-4" /> Instalar WordPress Agora</>)}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeSection === 'wordpress-list' && (
            <div className="space-y-6">
              <div className="flex justify-between items-center mb-8">
                <div>
                  <h1 className="text-3xl font-bold text-gray-900">Listar WordPress</h1>
                  <p className="text-gray-500 mt-1">Gerencie as instalações WordPress ativas.</p>
                </div>
                <button
                  onClick={loadCyberPanelData}
                  className="p-2 text-gray-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-md transition-colors"
                >
                  <RefreshCw className={`w-5 h-5 ${isFetchingCyberPanel ? 'animate-spin' : ''}`} />
                </button>
              </div>

              <div className="bg-white rounded-xl shadow-md border border-gray-100 overflow-hidden">
                {isFetchingCyberPanel ? (
                  <div className="p-12 text-center text-gray-500">
                    <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-3 text-indigo-500" />
                    Carregando instalações...
                  </div>
                ) : cyberPanelSites.length === 0 ? (
                  <div className="p-16 text-center">
                    <Globe2 className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                    <p className="text-sm text-gray-500">Nenhum site encontrado no servidor CyberPanel.</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead className="bg-gray-50 text-gray-500 uppercase text-[10px] font-bold tracking-widest">
                        <tr>
                          <th className="px-6 py-4 text-left">Domínio</th>
                          <th className="px-6 py-4 text-left">Status</th>
                          <th className="px-6 py-4 text-left">Auto Login</th>
                          <th className="px-6 py-4 text-right">Ações</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {cyberPanelSites.map((site) => (
                          <tr key={site.domain} className="hover:bg-gray-50 transition-colors">
                            <td className="px-6 py-4 font-medium text-gray-900 flex items-center gap-2">
                              <div className="w-6 h-6 rounded-full bg-indigo-50 flex items-center justify-center">
                                <Globe2 className="w-3 h-3 text-indigo-600" />
                              </div>
                              {site.domain}
                            </td>
                            <td className="px-6 py-4">
                              <span className={`px-2 py-0.5 text-[10px] font-bold rounded-full border ${site.status === 'Active' ? 'bg-green-100 text-green-700 border-green-200' : 'bg-gray-100 text-gray-700 border-gray-200'}`}>
                                {site.status || 'Ativo'}
                              </span>
                            </td>
                            <td className="px-6 py-4">
                              <a
                                href={`https://${site.domain}/wp-admin`}
                                target="_blank"
                                className="text-xs font-bold text-indigo-600 hover:underline"
                              >
                                Abrir wp-admin
                              </a>
                            </td>
                            <td className="px-6 py-4 text-right">
                              <button className="text-gray-400 hover:text-indigo-600 p-1.5 transition-colors" title="Settings">
                                <Settings className="w-4 h-4" />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )}

          {['wordpress-plugins', 'wordpress-restore', 'wordpress-remote'].includes(activeSection) && (
            <div className="space-y-6">
              <div className="flex justify-between items-center mb-8">
                <div>
                  <h1 className="text-3xl font-bold text-gray-900">
                    {activeSection === 'wordpress-plugins' && 'Configure Plugins'}
                    {activeSection === 'wordpress-restore' && 'Restore Backups'}
                    {activeSection === 'wordpress-remote' && 'Remote Backup'}
                  </h1>
                  <p className="text-gray-500 mt-1">Gestão avançada de instâncias WordPress no servidor.</p>
                </div>
              </div>

              <div className="bg-white rounded-xl shadow-md border border-gray-100 p-8 text-center max-w-2xl mx-auto mt-12">
                <div className="w-20 h-20 bg-indigo-50 rounded-full flex items-center justify-center mx-auto mb-6">
                  <Database className="w-10 h-10 text-indigo-600" />
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-2">Em Desenvolvimento</h3>
                <p className="text-gray-600 mb-8 px-4">
                  Esta funcionalidade ({activeSection}) será ligada à API do LiteSpeed e do CyberPanel em breve.
                </p>
                <div className="inline-block bg-orange-100 text-orange-700 px-3 py-1 text-sm font-bold rounded-full">
                  BREVEMENTE
                </div>
              </div>
            </div>
          )}

          {

            activeSection === 'notifications' && (
              <div>
                <div className="flex justify-between items-center mb-8">
                  <h1 className="text-3xl font-bold text-gray-900">Notificações</h1>
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
            )}

          {activeSection === 'git-deploy' && (
            <GitDeploySection />
          )}

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
            )}

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
                        <p className="mt-1 text-[9px] text-orange-600 italic">Atualiza o e-mail de contacto na base de dados.</p>
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
                      <strong>Atenção:</strong> Alterar o plano ou as quotas resultará numa atualização imediata dos limites no servidor.
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
            )}

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
                          {/* Removed misplaced Create Package Modal */}

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

          {/* Create Package Modal */}
          {showCreatePackageModal && (
            <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
              <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden animate-in fade-in zoom-in duration-200">
                <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
                  <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                    <Package className="w-5 h-5 text-cyan-500" />
                    Novo Pacote CyberPanel
                  </h2>
                  <button onClick={() => setShowCreatePackageModal(false)} className="text-gray-400 hover:text-gray-600 transition-colors p-1 hover:bg-gray-100 rounded-full">
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <div className="p-6">
                  {error && (
                    <div className="mb-4 p-3 bg-red-50 border border-red-100 text-red-600 text-xs rounded-md">
                      {error}
                    </div>
                  )}

                  <div className="space-y-4">
                    <div>
                      <label className="block text-xs font-bold text-gray-700 mb-1">Nome do Pacote</label>
                      <input
                        type="text"
                        value={newPackageData.packageName}
                        onChange={(e) => setNewPackageData({ ...newPackageData, packageName: e.target.value })}
                        placeholder="Ex: Start_CMS"
                        className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500/20 focus:border-cyan-500 transition-all font-medium text-gray-900"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-bold text-gray-700 mb-1">Espaço Lógico (MB)</label>
                        <input
                          type="number"
                          value={newPackageData.diskSpace}
                          onChange={(e) => setNewPackageData({ ...newPackageData, diskSpace: parseInt(e.target.value) || 0 })}
                          className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500/20 focus:border-cyan-500"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-gray-700 mb-1">Largura de Banda (MB)</label>
                        <input
                          type="number"
                          value={newPackageData.bandwidth}
                          onChange={(e) => setNewPackageData({ ...newPackageData, bandwidth: parseInt(e.target.value) || 0 })}
                          className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500/20 focus:border-cyan-500"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-bold text-gray-700 mb-1">Lim. E-mails</label>
                        <input
                          type="number"
                          value={newPackageData.emailAccounts}
                          onChange={(e) => setNewPackageData({ ...newPackageData, emailAccounts: parseInt(e.target.value) || 0 })}
                          className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500/20 focus:border-cyan-500"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-gray-700 mb-1">Lim. Bases de Dados</label>
                        <input
                          type="number"
                          value={newPackageData.dataBases}
                          onChange={(e) => setNewPackageData({ ...newPackageData, dataBases: parseInt(e.target.value) || 0 })}
                          className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500/20 focus:border-cyan-500"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-bold text-gray-700 mb-1">Lim. Contas FTP</label>
                        <input
                          type="number"
                          value={newPackageData.ftpAccounts}
                          onChange={(e) => setNewPackageData({ ...newPackageData, ftpAccounts: parseInt(e.target.value) || 0 })}
                          className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500/20 focus:border-cyan-500"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-gray-700 mb-1">Domínios Extra</label>
                        <input
                          type="number"
                          value={newPackageData.allowedDomains}
                          onChange={(e) => setNewPackageData({ ...newPackageData, allowedDomains: parseInt(e.target.value) || 0 })}
                          className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500/20 focus:border-cyan-500"
                        />
                      </div>
                    </div>

                  </div>

                  <div className="mt-8 flex justify-end gap-3 pt-4 border-t border-gray-100">
                    <button onClick={() => setShowCreatePackageModal(false)} className="px-5 py-2 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-50 font-medium rounded-lg transition-colors">Cancelar</button>
                    <button
                      onClick={handleCreatePackage}
                      disabled={isSavingPackage || !newPackageData.packageName.trim()}
                      className="px-6 py-2 bg-cyan-600 hover:bg-cyan-700 text-white text-sm font-bold rounded-lg shadow-sm transition-all flex items-center gap-2 disabled:opacity-50"
                    >
                      {isSavingPackage ? (<><RefreshCw className="w-4 h-4 animate-spin" /> Criando...</>) : (<><Package className="w-4 h-4" /> Criar Pacote</>)}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
          {/* Create CyberPanel Website Modal */}
          {showCreateCyberSiteModal && (
            <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
              <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden animate-in fade-in zoom-in duration-200">
                <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
                  <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                    <Globe2 className="w-5 h-5 text-cyan-500" />
                    Novo Website CyberPanel
                  </h2>
                  <button onClick={() => setShowCreateCyberSiteModal(false)} className="text-gray-400 hover:text-gray-600 transition-colors p-1 hover:bg-gray-100 rounded-full">
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <div className="p-6">
                  {error && (
                    <div className="mb-4 p-3 bg-red-50 border border-red-100 text-red-600 text-xs rounded-md">
                      {error}
                    </div>
                  )}

                  <div className="space-y-4">
                    <div>
                      <label className="block text-xs font-bold text-gray-700 mb-1">Domínio</label>
                      <input
                        type="text"
                        value={newCyberSiteData.domainName}
                        onChange={(e) => setNewCyberSiteData({ ...newCyberSiteData, domainName: e.target.value })}
                        placeholder="exemplo.com"
                        className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500/20 focus:border-cyan-500"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-gray-700 mb-1">Email do Administrador</label>
                      <input
                        type="email"
                        value={newCyberSiteData.adminEmail}
                        onChange={(e) => setNewCyberSiteData({ ...newCyberSiteData, adminEmail: e.target.value })}
                        placeholder="admin@exemplo.com"
                        className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500/20 focus:border-cyan-500"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-bold text-gray-700 mb-1">Pacote</label>
                        <select
                          value={newCyberSiteData.packageName}
                          onChange={(e) => setNewCyberSiteData({ ...newCyberSiteData, packageName: e.target.value })}
                          className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500/20 focus:border-cyan-500"
                        >
                          {cyberPanelPackages.length > 0 ? (
                            cyberPanelPackages.map(pkg => (
                              <option key={pkg.packageName} value={pkg.packageName}>{pkg.packageName}</option>
                            ))
                          ) : (
                            <option value="Default">Default</option>
                          )}
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-gray-700 mb-1">Versão PHP</label>
                        <select
                          value={newCyberSiteData.phpSelection}
                          onChange={(e) => setNewCyberSiteData({ ...newCyberSiteData, phpSelection: e.target.value })}
                          className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500/20 focus:border-cyan-500"
                        >
                          <option value="PHP 7.4">PHP 7.4</option>
                          <option value="PHP 8.0">PHP 8.0</option>
                          <option value="PHP 8.1">PHP 8.1</option>
                          <option value="PHP 8.2">PHP 8.2</option>
                          <option value="PHP 8.3">PHP 8.3</option>
                        </select>
                      </div>
                    </div>
                  </div>

                  <div className="mt-8 flex justify-end gap-3 pt-4 border-t border-gray-100">
                    <button onClick={() => setShowCreateCyberSiteModal(false)} className="px-5 py-2 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-50 font-medium rounded-lg transition-colors">Cancelar</button>
                    <button
                      onClick={handleCreateCyberSite}
                      disabled={isSavingCyberSite || !newCyberSiteData.domainName.trim() || !newCyberSiteData.adminEmail.trim()}
                      className="px-6 py-2 bg-cyan-600 hover:bg-cyan-700 text-white text-sm font-bold rounded-lg shadow-sm transition-all flex items-center gap-2 disabled:opacity-50"
                    >
                      {isSavingCyberSite ? (<><RefreshCw className="w-4 h-4 animate-spin" /> Criando...</>) : (<><Globe2 className="w-4 h-4" /> Criar Website</>)}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* 1-Click WP Install Modal */}
          {showWPModal && (
            <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
              <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden animate-in fade-in zoom-in duration-200">
                <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
                  <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                    <svg className="w-5 h-5 text-[#00749C]" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M12.158 12.786l-2.698 7.84c.806.236 1.657.365 2.54.365 1.047 0 2.05-.18 2.986-.51-.024-.037-.046-.078-.065-.123l-2.763-7.572zm5.405-2.835c-.17-.885-.595-1.597-1.146-2.073-.55-.477-1.222-.716-1.956-.716-.145 0-.306.015-.476.046-.17.03-.336.07-.487.123-.153.05-.306.11-.458.17-.152.062-.312.132-.472.215-.245.123-.487.23-.717.323-.23.09-.457.17-.672.23-.213.06-.442.107-.67.14-.23.03-.473.045-.717.045-.64 0-1.19-.107-1.634-.323-.443-.215-.794-.522-1.04-.906-.244-.385-.365-.845-.365-1.37 0-.584.14-1.09.412-1.506.273-.415.655-.74 1.13-1.03.472-.292 1.053-.523 1.725-.693.67-.17 1.436-.26 2.274-.26 1.13 0 2.152.17 3.052.507.9.34 1.677.815 2.316 1.447.64.63 1.122 1.383 1.44 2.244.32.863.487 1.8.487 2.8-.002.585-.05 1.14-.14 1.66zM2.84 12c0-5.06 4.103-9.16 9.16-9.16 1.6 0 3.104.412 4.416 1.14-1.127-1.03-2.67-1.64-4.355-1.64-3.488 0-6.315 2.827-6.315 6.315 0 .205.01.408.03.61-.132.844-.198 1.7-.198 2.57 0 1.25.19 2.45.54 3.58l-1.42 2.03C3.543 15.91 2.84 14.032 2.84 12zm2.096 1.815c.168.966.452 1.898.835 2.78l1.458 3.32c-.524-.486-.98-.99-1.39-1.5-2.074-2.585-3.08-5.34-3.08-8.24m7.222.97l2.872 7.89c.815-.316 1.572-.756 2.26-1.332-1.58.2-3.23-.284-4.46-1.31M12 0C5.372 0 0 5.372 0 12s5.372 12 12 12 12-5.372 12-12S18.628 0 12 0z" />
                    </svg>
                    Instalação Rápida WordPress
                  </h2>
                  <button onClick={() => setShowWPModal(false)} className="text-gray-400 hover:text-gray-600 transition-colors p-1 hover:bg-gray-100 rounded-full">
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <div className="p-6">
                  {error && (
                    <div className="mb-4 p-3 bg-red-50 border border-red-100 text-red-600 text-xs rounded-md">
                      {error}
                    </div>
                  )}

                  <div className="mb-4">
                    <p className="text-sm text-gray-600">
                      Vai instalar o WordPress de forma limpa em: <span className="font-bold text-gray-900">{selectedWPDomain}</span>
                    </p>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <label className="block text-xs font-bold text-gray-700 mb-1">Título do Website</label>
                      <input
                        type="text"
                        value={wpData.title}
                        onChange={(e) => setWpData({ ...wpData, title: e.target.value })}
                        placeholder="Ex: Meu Novo Site"
                        className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#00749C]/20 focus:border-[#00749C]"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-bold text-gray-700 mb-1">Nome de Utilizador</label>
                        <input
                          type="text"
                          value={wpData.user}
                          onChange={(e) => setWpData({ ...wpData, user: e.target.value })}
                          placeholder="admin"
                          className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#00749C]/20 focus:border-[#00749C]"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-gray-700 mb-1">Palavra-passe Segura</label>
                        <input
                          type="text"
                          value={wpData.password}
                          onChange={(e) => setWpData({ ...wpData, password: e.target.value })}
                          placeholder="P@ssw0rd!"
                          className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#00749C]/20 focus:border-[#00749C]"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 pt-4 border-t border-gray-100 space-y-4">
                    <label className="flex items-center gap-3 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={wpInstallLiteSpeed}
                        onChange={(e) => setWpInstallLiteSpeed(e.target.checked)}
                        className="w-4 h-4 accent-green-600 cursor-pointer"
                      />
                      <div>
                        <span className="text-sm font-bold text-gray-800">Instalar LiteSpeed Cache</span>
                        <p className="text-xs text-gray-400">Plugin instalado e activado automaticamente após o WordPress</p>
                      </div>
                    </label>
                    <div className="flex justify-end gap-3">
                      <button onClick={() => setShowWPModal(false)} className="px-5 py-2 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-50 font-medium rounded-lg transition-colors">Cancelar</button>
                      <button
                        onClick={handleInstallWP}
                        disabled={isInstallingWP || !wpData.title.trim() || !wpData.user.trim() || !wpData.password.trim()}
                        className="px-6 py-2 bg-[#00749C] hover:bg-[#005a7a] text-white text-sm font-bold rounded-lg shadow-sm transition-all flex items-center gap-2 disabled:opacity-50"
                      >
                        {isInstallingWP ? (<><RefreshCw className="w-4 h-4 animate-spin" /> Instalando...</>) : (<>Instalar WP</>)}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
          {/* Gerir Contas de E-mail (CyberPanel) */}
          {selectedClientForEmails && showCreateEmailModal && infraActiveTab === 'websites' && (
            <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
              <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full overflow-hidden animate-in fade-in zoom-in duration-200">
                <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
                  <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                    <Mail className="w-5 h-5 text-amber-500" />
                    E-mails do Domínio
                  </h2>
                  <button onClick={() => { setSelectedClientForEmails(null); setShowCreateEmailModal(false); }} className="text-gray-400 hover:text-gray-600 transition-colors p-1 hover:bg-gray-100 rounded-full">
                    <X className="w-5 h-5" />
                  </button>
                </div>
                <div className="p-6 h-[60vh] overflow-y-auto">
                  <div className="bg-amber-50 border border-amber-200 p-4 rounded-xl mb-6 flex items-start gap-4">
                    <div className="flex-1">
                      <h4 className="font-bold text-amber-900 mb-1">Criar Nova Conta</h4>
                      <div className="flex gap-2 items-end">
                        <div className="flex-1">
                          <label className="text-xs font-bold text-gray-500">Endereço</label>
                          <div className="flex bg-white rounded-md border border-gray-300 overflow-hidden mt-1">
                            <input type="text" value={newEmailData.email} onChange={(e) => setNewEmailData({ ...newEmailData, email: e.target.value })} placeholder="geral" className="px-3 py-1.5 flex-1 focus:outline-none text-sm font-medium" />
                            <span className="bg-gray-100 border-l border-gray-300 px-3 py-1.5 text-sm text-gray-500 font-medium">@{selectedClientForEmails.domain}</span>
                          </div>
                        </div>
                        <div className="flex-[0.8]">
                          <label className="text-xs font-bold text-gray-500">Password</label>
                          <input type="password" value={newEmailData.password} onChange={(e) => setNewEmailData({ ...newEmailData, password: e.target.value })} placeholder="******" className="w-full mt-1 px-3 py-1.5 border border-gray-300 rounded-md focus:outline-none text-sm" />
                        </div>
                        <button onClick={() => handleCreateCyberEmail(selectedClientForEmails.domain)} disabled={isSavingEmail} className="bg-amber-600 hover:bg-amber-700 text-white px-4 py-1.5 rounded-md font-bold text-sm transition-colors shadow-sm disabled:opacity-50">
                          {isSavingEmail ? 'Aguarde...' : 'Criar Conta'}
                        </button>
                      </div>
                    </div>
                  </div>

                  <h3 className="font-bold text-gray-800 text-sm mb-3">Contas Ativas</h3>
                  {isFetchingEmails ? (
                    <div className="py-8 text-center text-gray-400 text-sm italic">Carregando as contas...</div>
                  ) : emailAccounts.length === 0 ? (
                    <div className="py-8 text-center text-gray-500 text-sm">Nenhuma conta de email criada neste domínio.</div>
                  ) : (
                    <div className="space-y-2">
                      {emailAccounts.map(account => (
                        <div key={account.email} className="flex items-center justify-between p-3 border border-gray-100 bg-gray-50 rounded-lg hover:border-gray-200 transition-colors">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-white border border-gray-200 flex items-center justify-center text-amber-600 font-bold shadow-sm">
                              {account.user.charAt(0).toUpperCase()}
                            </div>
                            <div>
                              <p className="font-bold text-gray-900 text-sm">{account.email}</p>
                            </div>
                          </div>
                          <button onClick={() => handleDeleteCyberEmail(account.email, selectedClientForEmails.domain)} className="text-red-500 hover:text-red-700 p-2 bg-white rounded-md border border-gray-200 shadow-sm transition-colors">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* CyberPanel Sections */}
          {activeSection === 'cp-subdomains' && <SubdomainsSection sites={cyberPanelSites} />}
          {activeSection === 'cp-list-subdomains' && <ListSubdomainsSection sites={cyberPanelSites} />}
          {activeSection === 'cp-databases' && <DatabasesSection sites={cyberPanelSites} />}
          {activeSection === 'cp-ftp' && <FTPSection sites={cyberPanelSites} />}
          {activeSection === 'cp-modify-website' && <ModifyWebsiteSection sites={cyberPanelSites} packages={cyberPanelPackages} />}
          {activeSection === 'cp-suspend-website' && <SuspendWebsiteSection sites={cyberPanelSites} onRefresh={loadCyberPanelData} />}
          {activeSection === 'cp-delete-website' && <DeleteWebsiteSection sites={cyberPanelSites} onRefresh={loadCyberPanelData} />}
          {activeSection === 'cp-email-mgmt' && <EmailManagementSection sites={cyberPanelSites} />}
          {activeSection === 'cp-email-delete' && <EmailDeleteSection sites={cyberPanelSites} />}
          {activeSection === 'cp-email-limits' && <EmailLimitsSection sites={cyberPanelSites} />}
          {activeSection === 'cp-email-forwarding' && <EmailForwardingSection sites={cyberPanelSites} />}
          {activeSection === 'cp-email-catchall' && <CatchAllEmailSection sites={cyberPanelSites} />}
          {activeSection === 'cp-email-pattern-fwd' && <PatternForwardingSection sites={cyberPanelSites} />}
          {activeSection === 'cp-email-plus-addr' && <PlusAddressingSection sites={cyberPanelSites} />}
          {activeSection === 'cp-email-change-pass' && <EmailChangePasswordSection sites={cyberPanelSites} />}
          {activeSection === 'cp-email-dkim' && <DKIMManagerSection sites={cyberPanelSites} />}
          {activeSection === 'cp-users' && <CPUsersSection />}
          {activeSection === 'cp-reseller' && <ResellerSection />}
          {activeSection === 'cp-php' && <PHPConfigSection sites={cyberPanelSites} />}
          {activeSection === 'cp-security' && <SecuritySection sites={cyberPanelSites} />}
          {activeSection === 'cp-ssl' && <SSLSection sites={cyberPanelSites} />}
          {activeSection === 'cp-api' && <APIConfigSection />}
          {activeSection === 'cp-wp-list' && <WPListSection sites={cyberPanelSites} />}
          {activeSection === 'cp-wp-plugins' && <WPPluginsSection sites={cyberPanelSites} />}
          {activeSection === 'cp-wp-restore-backup' && <WPRestoreBackupSection sites={cyberPanelSites} />}
          {activeSection === 'cp-wp-remote-backup' && <WPRemoteBackupSection sites={cyberPanelSites} />}
          {activeSection === 'cp-dns-nameserver' && <DNSNameserverSection sites={cyberPanelSites} />}
          {activeSection === 'cp-dns-default-ns' && <DNSDefaultNSSection />}
          {activeSection === 'cp-dns-create-zone' && <DNSCreateZoneSection sites={cyberPanelSites} />}
          {activeSection === 'cp-dns-delete-zone' && <DNSDeleteZoneSection sites={cyberPanelSites} />}
          {activeSection === 'cp-dns-cloudflare' && <CloudFlareSection sites={cyberPanelSites} />}
          {activeSection === 'cp-dns-reset' && <DNSResetSection sites={cyberPanelSites} />}

          {/* DNS Manager Modal */}
          {selectedDnsDomain && (
            <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
              <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full overflow-hidden animate-in fade-in zoom-in duration-200 flex flex-col h-[85vh]">
                <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
                  <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                    <Server className="w-5 h-5 text-purple-600" />
                    Gestor de Registos DNS <span className="text-gray-400 font-normal">({selectedDnsDomain})</span>
                  </h2>
                  <button onClick={() => { setSelectedDnsDomain(''); setDnsRecords([]); }} className="text-gray-400 hover:text-gray-600 transition-colors p-1 hover:bg-gray-100 rounded-full">
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <div className="flex-1 overflow-hidden flex flex-col p-6 gap-6">
                  <div className="bg-purple-50 border border-purple-200 p-4 rounded-xl flex items-end gap-3 flex-wrap">
                    <div className="flex-1 min-w-[150px]">
                      <label className="text-xs font-bold text-gray-600 uppercase">Nome (ex: @ ou _dmarc)</label>
                      <input type="text" value={dnsFormData.name} onChange={(e) => setDnsFormData({ ...dnsFormData, name: e.target.value })} className="w-full mt-1.5 px-3 py-2 rounded border border-gray-300 focus:outline-none text-sm" placeholder="ex: @" />
                    </div>
                    <div className="w-32">
                      <label className="text-xs font-bold text-gray-600 uppercase">Tipo</label>
                      <select value={dnsFormData.recordType} onChange={(e) => setDnsFormData({ ...dnsFormData, recordType: e.target.value })} className="w-full mt-1.5 px-3 py-2 rounded border border-gray-300 focus:outline-none text-sm font-bold bg-white">
                        <option value="A">A Record</option>
                        <option value="TXT">TXT Record</option>
                        <option value="CNAME">CNAME Record</option>
                        <option value="MX">MX Record</option>
                      </select>
                    </div>
                    <div className="flex-[2] min-w-[200px]">
                      <label className="text-xs font-bold text-gray-600 uppercase">Valor (IP ou Texto)</label>
                      <input type="text" value={dnsFormData.value} onChange={(e) => setDnsFormData({ ...dnsFormData, value: e.target.value })} className="w-full mt-1.5 px-3 py-2 rounded border border-gray-300 focus:outline-none text-sm font-mono" placeholder="ex: 109.199.104.22" />
                    </div>
                    <div className="w-24">
                      <label className="text-xs font-bold text-gray-600 uppercase">TTL</label>
                      <input type="text" value={dnsFormData.ttl} onChange={(e) => setDnsFormData({ ...dnsFormData, ttl: e.target.value })} className="w-full mt-1.5 px-3 py-2 rounded border border-gray-300 focus:outline-none text-sm font-mono" placeholder="3600" />
                    </div>
                    <button onClick={handleCreateDnsRecord} disabled={isSavingDns} className="bg-black hover:bg-red-600 text-white px-5 py-2 rounded shadow-sm text-sm font-bold transition-colors disabled:opacity-50">
                      {isSavingDns ? 'Aguarde...' : 'Criar Registo'}
                    </button>
                  </div>

                  <div className="flex-1 border border-gray-200 rounded-xl overflow-y-auto bg-white shadow-sm relative">
                    {isFetchingDns ? (
                      <div className="flex h-full items-center justify-center text-gray-400">
                        <RefreshCw className="w-8 h-8 animate-spin text-purple-400" />
                      </div>
                    ) : (
                      <table className="w-full text-sm">
                        <thead className="bg-gray-50 border-b border-gray-200 sticky top-0 z-10">
                          <tr className="text-left text-xs font-bold text-gray-500 uppercase">
                            <th className="px-6 py-3">Tipo</th>
                            <th className="px-6 py-3">Nome</th>
                            <th className="px-6 py-3">Valor / Apontamento</th>
                            <th className="px-6 py-3 w-20 text-center">TTL</th>
                            <th className="px-6 py-3 text-right">Ação</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                          {dnsRecords.map((rec) => (
                            <tr key={rec.id} className="hover:bg-gray-50 transition-colors">
                              <td className="px-6 py-3 font-bold text-purple-700">{rec.type}</td>
                              <td className="px-6 py-3 font-medium text-gray-900">{rec.name}</td>
                              <td className="px-6 py-3 font-mono text-gray-600 break-all max-w-sm">{rec.content}</td>
                              <td className="px-6 py-3 text-center text-gray-400 text-xs">{rec.ttl}</td>
                              <td className="px-6 py-3 text-right">
                                <button onClick={() => handleDeleteDnsRecord(rec.id)} className="text-red-400 hover:text-red-600 p-1 bg-white hover:bg-red-50 border border-gray-200 rounded shadow-sm transition-colors">
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default function AdminPage() {
  return (
    <I18nProvider>
      <AdminPanelContent />
    </I18nProvider>
  )
}
