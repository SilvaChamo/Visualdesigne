'use client'

import { useState, useEffect } from 'react'
import {
  Bell,
  Send,
  Users,
  AlertTriangle,
  CheckCircle,
  Info,
  X,
  Trash2,
  RefreshCw,
  Mail,
  Eye
} from 'lucide-react'
import { panelTabList, panelTabBtn } from '@/lib/panel-ui'
import { Spinner } from '@/components/ui/spinner'
import { buildSimpleNotificationEmailHtml } from '@/lib/renewal-templates'
import { NotificationRichEditor } from './NotificationRichEditor'

/** Extrai texto simples de HTML — usado para o título automático, o texto
 * guardado na base de dados (mostrado tal qual, sem HTML, no sino de
 * notificações do cliente) e a validação de campo vazio. */
function htmlToPlainText(html: string): string {
  if (typeof window === 'undefined') return html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()
  const container = document.createElement('div')
  container.innerHTML = html
  return (container.textContent || '').replace(/\s+/g, ' ').trim()
}

function deriveTitle(plainText: string): string {
  if (!plainText) return 'Notificação'
  return plainText.length > 60 ? `${plainText.slice(0, 57)}...` : plainText
}

interface Notification {
  id: string
  title: string
  message: string
  type: 'info' | 'success' | 'warning' | 'error'
  category: string
  read: boolean
  user_id: string
  created_at: string
  email_sent: boolean
}

type NotificationsTab = 'send' | 'list'

