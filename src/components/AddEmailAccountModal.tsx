'use client'

import { useState, useEffect } from 'react'
import { X, Mail } from 'lucide-react'
import { detectDomainConfig } from '@/lib/email-autoconfig'

interface AddEmailAccountModalProps {
  isOpen: boolean
  onClose: () => void
  onAccountAdded: (account: {
    email: string
    nome: string
    tipo: 'webmail'
    password?: string
    servidor?: string
    porta?: string
    smtp?: string
    smtpPorta?: string
  }) => void
  clienteId?: string
}

export function AddEmailAccountModal({ isOpen, onClose, onAccountAdded, clienteId }: AddEmailAccountModalProps) {
  const [loading, setLoading] = useState(false)
  const [erro, setErro] = useState<string | null>(null)
  const [showAdvanced, setShowAdvanced] = useState(false)

  const [formData, setFormData] = useState({
    nome: '',
    email: '',
    password: '',
    servidor: '',
    porta: '993',
    smtp: '',
    smtpPorta: '587',
    assinatura: ''
  })

  // Reset quando abre
  useEffect(() => {
    if (isOpen) {
      setFormData({
        nome: '',
        email: '',
        password: '',
        servidor: '',
        porta: '993',
        smtp: '',
        smtpPorta: '587',
        assinatura: ''
      })
      setShowAdvanced(false)
      setErro(null)
    }
  }, [isOpen])

  // Auto-detect config quando email muda
  useEffect(() => {
    if (formData.email && formData.email.includes('@')) {
      const config = detectDomainConfig(formData.email)
      if (config) {
        setFormData(prev => ({
          ...prev,
          servidor: config.imap,
          porta: config.ports.imap.toString(),
          smtp: config.smtp,
          smtpPorta: config.ports.smtp.toString()
        }))
      }
    }
  }, [formData.email])

  const handleSubmitWebmail = async () => {
    if (!formData.email || !formData.password) return

    setLoading(true)
    setErro(null)
    try {
      // PUT valida a ligação IMAP com o servidor antes de gravar a conta.
      const res = await fetch('/api/email-contas', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: formData.email,
          password: formData.password,
          nome: formData.nome,
          tipo: 'webmail',
          cliente_id: clienteId
        })
      })

      const data = await res.json()
      if (data.success) {
        onAccountAdded({
          email: formData.email,
          nome: formData.nome || formData.email.split('@')[0],
          tipo: 'webmail',
          password: formData.password,
          servidor: formData.servidor,
          porta: formData.porta,
          smtp: formData.smtp,
          smtpPorta: formData.smtpPorta
        })
        onClose()
      } else {
        setErro(data.error || data.details || 'Erro desconhecido ao sincronizar a conta.')
      }
    } catch (error: any) {
      setErro(error.message || 'Erro ao sincronizar conta.')
    }
    setLoading(false)
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-green-600 rounded-lg flex items-center justify-center">
              <Mail className="w-5 h-5 text-white" />
            </div>
            <h2 className="text-xl font-bold text-gray-900">Adicionar Conta de Email</h2>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Nome Completo</label>
              <input
                type="text"
                value={formData.nome}
                onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                placeholder="Seu nome"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email *</label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="seu@email.com"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Palavra-passe *</label>
              <input
                type="password"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                placeholder="••••••••"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
              />
            </div>

            {/* Configurações Avançadas */}
            <div className="pt-2">
              <button
                onClick={() => setShowAdvanced(!showAdvanced)}
                className="text-sm text-gray-500 hover:text-gray-700 flex items-center gap-1"
              >
                {showAdvanced ? 'Ocultar' : 'Mostrar'} configurações avançadas
              </button>

              {showAdvanced && (
                <div className="mt-3 p-4 bg-gray-50 rounded-xl border border-gray-200 grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-bold text-gray-400 uppercase block mb-1">Servidor IMAP</label>
                    <input
                      type="text"
                      value={formData.servidor}
                      onChange={(e) => setFormData({ ...formData, servidor: e.target.value })}
                      className="w-full bg-white border border-gray-200 text-gray-700 text-xs px-3 py-2 rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-gray-400 uppercase block mb-1">Porta IMAP</label>
                    <input
                      type="text"
                      value={formData.porta}
                      onChange={(e) => setFormData({ ...formData, porta: e.target.value })}
                      className="w-full bg-white border border-gray-200 text-gray-700 text-xs px-3 py-2 rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-gray-400 uppercase block mb-1">Servidor SMTP</label>
                    <input
                      type="text"
                      value={formData.smtp}
                      onChange={(e) => setFormData({ ...formData, smtp: e.target.value })}
                      className="w-full bg-white border border-gray-200 text-gray-700 text-xs px-3 py-2 rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-gray-400 uppercase block mb-1">Porta SMTP</label>
                    <input
                      type="text"
                      value={formData.smtpPorta}
                      onChange={(e) => setFormData({ ...formData, smtpPorta: e.target.value })}
                      className="w-full bg-white border border-gray-200 text-gray-700 text-xs px-3 py-2 rounded-lg"
                    />
                  </div>
                </div>
              )}
            </div>

            {erro && (
              <div className="bg-red-50 border-l-4 border-red-400 rounded-lg p-3">
                <p className="text-xs text-red-700 font-bold mb-1 uppercase">Erro</p>
                <p className="text-xs text-red-600">{erro}</p>
              </div>
            )}

            <div className="bg-blue-50 border-l-4 border-blue-400 rounded-lg p-3 mt-4">
              <p className="text-xs text-blue-700 font-bold mb-1 uppercase">Suporte VisualDesigne:</p>
              <p className="text-xs text-blue-600">
                Detectamos automaticamente as configurações de domínio. Preencha o email e palavra-passe — a
                ligação é testada antes de guardar.
              </p>
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-end pt-6">
            <button
              onClick={handleSubmitWebmail}
              disabled={!formData.email || !formData.password || loading}
              className="px-5 py-2 rounded-lg bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white text-sm font-bold flex items-center gap-2 transition-all"
            >
              {loading ? '⏳ A verificar e sincronizar...' : 'Adicionar e Sincronizar'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
