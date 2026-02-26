'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { 
  Globe, Database, User, Mail, Lock, Eye, EyeOff, 
  Server, FolderOpen, CheckCircle, AlertCircle, RefreshCw
} from 'lucide-react'

interface CyberPanelWebsite {
  domain: string
  state: string
  admin_user: string
  php_version: string
  package: string
  ip_address: string
}

export default function WordPressInstallPage() {
  const [loading, setLoading] = useState(false)
  const [sites, setSites] = useState<CyberPanelWebsite[]>([])
  const [showPassword, setShowPassword] = useState(false)
  const [showDbPassword, setShowDbPassword] = useState(false)
  const [passwordStrength, setPasswordStrength] = useState<'weak' | 'medium' | 'strong'>('weak')
  const [installing, setInstalling] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null)

  const [formData, setFormData] = useState({
    protocol: 'https://',
    domain: '',
    directory: '',
    version: '6.7.1',
    siteName: '',
    siteDescription: '',
    enableMultisite: false,
    disableCron: false,
    adminUsername: 'admin',
    adminPassword: '',
    adminEmail: '',
    databaseName: '',
    databaseUser: '',
    databasePassword: ''
  })

  useEffect(() => {
    loadSites()
  }, [])

  const loadSites = async () => {
    try {
      const response = await fetch('/api/cyberpanel-db?type=websites')
      const data = await response.json()
      if (data.success) {
        setSites(data.data || [])
        if (data.data && data.data.length > 0) {
          setFormData(prev => ({ 
            ...prev, 
            domain: data.data[0].domain,
            databaseName: `${data.data[0].domain.replace(/\./g, '_')}_wp`,
            databaseUser: `${data.data[0].domain.replace(/\./g, '_')}_wpuser`
          }))
        }
      }
    } catch (error) {
      console.error('Erro ao carregar sites:', error)
    }
  }

  const checkPasswordStrength = (password: string) => {
    if (password.length < 8) return 'weak'
    if (password.length < 12 || !/[A-Z]/.test(password) || !/[0-9]/.test(password)) return 'medium'
    return 'strong'
  }

  const handlePasswordChange = (password: string) => {
    setFormData(prev => ({ ...prev, adminPassword: password }))
    setPasswordStrength(checkPasswordStrength(password))
  }

  const getFinalUrl = () => {
    const { protocol, domain, directory } = formData
    let url = `${protocol}${domain}`
    if (directory) {
      url += `/${directory.replace(/^\/+/, '')}`
    }
    return url
  }

  const handleInstall = async () => {
    setInstalling(true)
    setMessage(null)

    try {
      const response = await fetch('/api/cyberpanel-db', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'installWordPress',
          ...formData
        })
      })

      const data = await response.json()
      
      if (data.success) {
        setMessage({
          type: 'success',
          text: `WordPress instalado com sucesso! Acesse o painel em: ${getFinalUrl()}/wp-admin`
        })
      } else {
        setMessage({
          type: 'error',
          text: data.error || 'Erro ao instalar WordPress'
        })
      }
    } catch (error) {
      setMessage({
        type: 'error',
        text: 'Erro de conexão com o servidor'
      })
    } finally {
      setInstalling(false)
    }
  }

  const getPasswordStrengthColor = () => {
    switch (passwordStrength) {
      case 'weak': return 'text-red-500'
      case 'medium': return 'text-yellow-500'
      case 'strong': return 'text-green-500'
      default: return 'text-gray-500'
    }
  }

  const getPasswordStrengthText = () => {
    switch (passwordStrength) {
      case 'weak': return 'Fraca'
      case 'medium': return 'Média'
      case 'strong': return 'Forte'
      default: return ''
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-6">
      <div className="max-w-6xl mx-auto">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Instalar WordPress</h1>
          <p className="text-gray-600">Configure e instale o WordPress em seu domínio</p>
        </div>

        {message && (
          <div className={`mb-6 p-4 rounded-lg flex items-center gap-3 ${
            message.type === 'success' 
              ? 'bg-green-50 text-green-700 border border-green-200' 
              : 'bg-red-50 text-red-700 border border-red-200'
          }`}>
            {message.type === 'success' ? <CheckCircle className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
            {message.text}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* SECÇÃO 1 — Configuração do Software */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200">
            <div className="border-b border-gray-200 p-4">
              <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                <Server className="w-5 h-5 text-blue-600" />
                Configuração do Software
              </h2>
            </div>
            <div className="p-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Protocolo</label>
                <select 
                  value={formData.protocol}
                  onChange={(e) => setFormData(prev => ({ ...prev, protocol: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="https://">https://</option>
                  <option value="http://">http://</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Domínio</label>
                <select 
                  value={formData.domain}
                  onChange={(e) => {
                    const domain = e.target.value
                    setFormData(prev => ({ 
                      ...prev, 
                      domain,
                      databaseName: `${domain.replace(/\./g, '_')}_wp`,
                      databaseUser: `${domain.replace(/\./g, '_')}_wpuser`
                    }))
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">Selecione um domínio</option>
                  {sites.map((site) => (
                    <option key={site.domain} value={site.domain}>{site.domain}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Diretório (opcional)</label>
                <input 
                  type="text"
                  value={formData.directory}
                  onChange={(e) => setFormData(prev => ({ ...prev, directory: e.target.value }))}
                  placeholder="Deixe vazio para instalar na raiz"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Versão do WordPress</label>
                <select 
                  value={formData.version}
                  onChange={(e) => setFormData(prev => ({ ...prev, version: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="6.7.1">6.7.1 (Mais recente)</option>
                  <option value="6.6.2">6.6.2</option>
                  <option value="6.5.5">6.5.5</option>
                  <option value="6.4.3">6.4.3</option>
                </select>
              </div>

              <div className="p-3 bg-blue-50 rounded-lg">
                <label className="block text-sm font-medium text-gray-700 mb-1">URL Final da Instalação</label>
                <div className="flex items-center gap-2">
                  <Globe className="w-4 h-4 text-blue-600" />
                  <span className="text-sm font-mono text-blue-700">{getFinalUrl()}</span>
                </div>
              </div>
            </div>
          </div>

          {/* SECÇÃO 2 — Configurações do Site */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200">
            <div className="border-b border-gray-200 p-4">
              <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                <Globe className="w-5 h-5 text-blue-600" />
                Configurações do Site
              </h2>
            </div>
            <div className="p-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nome do Site</label>
                <input 
                  type="text"
                  value={formData.siteName}
                  onChange={(e) => setFormData(prev => ({ ...prev, siteName: e.target.value }))}
                  placeholder="My Blog"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Descrição do Site</label>
                <textarea 
                  value={formData.siteDescription}
                  onChange={(e) => setFormData(prev => ({ ...prev, siteDescription: e.target.value }))}
                  placeholder="My WordPress Blog"
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              <div className="space-y-3">
                <label className="flex items-center gap-3 cursor-pointer">
                  <input 
                    type="checkbox"
                    checked={formData.enableMultisite}
                    onChange={(e) => setFormData(prev => ({ ...prev, enableMultisite: e.target.checked }))}
                    className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                  />
                  <span className="text-sm text-gray-700">Ativar Multisite (WPMU)</span>
                </label>

                <label className="flex items-center gap-3 cursor-pointer">
                  <input 
                    type="checkbox"
                    checked={formData.disableCron}
                    onChange={(e) => setFormData(prev => ({ ...prev, disableCron: e.target.checked }))}
                    className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                  />
                  <span className="text-sm text-gray-700">Desativar WordPress Cron</span>
                </label>
              </div>
            </div>
          </div>

          {/* SECÇÃO 3 — Conta de Admin WordPress */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200">
            <div className="border-b border-gray-200 p-4">
              <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                <User className="w-5 h-5 text-blue-600" />
                Conta de Admin WordPress
              </h2>
            </div>
            <div className="p-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nome de Utilizador do Admin</label>
                <input 
                  type="text"
                  value={formData.adminUsername}
                  onChange={(e) => setFormData(prev => ({ ...prev, adminUsername: e.target.value }))}
                  placeholder="admin"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Senha do Admin</label>
                <div className="relative">
                  <input 
                    type={showPassword ? "text" : "password"}
                    value={formData.adminPassword}
                    onChange={(e) => handlePasswordChange(e.target.value)}
                    className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                  <button 
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                {formData.adminPassword && (
                  <div className={`text-xs mt-1 ${getPasswordStrengthColor()}`}>
                    Força da senha: {getPasswordStrengthText()}
                  </div>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email do Admin</label>
                <input 
                  type="email"
                  value={formData.adminEmail}
                  onChange={(e) => setFormData(prev => ({ ...prev, adminEmail: e.target.value }))}
                  placeholder="admin@example.com"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>
          </div>

          {/* SECÇÃO 4 — Base de Dados */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200">
            <div className="border-b border-gray-200 p-4">
              <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                <Database className="w-5 h-5 text-blue-600" />
                Base de Dados
              </h2>
            </div>
            <div className="p-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nome da Base de Dados</label>
                <input 
                  type="text"
                  value={formData.databaseName}
                  onChange={(e) => setFormData(prev => ({ ...prev, databaseName: e.target.value }))}
                  placeholder="visualdesign_wp"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Utilizador da Base de Dados</label>
                <input 
                  type="text"
                  value={formData.databaseUser}
                  onChange={(e) => setFormData(prev => ({ ...prev, databaseUser: e.target.value }))}
                  placeholder="visualdesign_wpuser"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Senha da Base de Dados</label>
                <div className="relative">
                  <input 
                    type={showDbPassword ? "text" : "password"}
                    value={formData.databasePassword}
                    onChange={(e) => setFormData(prev => ({ ...prev, databasePassword: e.target.value }))}
                    className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                  <button 
                    type="button"
                    onClick={() => setShowDbPassword(!showDbPassword)}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    {showDbPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg">
                <div className="flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 text-amber-600 mt-0.5" />
                  <div className="text-xs text-amber-700">
                    <strong>Nota:</strong> A base de dados e o utilizador serão criados automaticamente no servidor.
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* BOTÃO INSTALAR */}
        <div className="mt-8 flex justify-center">
          <button
            onClick={handleInstall}
            disabled={installing || !formData.domain || !formData.adminPassword || !formData.adminEmail}
            className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white px-8 py-3 rounded-lg font-semibold transition-colors flex items-center gap-3 disabled:cursor-not-allowed"
          >
            {installing ? (
              <>
                <RefreshCw className="w-5 h-5 animate-spin" />
                Instalando WordPress...
              </>
            ) : (
              <>
                <Server className="w-5 h-5" />
                Instalar WordPress
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}