export function NotificationsSection({
  defaultTab = 'list',
  filterCategory,
}: { defaultTab?: NotificationsTab; filterCategory?: string } = {}) {
  const [messageHtml, setMessageHtml] = useState('')
  const [type, setType] = useState<'info' | 'success' | 'warning' | 'error'>('info')
  const [category, setCategory] = useState('general')
  const [sendEmail, setSendEmail] = useState(false)
  const [sendToAll, setSendToAll] = useState(true)
  const [userEmail, setUserEmail] = useState('')
  const [link, setLink] = useState('')
  const [linkText, setLinkText] = useState('')
  
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [stats, setStats] = useState({ total: 0, unread: 0, emailSent: 0 })
  const [loading, setLoading] = useState(false)
  const [sending, setSending] = useState(false)
  const [activeTab, setActiveTab] = useState<NotificationsTab>(defaultTab)

  const fetchNotifications = async () => {
    setLoading(true)
    try {
      const url = filterCategory
        ? `/api/notifications/admin?category=${encodeURIComponent(filterCategory)}`
        : '/api/notifications/admin'
      const res = await fetch(url)
      const data = await res.json()

      if (data.success) {
        setNotifications(data.notifications)
        setStats(data.stats)
      }
    } catch (error) {
      console.error('Erro ao buscar notificações:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (activeTab === 'list') {
      fetchNotifications()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, filterCategory])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    const plainText = htmlToPlainText(messageHtml)
    if (!plainText) return
    const title = deriveTitle(plainText)

    const recipientDesc = sendToAll ? 'TODOS os clientes' : userEmail || 'o utilizador indicado'
    if (!confirm(`Confirma o envio desta notificação para ${recipientDesc}?`)) return

    setSending(true)

    try {
      const payload: any = {
        title,
        message: plainText,
        messageHtml,
        type,
        category,
        sendEmail,
        sendToAll,
        link: link || undefined,
        linkText: linkText || undefined
      }

      if (!sendToAll && userEmail) {
        // Buscar user ID pelo email
        const resUser = await fetch(`/api/users/search?email=${encodeURIComponent(userEmail)}`)
        const userData = await resUser.json()
        
        if (!userData.user) {
          alert('Usuário não encontrado')
          setSending(false)
          return
        }
        
        payload.userId = userData.user.id
      }

      const res = await fetch('/api/notifications/admin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })

      const data = await res.json()

      if (data.success) {
        const emailSummary = sendEmail
          ? (sendToAll
              ? `\n📧 Emails: ${data.emailsSent} enviados${data.emailsFailed ? `, ${data.emailsFailed} falharam` : ''}`
              : `\n📧 Email: ${data.emailSent ? 'enviado' : `falhou (${data.emailError || 'erro desconhecido'})`}`)
          : ''
        alert(`✅ Notificação enviada com sucesso!\n${sendToAll ? `Enviado para ${data.count} usuários` : 'Enviado para 1 usuário'}${emailSummary}`)

        // Limpar formulário
        setMessageHtml('')
        setUserEmail('')
        setLink('')
        setLinkText('')
        setSendEmail(false)
      } else {
        alert('❌ Erro: ' + data.error)
      }
    } catch (error) {
      console.error('Erro ao enviar:', error)
      alert('❌ Erro ao enviar notificação')
    } finally {
      setSending(false)
    }
  }

  const markAsRead = async (id: string) => {
    const target = notifications.find(n => n.id === id)
    if (!target || target.read) return

    setNotifications(prev => prev.map(n => (n.id === id ? { ...n, read: true } : n)))
    setStats(prev => ({ ...prev, unread: Math.max(0, prev.unread - 1) }))

    try {
      await fetch('/api/notifications/admin', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id })
      })
    } catch (error) {
      console.error('Erro ao marcar como lida:', error)
    }
  }

  const deleteNotification = async (id: string) => {
    if (!confirm('Tem certeza que deseja deletar esta notificação?')) return

    try {
      const res = await fetch('/api/notifications/admin', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id })
      })

      if (res.ok) {
        setNotifications(prev => prev.filter(n => n.id !== id))
        alert('✅ Notificação deletada')
      }
    } catch (error) {
      console.error('Erro ao deletar:', error)
    }
  }

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'success': return <CheckCircle className="w-4 h-4 text-green-500" />
      case 'warning': return <AlertTriangle className="w-4 h-4 text-yellow-500" />
      case 'error': return <X className="w-4 h-4 text-red-500" />
      default: return <Info className="w-4 h-4 text-blue-500" />
    }
  }

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'success': return 'bg-green-100 text-green-800 border-green-200'
      case 'warning': return 'bg-yellow-100 text-yellow-800 border-yellow-200'
      case 'error': return 'bg-red-100 text-red-800 border-red-200'
      default: return 'bg-blue-100 text-blue-800 border-blue-200'
    }
  }

  const previewPlainText = htmlToPlainText(messageHtml)
  const previewTitle = deriveTitle(previewPlainText)
  const previewClientName =
    !sendToAll && userEmail.trim()
      ? (userEmail.includes('@') ? userEmail.split('@')[0] : userEmail.trim())
      : 'Cliente'

  return (
    <div className="space-y-6">
      {/* Tabs */}
      <div className={panelTabList}>
        <button
          onClick={() => setActiveTab('list')}
          className={`${panelTabBtn} flex items-center gap-2 ${
            activeTab === 'list'
              ? 'border-b-gray-700 text-gray-900'
              : 'text-gray-600 hover:text-gray-800'
          }`}
        >
          <Bell className="w-4 h-4" />
          Histórico
          <span className="px-2 py-0.5 bg-gray-100 text-gray-600 text-xs rounded-full">
            {stats.total}
          </span>
        </button>
        <button
          onClick={() => setActiveTab('send')}
          className={`${panelTabBtn} flex items-center gap-2 ${
            activeTab === 'send'
              ? 'border-b-gray-700 text-gray-900'
              : 'text-gray-600 hover:text-gray-800'
          }`}
        >
          <Send className="w-4 h-4" />
          Enviar Notificação
        </button>
      </div>

      {/* Tab: Enviar */}
      {activeTab === 'send' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-3 bg-blue-100 rounded-lg">
              <Send className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Enviar Notificação</h3>
              <p className="text-sm text-gray-500">Envie notificações para clientes específicos ou para todos</p>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Destinatário */}
            <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
              <label className="block text-sm font-medium text-gray-700 mb-3">Destinatário</label>
              <div className="flex gap-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    checked={sendToAll}
                    onChange={() => setSendToAll(true)}
                    className="w-4 h-4 text-blue-600"
                  />
                  <span className="text-sm text-gray-700">Todos os clientes</span>
                  <Users className="w-4 h-4 text-gray-400" />
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    checked={!sendToAll}
                    onChange={() => setSendToAll(false)}
                    className="w-4 h-4 text-blue-600"
                  />
                  <span className="text-sm text-gray-700">Cliente específico</span>
                </label>
              </div>

              {!sendToAll && (
                <div className="mt-3">
                  <input
                    type="email"
                    value={userEmail}
                    onChange={(e) => setUserEmail(e.target.value)}
                    placeholder="email@cliente.com"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                    required={!sendToAll}
                  />
                </div>
              )}
            </div>

            {/* Mensagem — mesmo editor completo (formatação, cores, links) dos
                Templates de Renovação, sem o campo de Título separado: o título
                mostrado no sino de notificações é gerado automaticamente a
                partir do texto escrito aqui. */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Mensagem</label>
              <NotificationRichEditor value={messageHtml} onChange={setMessageHtml} />
            </div>

            {/* Tipo e Categoria */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Tipo</label>
                <select
                  value={type}
                  onChange={(e) => setType(e.target.value as any)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                >
                  <option value="info">ℹ️ Informativo</option>
                  <option value="success">✅ Sucesso</option>
                  <option value="warning">⚠️ Aviso</option>
                  <option value="error">❌ Erro</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Categoria</label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                >
                  <option value="general">Geral</option>
                  <option value="email">Email</option>
                  <option value="domain">Domínio</option>
                  <option value="payment">Pagamento</option>
                  <option value="support">Suporte</option>
                  <option value="system">Sistema</option>
                </select>
              </div>
            </div>

            {/* Link opcional */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Link (opcional)</label>
                <input
                  type="url"
                  value={link}
                  onChange={(e) => setLink(e.target.value)}
                  placeholder="https://..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Texto do Link</label>
                <input
                  type="text"
                  value={linkText}
                  onChange={(e) => setLinkText(e.target.value)}
                  placeholder="Ver detalhes"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                />
              </div>
            </div>

            {/* Opções */}
            <div className="flex items-center gap-2 p-3 bg-yellow-50 rounded-lg border border-yellow-200">
              <input
                type="checkbox"
                id="sendEmail"
                checked={sendEmail}
                onChange={(e) => setSendEmail(e.target.checked)}
                className="w-4 h-4 text-yellow-600"
              />
              <label htmlFor="sendEmail" className="flex items-center gap-2 text-sm text-yellow-800 cursor-pointer">
                <Mail className="w-4 h-4" />
                Também enviar por email
              </label>
            </div>

            {/* Preview */}
            {previewPlainText && (
              <div className={`p-4 rounded-lg border ${getTypeColor(type)}`}>
                <div className="flex items-start gap-3">
                  {getTypeIcon(type)}
                  <div>
                    <p className="font-medium">{previewTitle}</p>
                    <p className="text-sm mt-1 opacity-90">{previewPlainText}</p>
                    {link && (
                      <p className="text-sm mt-2 underline">{linkText || 'Ver mais'}</p>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Botão Enviar */}
            <button
              type="submit"
              disabled={sending || !previewPlainText}
              className="w-full py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {sending ? (
                <>
                  <Spinner className="w-5 h-5" />
                  Enviando...
                </>
              ) : (
                <>
                  <Send className="w-5 h-5" />
                  {sendToAll ? 'Enviar para Todos' : 'Enviar Notificação'}
                </>
              )}
            </button>
          </form>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
          <h4 className="font-medium text-gray-900 flex items-center gap-2 mb-4">
            <Eye className="w-5 h-5" />
            Preview ao Vivo
          </h4>
          <div className="border border-gray-200 rounded overflow-hidden">
            <div
              dangerouslySetInnerHTML={{
                __html: buildSimpleNotificationEmailHtml({
                  clientName: previewClientName,
                  title: previewPlainText ? previewTitle : '',
                  message: previewPlainText || 'A mensagem que escreveres aqui aparece assim no email.',
                  messageHtml: messageHtml || undefined,
                  link: link || undefined,
                  linkText: linkText || undefined,
                  type,
                }),
              }}
            />
          </div>
        </div>
        </div>
      )}

      {/* Tab: Listar */}
      {activeTab === 'list' && (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-purple-100 rounded-lg">
                <Bell className="w-6 h-6 text-purple-600" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Histórico de Notificações</h3>
                <p className="text-sm text-gray-500">Total: {stats.total} | Não lidas: {stats.unread} | Emails: {stats.emailSent}</p>
              </div>
            </div>
            <button
              onClick={fetchNotifications}
              disabled={loading}
              className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
            >
              {loading ? <Spinner className="w-5 h-5" /> : <RefreshCw className="w-5 h-5" />}
            </button>
          </div>

          {notifications.length === 0 ? (
            <div className="text-center py-12">
              <Bell className="w-16 h-16 text-gray-200 mx-auto mb-4" />
              <p className="text-gray-500">Nenhuma notificação enviada ainda</p>
            </div>
          ) : (
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {notifications.map((notification) => (
                <div
                  key={notification.id}
                  onClick={() => markAsRead(notification.id)}
                  className={`p-4 rounded-lg border cursor-pointer ${getTypeColor(notification.type)} ${
                    notification.read ? 'opacity-75' : ''
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3 flex-1">
                      {getTypeIcon(notification.type)}
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <p className={notification.read ? 'font-medium' : 'font-bold'}>{notification.title}</p>
                          <span className="px-2 py-0.5 bg-white/50 text-xs rounded">
                            {notification.category}
                          </span>
                          {notification.email_sent && (
                            <Mail className="w-3 h-3 text-gray-400" />
                          )}
                          {!notification.read && (
                            <span className="w-2 h-2 rounded-full bg-red-600" title="Não lida" />
                          )}
                        </div>
                        <p className={`text-sm mt-1 opacity-90 ${notification.read ? '' : 'font-semibold'}`}>{notification.message}</p>
                        <p className="text-xs mt-2 opacity-70">
                          {new Date(notification.created_at).toLocaleString('pt-PT')}
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={(e) => { e.stopPropagation(); deleteNotification(notification.id) }}
                      className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                      title="Deletar"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
