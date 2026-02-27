'use client'

import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  Home, Globe, Users, Mail, Shield, Database, Settings, 
  ChevronLeft, ChevronRight, Plus, Search, Download, ExternalLink,
  Edit2, Pause, Play, Trash2, RefreshCw, LogOut, Package, Server, Lock, LockOpen, Edit, Power, FolderOpen, FileText, Archive, Globe as GlobeIcon, ChevronRight as ChevronRightIcon
} from 'lucide-react'
import { CpanelDashboard } from '../admin/CpanelDashboard'
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
  PackagesSection, DNSZoneEditorSection, FileManagerSection, BackupManagerSection,
  WordPressInstallSection, WPBackupSection, DomainManagerSection, DeploySection
  // ClientesSection // Removido - não usado no painel do cliente
} from '../admin/CyberPanelSections'
import { cyberPanelAPI } from '@/lib/cyberpanel-api'
import type { CyberPanelWebsite, CyberPanelUser, CyberPanelPackage } from '@/lib/cyberpanel-api'

// Componente ClienteDashboardHome
function ClienteDashboardHome() {
  const cliente = {
    nome: 'João Silva', email: 'joao@aamihe.com', telefone: '+258 84 123 4567',
    empresa: 'Aamihe', morada: 'Av. Principal, 123', cidade: 'Maputo', pais: 'Moçambique',
    dominio: 'aamihe.com', plano: 'Premium', dataRenovacao: '21/10/2026',
    valorAnual: 1500, ssl: true, estado: 'active', creditoDisponivel: 1282
  }

  const hoje = new Date()
  const renovacao = new Date('2026-10-21')
  const diasRestantes = Math.ceil((renovacao.getTime() - hoje.getTime()) / (1000 * 60 * 60 * 24))

  return (
    <div className="flex gap-6">
      {/* Conteúdo principal */}
      <div className="flex-1 space-y-6">
        
        {/* Saudação */}
        <div>
          <p className="text-gray-500 text-sm">Bom dia, <strong className="text-gray-900">{cliente.nome}</strong> — aqui está o que está a acontecer hoje.</p>
        </div>

        {/* 4 Cards de resumo */}
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5 flex items-start gap-4">
            <div className="bg-blue-100 rounded-lg p-3"><Globe className="w-6 h-6 text-blue-600" /></div>
            <div>
              <p className="text-sm text-gray-500">Serviços Activos</p>
              <p className="text-2xl font-bold text-gray-900">1</p>
              <p className="text-xs text-gray-400 mt-0.5">{cliente.dominio}</p>
              <button className="text-xs text-blue-600 hover:underline mt-1">Ver serviços</button>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5 flex items-start gap-4">
            <div className="bg-green-100 rounded-lg p-3"><Globe className="w-6 h-6 text-green-600" /></div>
            <div>
              <p className="text-sm text-gray-500">Domínios Activos</p>
              <p className="text-2xl font-bold text-gray-900">1</p>
              <p className="text-xs text-gray-400 mt-0.5">Expira: {cliente.dataRenovacao}</p>
              <button className="text-xs text-blue-600 hover:underline mt-1">Ver domínios</button>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5 flex items-start gap-4">
            <div className={`rounded-lg p-3 ${diasRestantes < 30 ? 'bg-red-100' : 'bg-yellow-100'}`}>
              <FileText className={`w-6 h-6 ${diasRestantes < 30 ? 'text-red-600' : 'text-yellow-600'}`} />
            </div>
            <div>
              <p className="text-sm text-gray-500">Próxima Renovação</p>
              <p className={`text-2xl font-bold ${diasRestantes < 30 ? 'text-red-600' : 'text-gray-900'}`}>{diasRestantes} dias</p>
              <p className="text-xs text-gray-400 mt-0.5">{cliente.dataRenovacao} • {new Intl.NumberFormat('pt-MZ').format(cliente.valorAnual)} MZN</p>
              <button className="text-xs text-blue-600 hover:underline mt-1">Ver faturas</button>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5 flex items-start gap-4">
            <div className="bg-purple-100 rounded-lg p-3"><Mail className="w-6 h-6 text-purple-600" /></div>
            <div>
              <p className="text-sm text-gray-500">Faturas Não Pagas</p>
              <p className="text-2xl font-bold text-gray-900">0</p>
              <p className="text-xs text-gray-400 mt-0.5">Conta em dia ✓</p>
              <button className="text-xs text-blue-600 hover:underline mt-1">Ver faturas</button>
            </div>
          </div>
        </div>

        {/* Serviços a renovar em breve */}
        {diasRestantes < 60 && (
          <div className="bg-yellow-50 rounded-xl border border-yellow-200 p-5">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-bold text-yellow-800">⚠️ Serviços a renovar em breve</h2>
              <button className="bg-yellow-500 hover:bg-yellow-600 text-white text-xs font-bold px-4 py-1.5 rounded-lg transition-colors">Renovar Agora</button>
            </div>
            <p className="text-xs text-yellow-700">O teu serviço <strong>{cliente.dominio}</strong> renova em <strong>{cliente.dataRenovacao}</strong> ({diasRestantes} dias). Renova agora para evitar interrupções.</p>
          </div>
        )}

        {/* Tickets recentes */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="flex items-center justify-between px-5 py-3 border-b border-gray-100 bg-gray-50">
            <h2 className="text-sm font-bold text-gray-700">Tickets de Suporte</h2>
            <button className="text-xs text-red-600 hover:underline font-bold">+ Abrir Ticket</button>
          </div>
          <div className="p-5 text-center text-gray-400 text-sm">0 tickets abertos</div>
        </div>

      </div>

      {/* Barra lateral direita */}
      <div className="w-64 shrink-0 space-y-4">

        {/* Card do cliente */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
          {/* Avatar */}
          <div className="flex flex-col items-center mb-4">
            <div className="w-16 h-16 bg-red-600 rounded-full flex items-center justify-center mb-2">
              <span className="text-white text-xl font-bold">
                {cliente.nome.split(' ').map(n => n[0]).join('').slice(0,2).toUpperCase()}
              </span>
            </div>
            <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${cliente.estado === 'active' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
              {cliente.estado === 'active' ? 'Activo' : 'Suspenso'}
            </span>
          </div>
          {/* Dados */}
          <div className="space-y-1.5 text-sm border-t border-gray-100 pt-4">
            <p className="font-bold text-gray-900 text-center">{cliente.empresa}</p>
            <p className="text-gray-600 text-center text-xs">{cliente.nome}</p>
            <p className="text-gray-500 text-xs text-center">{cliente.morada}</p>
            <p className="text-gray-500 text-xs text-center">{cliente.cidade}</p>
            <p className="text-gray-500 text-xs text-center">{cliente.pais}</p>
          </div>
        </div>

        {/* Crédito disponível */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs font-bold text-gray-500 uppercase">Crédito Disponível</p>
            <ChevronRight className="w-4 h-4 text-gray-400" />
          </div>
          <p className="text-sm text-gray-600">Tens um saldo de <strong className="text-gray-900">MT {new Intl.NumberFormat('pt-MZ').format(cliente.creditoDisponivel)}</strong> que será aplicado às próximas faturas.</p>
          <button className="w-full mt-3 bg-red-600 hover:bg-red-700 text-white text-xs font-bold py-2 rounded-lg transition-colors">Adicionar Fundos</button>
        </div>

        {/* Contactos */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs font-bold text-gray-500 uppercase">Contactos</p>
          </div>
          <p className="text-xs text-gray-400 mb-3">Nenhum contacto adicional.</p>
          <button className="w-full bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-bold py-2 rounded-lg transition-colors">+ Novo Contacto</button>
        </div>

      </div>
    </div>
  )
}


// Componente EmailWebmailSection
function EmailWebmailSection() {
  const [pastaActiva, setPastaActiva] = useState('Caixa de Entrada')
  const [emails] = useState<any[]>([])
  const [modalEmail, setModalEmail] = useState<any>(null)
  const [modoResposta, setModoResposta] = useState<'none'|'reply'|'forward'>('none')
  const [compose, setCompose] = useState({ para: '', cc: '', bcc: '', assunto: '', corpo: '' })
  const [mostrarCompose, setMostrarCompose] = useState(false)
  const [enviando, setEnviando] = useState(false)
  const [enviado, setEnviado] = useState(false)
  const [assinatura, setAssinatura] = useState('')
  const [mostrarConfigAssinatura, setMostrarConfigAssinatura] = useState(false)
  const [contactos, setContactos] = useState([
    { nome: 'Silva Chamo', email: 'silva.chamo@gmail.com' },
    { nome: 'Suporte VisualDesign', email: 'suport@visualdesigne.com' },
  ])
  const [mostrarConfigContactos, setMostrarConfigContactos] = useState(false)
  const [novoContacto, setNovoContacto] = useState({ nome: '', email: '' })
  const [emailOrigem, setEmailOrigem] = useState('')
  const emailsOrigem = ['suport@visualdesigne.com', 'info@visualdesigne.com', 'silva.chamo@gmail.com']

  const handleCloseModal = () => { setModalEmail(null); setModoResposta('none'); setCompose({ para: '', cc: '', bcc: '', assunto: '', corpo: '' }); setEnviado(false) }

  const handleSend = async () => {
    setEnviando(true)
    await new Promise(r => setTimeout(r, 1000))
    setEnviando(false)
    setEnviado(true)
  }

  const pastas = ['Caixa de Entrada','Enviados','Rascunhos','Arquivo','Lixo','Spam']

  const botoesFormato = [
    { l: 'N', t: 'Negrito' }, { l: 'I', t: 'Itálico' }, { l: 'S', t: 'Sublinhado' },
    { l: 'ab', t: 'Riscado' }, { l: 'x₂', t: 'Subscrito' }, { l: 'x²', t: 'Superscrito' },
  ]

  return (
    <div className="flex flex-col h-[calc(100vh-120px)] -mx-6 -mt-6">

      {/* TOOLBAR PRINCIPAL */}
      <div className="bg-gray-900 px-4 py-2 flex items-center gap-2 flex-wrap border-b border-gray-800">
        <button onClick={() => { setMostrarCompose(true); setEnviado(false) }}
          className="bg-green-500 hover:bg-green-600 text-white px-5 py-2 rounded-lg text-sm font-bold flex items-center gap-2 shadow-lg">
          ✏️ Escrever
        </button>
        <a href="https://109.199.104.22:8090/rainloop/" target="_blank"
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-xs font-bold flex items-center gap-2">
          🌐 Webmail
        </a>
        <div className="w-px h-5 bg-gray-700 mx-1" />
        {pastas.map(p => (
          <button key={p} onClick={() => setPastaActiva(p)}
            className={`px-3 py-1.5 rounded text-xs font-medium transition-colors ${pastaActiva === p ? 'bg-gray-600 text-white' : 'text-gray-400 hover:text-white hover:bg-gray-700'}`}>
            {p}
          </button>
        ))}
        <div className="ml-auto flex items-center gap-2">
          <button onClick={() => setMostrarConfigAssinatura(true)}
            className="text-gray-400 hover:text-white text-xs px-3 py-1.5 rounded border border-gray-700 hover:border-gray-500 transition-colors">
            ✍️ Assinatura
          </button>
          <button onClick={() => setMostrarConfigContactos(true)}
            className="text-gray-400 hover:text-white text-xs px-3 py-1.5 rounded border border-gray-700 hover:border-gray-500 transition-colors">
            👥 Contactos
          </button>
        </div>
      </div>

      {/* LISTA DE EMAILS */}
      <div className="flex-1 flex flex-col overflow-hidden bg-white">
        <div className="flex items-center gap-2 px-4 py-2 border-b border-gray-200 bg-gray-50">
          <input placeholder="🔍 Pesquisar emails..." className="flex-1 max-w-sm px-3 py-1.5 border border-gray-300 rounded-lg text-xs outline-none" />
          {[{ i: '🔄', t: 'Actualizar' }, { i: '📁', t: 'Arquivar' }, { i: '⚠️', t: 'Spam' }, { i: '🗑️', t: 'Eliminar' }].map((b, i) => (
            <button key={i} className="flex items-center gap-1 text-xs text-gray-600 hover:text-gray-900 px-3 py-1.5 rounded border border-gray-300 hover:bg-gray-100 transition-colors">
              {b.i} {b.t}
            </button>
          ))}
        </div>
        <div className="flex-1 overflow-y-auto">
          {emails.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-gray-400 space-y-3">
              <span className="text-5xl">📭</span>
              <p className="text-sm font-medium">A caixa está vazia</p>
              <p className="text-xs text-gray-300">{pastaActiva}</p>
            </div>
          ) : emails.map((e, i) => (
            <div key={i} onClick={() => setModalEmail(e)}
              className="flex items-center gap-4 px-5 py-3 border-b border-gray-100 hover:bg-blue-50 cursor-pointer">
              <div className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center shrink-0">
                <span className="text-xs font-bold">{e.de?.[0]?.toUpperCase()}</span>
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-bold text-gray-800 truncate">{e.de}</p>
                  <p className="text-xs text-gray-400">{e.data}</p>
                </div>
                <p className="text-xs text-gray-600 truncate">{e.assunto}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* MODAL LER EMAIL — FULLSCREEN */}
      {modalEmail && (
        <div className="fixed inset-0 bg-white z-50 flex flex-col">
          <div className="bg-gray-900 px-6 py-3 flex items-center gap-3">
            <button onClick={() => { setModoResposta('reply'); setCompose({ para: modalEmail.de, cc: '', bcc: '', assunto: 'Re: ' + modalEmail.assunto, corpo: '' }) }}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-xs font-bold">↩️ Responder</button>
            <button onClick={() => { setModoResposta('forward'); setCompose({ para: '', cc: '', bcc: '', assunto: 'Fwd: ' + modalEmail.assunto, corpo: modalEmail.corpo }) }}
              className="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-lg text-xs font-bold">↪️ Reencaminhar</button>
            <button onClick={handleCloseModal} className="bg-red-900 hover:bg-red-800 text-white px-4 py-2 rounded-lg text-xs font-bold">🗑️ Eliminar</button>
            <button onClick={handleCloseModal} className="bg-gray-700 hover:bg-gray-600 text-white px-4 py-2 rounded-lg text-xs font-bold">📁 Arquivar</button>
            <div className="ml-auto">
              <button onClick={handleCloseModal} className="w-9 h-9 flex items-center justify-center rounded-full bg-red-600 hover:bg-red-700 text-white font-bold text-lg">✕</button>
            </div>
          </div>
          <div className="flex-1 overflow-y-auto p-8 max-w-4xl mx-auto w-full">
            <h1 className="text-2xl font-bold text-gray-900 mb-4">{modalEmail.assunto}</h1>
            <div className="flex items-center gap-3 mb-6 pb-4 border-b border-gray-200">
              <div className="w-10 h-10 bg-red-600 rounded-full flex items-center justify-center">
                <span className="text-white font-bold">{modalEmail.de?.[0]?.toUpperCase()}</span>
              </div>
              <div>
                <p className="font-bold text-gray-800">{modalEmail.de}</p>
                <p className="text-xs text-gray-500">{modalEmail.data}</p>
              </div>
            </div>
            <div className="text-sm text-gray-700 leading-relaxed">{modalEmail.corpo}</div>
            {modoResposta !== 'none' && (
              <div className="mt-8 border-t border-gray-200 pt-6">
                <h3 className="text-sm font-bold text-gray-700 mb-4">{modoResposta === 'reply' ? '↩️ Responder' : '↪️ Reencaminhar'}</h3>
                <div className="border border-gray-300 rounded-xl overflow-hidden">
                  <div className="bg-gray-50 border-b border-gray-200 px-4 py-2 space-y-1">
                    {[{ label: 'Para:', field: 'para' }, { label: 'Cc:', field: 'cc' }, { label: 'Assunto:', field: 'assunto' }].map(f => (
                      <div key={f.field} className="flex items-center gap-3 py-1 border-b border-gray-100 last:border-0">
                        <span className="text-xs font-bold text-gray-500 w-16">{f.label}</span>
                        <input value={(compose as any)[f.field]} onChange={e => setCompose({...compose, [f.field]: e.target.value})}
                          className="flex-1 text-sm bg-transparent outline-none" />
                      </div>
                    ))}
                  </div>
                  <textarea value={compose.corpo} onChange={e => setCompose({...compose, corpo: e.target.value})}
                    rows={6} className="w-full p-4 text-sm outline-none resize-none" placeholder="Escreve a tua resposta..." />
                  {assinatura && <div className="px-4 pb-3 border-t border-gray-100 text-xs text-gray-500 whitespace-pre-wrap">--{'\n'}{assinatura}</div>}
                  <div className="flex gap-2 p-3 border-t border-gray-200 bg-gray-50">
                    <button onClick={handleSend} disabled={enviando}
                      className="bg-green-600 hover:bg-green-700 text-white px-5 py-2 rounded-lg text-xs font-bold disabled:opacity-50">
                      {enviando ? '⏳ A enviar...' : '✈️ Enviar'}
                    </button>
                    <button onClick={() => setModoResposta('none')}
                      className="bg-gray-200 hover:bg-gray-300 text-gray-700 px-4 py-2 rounded-lg text-xs font-bold">Cancelar</button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* POPUP ESCREVER — FULLSCREEN */}
      {mostrarCompose && (
        <div className="fixed inset-0 bg-white z-50 flex flex-col">

          {/* LINHA 1 — Envio e campos */}
          <div className="bg-gray-900 px-4 py-2 flex items-center gap-2 border-b border-gray-700 flex-wrap">
            <button onClick={handleSend} disabled={enviando || !compose.para || !emailOrigem}
              className="bg-green-500 hover:bg-green-600 disabled:opacity-50 text-white font-bold px-6 py-2 rounded-lg text-sm flex items-center gap-2 shadow-lg">
              {enviando ? '⏳ A enviar...' : '✈️ Enviar'}
            </button>
            <div className="w-px h-5 bg-gray-700" />
            <select value={emailOrigem} onChange={e => setEmailOrigem(e.target.value)}
              className="bg-gray-800 border border-gray-600 text-white text-xs px-3 py-2 rounded-lg outline-none">
              <option value="">Escolher email de origem...</option>
              {emailsOrigem.map(e => <option key={e} value={e}>{e}</option>)}
            </select>
            <div className="flex items-center gap-1 flex-1">
              <span className="text-gray-400 text-xs">Para:</span>
              <input list="contactos-list" value={compose.para} onChange={e => setCompose({...compose, para: e.target.value})}
                className="flex-1 bg-gray-800 border border-gray-600 text-white text-sm px-3 py-2 rounded-lg outline-none" placeholder="destinatario@email.com" />
              <datalist id="contactos-list">
                {contactos.map(c => <option key={c.email} value={c.email}>{c.nome}</option>)}
              </datalist>
            </div>
            <input value={compose.assunto} onChange={e => setCompose({...compose, assunto: e.target.value})}
              className="bg-gray-800 border border-gray-600 text-white text-sm px-3 py-2 rounded-lg outline-none w-56" placeholder="Assunto" />
            <input value={compose.cc} onChange={e => setCompose({...compose, cc: e.target.value})}
              className="bg-gray-800 border border-gray-600 text-white text-xs px-2 py-2 rounded-lg outline-none w-28" placeholder="Cc" />
            <input value={compose.bcc} onChange={e => setCompose({...compose, bcc: e.target.value})}
              className="bg-gray-800 border border-gray-600 text-white text-xs px-2 py-2 rounded-lg outline-none w-28" placeholder="Bcc" />
            <button onClick={() => { setMostrarCompose(false); setCompose({ para: '', cc: '', bcc: '', assunto: '', corpo: '' }); setEnviado(false) }}
              className="ml-2 w-9 h-9 flex items-center justify-center rounded-full bg-red-600 hover:bg-red-700 text-white font-bold text-lg shadow-lg">✕</button>
          </div>

          {/* LINHA 2 — Formatação */}
          <div className="bg-gray-800 px-4 py-1.5 flex items-center gap-1 flex-wrap border-b border-gray-700">
            <select className="bg-gray-700 border border-gray-600 text-white text-xs px-2 py-1 rounded">
              <option>Calibri</option><option>Arial</option><option>Times New Roman</option>
            </select>
            <select className="bg-gray-700 border border-gray-600 text-white text-xs px-2 py-1 rounded w-14">
              <option>11</option><option>12</option><option>14</option><option>16</option><option>18</option>
            </select>
            <div className="w-px h-4 bg-gray-600 mx-1" />
            {botoesFormato.map((b, i) => (
              <button key={i} title={b.t}
                className="text-white text-xs px-2 py-1 rounded hover:bg-gray-600 border border-gray-600 relative group">
                {b.l}
                <span className="absolute top-7 left-1/2 -translate-x-1/2 bg-black text-white text-[10px] px-1.5 py-0.5 rounded opacity-0 group-hover:opacity-100 whitespace-nowrap z-20 pointer-events-none">{b.t}</span>
              </button>
            ))}
            <div className="w-px h-4 bg-gray-600 mx-1" />
            {[{ l: '≡', t: 'Lista' }, { l: '1.', t: 'Numerada' }, { l: '⬛', t: 'Esquerda' }, { l: '▪', t: 'Centro' }, { l: '⬜', t: 'Direita' }, { l: '▬', t: 'Justificar' }].map((b, i) => (
              <button key={i} title={b.t} className="text-white text-xs px-2 py-1 rounded hover:bg-gray-600 border border-gray-600 relative group">
                {b.l}
                <span className="absolute top-7 left-1/2 -translate-x-1/2 bg-black text-white text-[10px] px-1.5 py-0.5 rounded opacity-0 group-hover:opacity-100 whitespace-nowrap z-20 pointer-events-none">{b.t}</span>
              </button>
            ))}
            <div className="w-px h-4 bg-gray-600 mx-1" />
            {[{ l: '🔗', t: 'Ligação' }, { l: '🖼', t: 'Imagem' }, { l: '⊞', t: 'Tabela' }, { l: '📎', t: 'Anexo' }].map((b, i) => (
              <button key={i} title={b.t} className="text-white text-xs px-2 py-1 rounded hover:bg-gray-600 border border-gray-600 flex items-center gap-1 relative group">
                {b.l} <span className="text-gray-300 text-[10px]">{b.t}</span>
              </button>
            ))}
            <button onClick={() => setMostrarConfigAssinatura(true)}
              className="text-white text-xs px-2 py-1 rounded hover:bg-gray-600 border border-gray-600 flex items-center gap-1">
              ✍️ <span className="text-gray-300 text-[10px]">Assinatura</span>
            </button>
          </div>

          {/* ÁREA DE ESCRITA */}
          {enviado ? (
            <div className="flex-1 flex items-center justify-center bg-white">
              <div className="text-center">
                <p className="text-5xl mb-4">✅</p>
                <p className="text-xl font-bold text-gray-800">Email enviado com sucesso!</p>
                <button onClick={() => { setMostrarCompose(false); setCompose({ para: '', cc: '', bcc: '', assunto: '', corpo: '' }); setEnviado(false) }}
                  className="mt-5 bg-red-600 hover:bg-red-700 text-white px-6 py-2.5 rounded-lg text-sm font-bold">Fechar</button>
              </div>
            </div>
          ) : (
            <div className="flex-1 flex flex-col bg-white">
              <textarea value={compose.corpo} onChange={e => setCompose({...compose, corpo: e.target.value})}
                className="flex-1 p-6 text-sm text-gray-800 outline-none resize-none" placeholder="Escreve a tua mensagem aqui..." />
              {assinatura && (
                <div className="px-6 py-3 border-t border-gray-200 text-xs text-gray-500 whitespace-pre-wrap">--{'\n'}{assinatura}</div>
              )}
            </div>
          )}
        </div>
      )}

      {/* MODAL ASSINATURA */}
      {mostrarConfigAssinatura && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[60]">
          <div className="bg-white rounded-xl shadow-2xl p-6 w-full max-w-lg">
            <h2 className="text-lg font-bold text-gray-900 mb-4">✍️ Configurar Assinatura</h2>
            <textarea value={assinatura} onChange={e => setAssinatura(e.target.value)}
              rows={6} placeholder="Nome, cargo, contacto, website..."
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm resize-none mb-3" />
            <p className="text-xs text-gray-400 mb-4">Para incluir logo, cola o URL: [img]https://url-da-imagem.png[/img]</p>
            <div className="flex gap-3">
              <button onClick={() => setMostrarConfigAssinatura(false)}
                className="flex-1 bg-red-600 hover:bg-red-700 text-white py-2.5 rounded-lg text-sm font-bold">Guardar</button>
              <button onClick={() => setMostrarConfigAssinatura(false)}
                className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 py-2.5 rounded-lg text-sm font-bold">Cancelar</button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL CONTACTOS */}
      {mostrarConfigContactos && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[60]">
          <div className="bg-white rounded-xl shadow-2xl p-6 w-full max-w-lg">
            <h2 className="text-lg font-bold text-gray-900 mb-4">👥 Contactos Guardados</h2>
            <div className="space-y-2 mb-4 max-h-48 overflow-y-auto">
              {contactos.map((c, i) => (
                <div key={i} className="flex items-center justify-between bg-gray-50 rounded-lg px-3 py-2 border border-gray-200">
                  <div>
                    <p className="text-sm font-bold text-gray-800">{c.nome}</p>
                    <p className="text-xs text-gray-500">{c.email}</p>
                  </div>
                  <button onClick={() => setContactos(contactos.filter((_, j) => j !== i))}
                    className="text-red-400 hover:text-red-600 text-xs">✕</button>
                </div>
              ))}
            </div>
            <div className="flex gap-2 mb-4">
              <input value={novoContacto.nome} onChange={e => setNovoContacto({...novoContacto, nome: e.target.value})}
                placeholder="Nome" className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm" />
              <input value={novoContacto.email} onChange={e => setNovoContacto({...novoContacto, email: e.target.value})}
                placeholder="Email" className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm" />
              <button onClick={() => { if (novoContacto.nome && novoContacto.email) { setContactos([...contactos, novoContacto]); setNovoContacto({ nome: '', email: '' }) }}}
                className="bg-red-600 hover:bg-red-700 text-white px-3 py-2 rounded-lg text-sm font-bold">+</button>
            </div>
            <button onClick={() => setMostrarConfigContactos(false)}
              className="w-full bg-gray-800 hover:bg-gray-900 text-white py-2.5 rounded-lg text-sm font-bold">Fechar</button>
          </div>
        </div>
      )}
    </div>
  )
}

// Componente SuporteSection
function SuporteSection() {
  const [form, setForm] = useState({ assunto: '', categoria: 'Geral', descricao: '' })
  const [enviado, setEnviado] = useState(false)
  const [expanded, setExpanded] = useState<string | null>(null)

  const tickets = [
    { id: 'TK-001', assunto: 'Problema com email', categoria: 'Email', estado: 'Resolvido', data: '15/01/2026', resposta: 'O problema foi resolvido. O email está agora configurado correctamente.' },
    { id: 'TK-002', assunto: 'Renovação do domínio', categoria: 'Facturação', estado: 'Aberto', data: '10/02/2026', resposta: '' },
  ]

  const estadoCor = (e: string) => e === 'Resolvido' ? 'bg-green-100 text-green-700' : e === 'Aberto' ? 'bg-blue-100 text-blue-700' : 'bg-yellow-100 text-yellow-700'

  return (
    <div className="space-y-6">
      <div><h1 className="text-2xl font-bold text-gray-900">Suporte</h1><p className="text-gray-500 mt-1">Contacta-nos ou abre um ticket de suporte.</p></div>

      {/* Contactos */}
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
          <h2 className="text-sm font-bold text-gray-700 mb-3">Contacto Directo</h2>
          <div className="space-y-2">
            <a href="https://wa.me/258848066605" target="_blank"
              className="flex items-center gap-3 bg-green-50 hover:bg-green-100 border border-green-200 text-green-700 px-4 py-3 rounded-lg text-sm font-bold transition-colors">
              <span>📱</span> WhatsApp — +258 848 066 605
            </a>
            <a href="mailto:silva.chamo@gmail.com"
              className="flex items-center gap-3 bg-gray-50 hover:bg-gray-100 border border-gray-200 text-gray-700 px-4 py-3 rounded-lg text-sm font-bold transition-colors">
              <span>✉️</span> silva.chamo@gmail.com
            </a>
          </div>
          <p className="text-xs text-gray-400 mt-3">Horário: Segunda a Sexta, 8h — 17h</p>
        </div>

        {/* Novo Ticket */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
          <h2 className="text-sm font-bold text-gray-700 mb-3">Abrir Novo Ticket</h2>
          {enviado ? (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-center">
              <p className="text-green-700 font-bold text-sm">✅ Ticket enviado com sucesso!</p>
              <p className="text-green-600 text-xs mt-1">Responderemos em breve.</p>
              <button onClick={() => { setEnviado(false); setForm({ assunto: '', categoria: 'Geral', descricao: '' }) }}
                className="mt-3 text-xs text-green-700 underline">Abrir outro ticket</button>
            </div>
          ) : (
            <div className="space-y-3">
              <input value={form.assunto} onChange={e => setForm({...form, assunto: e.target.value})}
                placeholder="Assunto" className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" />
              <select value={form.categoria} onChange={e => setForm({...form, categoria: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm">
                {['Geral','Técnico','Facturação','Domínio','Email','SSL','Backup'].map(c => <option key={c}>{c}</option>)}
              </select>
              <textarea value={form.descricao} onChange={e => setForm({...form, descricao: e.target.value})}
                placeholder="Descreve o teu problema..." rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm resize-none" />
              <button onClick={() => { if (form.assunto && form.descricao) setEnviado(true) }}
                disabled={!form.assunto || !form.descricao}
                className="w-full bg-red-600 hover:bg-red-700 text-white py-2 rounded-lg text-sm font-bold transition-colors disabled:opacity-50">
                Enviar Ticket
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Histórico */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="px-5 py-3 border-b border-gray-100 bg-gray-50">
          <h2 className="text-sm font-bold text-gray-700">Histórico de Tickets</h2>
        </div>
        <div className="divide-y divide-gray-100">
          {tickets.map(t => (
            <div key={t.id}>
              <div className="flex items-center justify-between px-5 py-3 hover:bg-gray-50 cursor-pointer"
                onClick={() => setExpanded(expanded === t.id ? null : t.id)}>
                <div className="flex items-center gap-3">
                  <span className="text-xs font-mono text-gray-400">{t.id}</span>
                  <span className="text-sm font-medium text-gray-800">{t.assunto}</span>
                  <span className="text-xs text-gray-400">{t.categoria}</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${estadoCor(t.estado)}`}>{t.estado}</span>
                  <span className="text-xs text-gray-400">{t.data}</span>
                </div>
              </div>
              {expanded === t.id && t.resposta && (
                <div className="px-5 py-3 bg-green-50 border-t border-green-100">
                  <p className="text-xs font-bold text-green-700 mb-1">Resposta da VisualDesign:</p>
                  <p className="text-sm text-green-800">{t.resposta}</p>
                </div>
              )}
              {expanded === t.id && !t.resposta && (
                <div className="px-5 py-3 bg-yellow-50 border-t border-yellow-100">
                  <p className="text-xs text-yellow-700">Aguardando resposta...</p>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

// Componente FacturacaoSection
function FacturacaoSection() {
  const [expanded, setExpanded] = useState<string | null>(null)

  const faturasPendentes = [
    { id: 'FAT-2026-001', descricao: 'Renovação Anual — aamihe.com', valor: 1500, vencimento: '21/10/2026', estado: 'pendente' }
  ]

  const faturasHistorico = [
    { id: 'FAT-2025-001', descricao: 'Renovação Anual — aamihe.com', valor: 1500, dataPagamento: '21/10/2025', metodo: 'M-Pesa', estado: 'pago' },
    { id: 'FAT-2024-001', descricao: 'Registo de Domínio — aamihe.com', valor: 1200, dataPagamento: '21/10/2024', metodo: 'Transferência', estado: 'pago' },
  ]

  return (
    <div className="space-y-6">
      <div><h1 className="text-2xl font-bold text-gray-900">Facturação</h1><p className="text-gray-500 mt-1">Faturas, pagamentos e histórico financeiro.</p></div>

      {/* Resumo */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
          <p className="text-xs font-bold text-gray-400 uppercase mb-1">Total Pago Este Ano</p>
          <p className="text-2xl font-bold text-green-600">1.500 MZN</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
          <p className="text-xs font-bold text-gray-400 uppercase mb-1">Próxima Fatura</p>
          <p className="text-2xl font-bold text-gray-900">21/10/2026</p>
          <p className="text-xs text-gray-500 mt-1">1.500 MZN</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
          <p className="text-xs font-bold text-gray-400 uppercase mb-1">Estado da Conta</p>
          <p className="text-2xl font-bold text-green-600">Em dia ✓</p>
        </div>
      </div>

      {/* Faturas Pendentes */}
      {faturasPendentes.length > 0 && (
        <div className="bg-yellow-50 rounded-xl border border-yellow-200 overflow-hidden">
          <div className="px-5 py-3 border-b border-yellow-200">
            <h2 className="text-sm font-bold text-yellow-800">⚠️ Faturas Pendentes</h2>
          </div>
          {faturasPendentes.map(f => (
            <div key={f.id} className="p-5">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <p className="font-bold text-gray-900">{f.descricao}</p>
                  <p className="text-xs text-gray-500 mt-0.5">Vencimento: {f.vencimento} • {f.id}</p>
                </div>
                <p className="text-2xl font-bold text-gray-900">{new Intl.NumberFormat('pt-MZ').format(f.valor)} MZN</p>
              </div>
              <button onClick={() => setExpanded(expanded === f.id ? null : f.id)}
                className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg text-xs font-bold transition-colors">
                Como Pagar
              </button>
              {expanded === f.id && (
                <div className="mt-4 grid grid-cols-3 gap-3">
                  <div className="bg-white rounded-lg border border-yellow-200 p-4">
                    <p className="text-xs font-bold text-gray-700 mb-2">📱 M-Pesa</p>
                    <p className="text-xs text-gray-600">Envie <strong>{f.valor} MZN</strong> para:</p>
                    <p className="text-sm font-bold text-gray-900 mt-1">848 066 605</p>
                    <p className="text-xs text-gray-500 mt-1">Referência: aamihe.com</p>
                  </div>
                  <div className="bg-white rounded-lg border border-yellow-200 p-4">
                    <p className="text-xs font-bold text-gray-700 mb-2">📱 E-Mola</p>
                    <p className="text-xs text-gray-600">Envie <strong>{f.valor} MZN</strong> para:</p>
                    <p className="text-sm font-bold text-gray-900 mt-1">848 066 605</p>
                    <p className="text-xs text-gray-500 mt-1">Referência: aamihe.com</p>
                  </div>
                  <div className="bg-white rounded-lg border border-yellow-200 p-4">
                    <p className="text-xs font-bold text-gray-700 mb-2">🏦 Transferência</p>
                    <p className="text-xs text-gray-600">Banco: <strong>BCI</strong></p>
                    <p className="text-xs text-gray-600">NIB: <strong>a preencher</strong></p>
                    <p className="text-xs text-gray-500 mt-1">Referência: aamihe.com</p>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Histórico */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="px-5 py-3 border-b border-gray-100 bg-gray-50">
          <h2 className="text-sm font-bold text-gray-700">Histórico de Pagamentos</h2>
        </div>
        <table className="w-full text-sm">
          <thead>
            <tr className="text-xs font-bold text-gray-500 uppercase border-b bg-gray-50">
              <th className="px-5 py-3 text-left">Descrição</th>
              <th className="px-5 py-3 text-left">Valor</th>
              <th className="px-5 py-3 text-left">Data</th>
              <th className="px-5 py-3 text-left">Método</th>
              <th className="px-5 py-3 text-left">Estado</th>
              <th className="px-5 py-3 text-left">Recibo</th>
            </tr>
          </thead>
          <tbody>
            {faturasHistorico.map(f => (
              <tr key={f.id} className="border-b border-gray-50 hover:bg-gray-50">
                <td className="px-5 py-3">
                  <p className="font-medium text-gray-800">{f.descricao}</p>
                  <p className="text-xs text-gray-400">{f.id}</p>
                </td>
                <td className="px-5 py-3 font-bold text-gray-900">{new Intl.NumberFormat('pt-MZ').format(f.valor)} MZN</td>
                <td className="px-5 py-3 text-gray-600">{f.dataPagamento}</td>
                <td className="px-5 py-3 text-gray-600">{f.metodo}</td>
                <td className="px-5 py-3"><span className="px-2 py-0.5 bg-green-100 text-green-700 rounded-full text-xs font-bold">Pago</span></td>
                <td className="px-5 py-3">
                  <button onClick={() => alert('Recibo disponível em breve!')}
                    className="text-xs text-blue-600 hover:underline font-medium">↓ Recibo</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

// Componente ContaSection
function ContaSection() {
  const [dados, setDados] = useState({ nome: 'João Silva', email: 'joao@aamihe.com', telefone: '+258 84 123 4567', empresa: 'Aamihe', morada: 'Av. Principal, 123', cidade: 'Maputo' })
  const [pass, setPass] = useState({ actual: '', nova: '', confirmar: '' })
  const [notif, setNotif] = useState({ dias30: true, dias15: true, dias7: true, pagamentos: true, suporte: false })
  const [savedMsg, setSavedMsg] = useState('')
  const [cancelModal, setCancelModal] = useState(false)
  const [motivoCancelamento, setMotivoCancelamento] = useState('')

  const forcaPassword = (p: string) => {
    if (p.length === 0) return { texto: '', cor: '' }
    if (p.length < 6) return { texto: 'Fraca', cor: 'text-red-500' }
    if (p.length < 10) return { texto: 'Média', cor: 'text-yellow-500' }
    return { texto: 'Forte', cor: 'text-green-500' }
  }

  const guardar = () => {
    setSavedMsg('Dados guardados com sucesso!')
    setTimeout(() => setSavedMsg(''), 3000)
  }

  return (
    <div className="space-y-6">
      <div><h1 className="text-2xl font-bold text-gray-900">A Minha Conta</h1><p className="text-gray-500 mt-1">Gere os teus dados pessoais e preferências.</p></div>

      <div className="grid grid-cols-2 gap-6">
        {/* Dados Pessoais */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
          <h2 className="text-sm font-bold text-gray-700 mb-4">Dados Pessoais</h2>
          <div className="space-y-3">
            {[
              { label: 'Nome Completo', field: 'nome' },
              { label: 'Email', field: 'email' },
              { label: 'Telefone', field: 'telefone' },
              { label: 'Empresa', field: 'empresa' },
              { label: 'Morada', field: 'morada' },
              { label: 'Cidade', field: 'cidade' },
            ].map(({ label, field }) => (
              <div key={field}>
                <label className="text-xs font-bold text-gray-500 uppercase block mb-1">{label}</label>
                <input value={(dados as any)[field]} onChange={e => setDados({...dados, [field]: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" />
              </div>
            ))}
            {savedMsg && <p className="text-green-600 text-xs font-bold bg-green-50 border border-green-200 rounded px-3 py-2">{savedMsg}</p>}
            <button onClick={guardar}
              className="w-full bg-red-600 hover:bg-red-700 text-white py-2.5 rounded-lg text-sm font-bold transition-colors">
              Guardar Alterações
            </button>
          </div>
        </div>

        <div className="space-y-5">
          {/* Alterar Password */}
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
            <h2 className="text-sm font-bold text-gray-700 mb-4">Alterar Password</h2>
            <div className="space-y-3">
              <div>
                <label className="text-xs font-bold text-gray-500 uppercase block mb-1">Password Actual</label>
                <input type="password" value={pass.actual} onChange={e => setPass({...pass, actual: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" />
              </div>
              <div>
                <label className="text-xs font-bold text-gray-500 uppercase block mb-1">Nova Password</label>
                <input type="password" value={pass.nova} onChange={e => setPass({...pass, nova: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" />
                {pass.nova && <p className={`text-xs font-bold mt-1 ${forcaPassword(pass.nova).cor}`}>Força: {forcaPassword(pass.nova).texto}</p>}
              </div>
              <div>
                <label className="text-xs font-bold text-gray-500 uppercase block mb-1">Confirmar Nova Password</label>
                <input type="password" value={pass.confirmar} onChange={e => setPass({...pass, confirmar: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" />
                {pass.confirmar && pass.nova !== pass.confirmar && <p className="text-xs text-red-500 font-bold mt-1">Passwords não coincidem</p>}
              </div>
              <button disabled={!pass.actual || !pass.nova || pass.nova !== pass.confirmar}
                className="w-full bg-gray-800 hover:bg-gray-900 text-white py-2.5 rounded-lg text-sm font-bold transition-colors disabled:opacity-50">
                Alterar Password
              </button>
            </div>
          </div>

          {/* Notificações */}
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
            <h2 className="text-sm font-bold text-gray-700 mb-4">Notificações por Email</h2>
            <div className="space-y-3">
              {[
                { key: 'dias30', label: 'Aviso de renovação 30 dias antes' },
                { key: 'dias15', label: 'Aviso de renovação 15 dias antes' },
                { key: 'dias7', label: 'Aviso de renovação 7 dias antes' },
                { key: 'pagamentos', label: 'Confirmação de pagamentos' },
                { key: 'suporte', label: 'Respostas de suporte' },
              ].map(({ key, label }) => (
                <div key={key} className="flex items-center justify-between">
                  <span className="text-sm text-gray-700">{label}</span>
                  <button onClick={() => setNotif({...notif, [key]: !(notif as any)[key]})}
                    className={`w-10 h-5 rounded-full transition-colors ${(notif as any)[key] ? 'bg-red-600' : 'bg-gray-300'} relative`}>
                    <span className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-all ${(notif as any)[key] ? 'left-5' : 'left-0.5'}`}></span>
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Informações do Serviço */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
        <h2 className="text-sm font-bold text-gray-700 mb-4">Informações do Serviço</h2>
        <div className="grid grid-cols-4 gap-4">
          {[
            { label: 'Domínio', value: 'aamihe.com' },
            { label: 'Plano', value: 'Premium' },
            { label: 'Data de Início', value: '21/10/2024' },
            { label: 'Data de Renovação', value: '21/10/2026' },
            { label: 'Valor Anual', value: '1.500 MZN' },
            { label: 'SSL', value: '✅ Activo' },
            { label: 'Estado', value: '🟢 Activo' },
            { label: 'PHP', value: '8.2' },
          ].map(({ label, value }) => (
            <div key={label} className="bg-gray-50 rounded-lg p-3 border border-gray-200">
              <p className="text-xs font-bold text-gray-400 uppercase mb-1">{label}</p>
              <p className="text-sm font-bold text-gray-900">{value}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Zona de Perigo */}
      <div className="bg-red-50 rounded-xl border border-red-200 p-5">
        <h2 className="text-sm font-bold text-red-700 mb-2">⚠️ Zona de Perigo</h2>
        <p className="text-xs text-red-600 mb-4">Acções irreversíveis. Procede com cautela.</p>
        <button onClick={() => setCancelModal(true)}
          className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg text-xs font-bold transition-colors">
          Solicitar Cancelamento do Serviço
        </button>
      </div>

      {/* Modal Cancelamento */}
      {cancelModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-2xl p-6 w-full max-w-md mx-4">
            <h2 className="text-lg font-bold text-gray-900 mb-2">Solicitar Cancelamento</h2>
            <p className="text-sm text-gray-500 mb-4">Lamenta-mos que queiras cancelar. Indica o motivo para podermos melhorar.</p>
            <textarea value={motivoCancelamento} onChange={e => setMotivoCancelamento(e.target.value)}
              placeholder="Motivo do cancelamento..." rows={4}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm resize-none mb-4" />
            <div className="flex gap-3">
              <button onClick={() => { alert('Pedido de cancelamento enviado. Entraremos em contacto.'); setCancelModal(false) }}
                disabled={!motivoCancelamento}
                className="flex-1 bg-red-600 hover:bg-red-700 text-white py-2.5 rounded-lg text-sm font-bold disabled:opacity-50">
                Confirmar Cancelamento
              </button>
              <button onClick={() => setCancelModal(false)}
                className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 py-2.5 rounded-lg text-sm font-bold">
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

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

function ListWebsitesSection({ sites, onRefresh, packages, setActiveSection, setFileManagerDomain, setSelectedDNSDomain, loadCyberPanelData, syncing, handleSync }: {
  sites: CyberPanelWebsite[], 
  onRefresh: () => void, 
  packages: CyberPanelPackage[],
  setActiveSection: (section: string) => void,
  setFileManagerDomain: (domain: string) => void,
  setSelectedDNSDomain: (domain: string) => void,
  loadCyberPanelData: () => void,
  syncing: boolean,
  handleSync: () => void
}) {
  const parseState = (state: any) => {
    if (state === 1 || state === '1' || state === 'Active') return 'Active'
    if (state === 0 || state === '0' || state === 'Suspended') return 'Suspended'
    return state || 'Active'
  }
  const [expandedSite, setExpandedSite] = useState<string | null>(null)
  const [editingField, setEditingField] = useState<{domain: string, field: string} | null>(null)
  const [editValue, setEditValue] = useState('')
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState<string | null>(null)
  const [msg, setMsg] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 4
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [createForm, setCreateForm] = useState({ domain: '', email: '', username: 'admin', packageName: 'Default', php: 'PHP 8.2' })
  const [creating, setCreating] = useState(false)
  const [createMsg, setCreateMsg] = useState('')

  // Filtrar sites activos — tem conteúdo real instalado
  const sitesArray = Array.isArray(sites) ? sites : []
  const filtered = sitesArray.filter(s => 
    s.domain.toLowerCase().includes(search.toLowerCase()) &&
    !s.domain.includes('contaboserver') &&
    !s.domain.includes('localhost') &&
    s.isActive === true
  )

  const totalPages = Math.ceil(filtered.length / itemsPerPage)
  const startIndex = (currentPage - 1) * itemsPerPage
  const paginatedSites = filtered.slice(startIndex, startIndex + itemsPerPage)

  // Expandir automaticamente o primeiro site ao carregar
  useEffect(() => {
    if (paginatedSites.length > 0 && !expandedSite) {
      setExpandedSite(paginatedSites[0].domain)
    }
  }, [paginatedSites, expandedSite])

  const handleDelete = async (domain: string) => {
    if (!confirm(`⚠️ Apagar "${domain}"?\n\nEsta acção é IRREVERSÍVEL — o site e todos os seus ficheiros serão eliminados do servidor!`)) return
    setLoading(domain)
    try {
      const res = await fetch('/api/server-exec', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'deleteWebsite', params: { domain } })
      })
      const data = await res.json()
      if (data.success) {
        await onRefresh()
      } else {
        alert('Erro ao apagar:\n\n' + (data.data?.output || data.error || 'Erro desconhecido'))
      }
    } catch (e: any) {
      alert('Erro de ligação: ' + e.message)
    }
    setLoading(null)
  }

  const handleSuspend = async (domain: string, state: string) => {
  setLoading(domain)
  const action = state === 'Active' ? 'suspendWebsite' : 'unsuspendWebsite'
  await fetch('/api/server-exec', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action, params: { domain } })
  })
  await onRefresh()
  setLoading(null)
}

  const handleSaveField = async (domain: string, field: string, value: string) => {
  setLoading(domain)
  let command = ''
  
  if (field === 'php') {
    command = `cyberpanel changePHP --domainName ${domain} --phpVersion "${value}" 2>&1`
  } else if (field === 'package') {
    command = `cyberpanel changePackage --domainName ${domain} --packageName "${value}" 2>&1`
  } else {
    // Para outros campos, usa modifyWebsite
    await fetch('/api/server-exec', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'modifyWebsite', params: { domain, [field]: value } })
    })
    setEditingField(null)
    await onRefresh()
    setLoading(null)
    return
  }
  
  const res = await fetch('/api/server-exec', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'execCommand', params: { command } })
  })
  const data = await res.json()
  if (!data.success) {
    alert('Erro: ' + (data.data?.output || data.error || 'desconhecido'))
  }
  setEditingField(null)
  await onRefresh()
  setLoading(null)
}

  const EditableField = ({ domain, field, value, label }: { domain: string, field: string, value: string, label: string }) => {
    const isEditing = editingField?.domain === domain && editingField?.field === field
    return (
      <div className="bg-gray-50 rounded-lg p-3 border border-gray-200">
        <p className="text-xs font-bold text-gray-400 uppercase mb-1">{label}</p>
        {isEditing ? (
          <div className="flex items-center gap-2">
            {field === 'php' ? (
              <select value={editValue} onChange={e => setEditValue(e.target.value)}
                className="text-sm border border-gray-300 rounded px-2 py-1 bg-white flex-1">
                <option>PHP 7.4</option><option>PHP 8.0</option>
                <option>PHP 8.1</option><option>PHP 8.2</option><option>PHP 8.3</option>
              </select>
            ) : field === 'package' ? (
              <select value={editValue} onChange={e => setEditValue(e.target.value)}
                className="text-sm border border-gray-300 rounded px-2 py-1 bg-white flex-1">
                <option>Default</option>
                {packages.map(p => <option key={p.packageName}>{p.packageName}</option>)}
              </select>
            ) : (
              <input value={editValue} onChange={e => setEditValue(e.target.value)}
                className="text-sm border border-gray-300 rounded px-2 py-1 flex-1" />
            )}
            <button onClick={() => handleSaveField(domain, field, editValue)}
              className="text-xs bg-black text-white px-2 py-1 rounded font-bold">✓</button>
            <button onClick={() => setEditingField(null)}
              className="text-xs bg-gray-200 px-2 py-1 rounded">✕</button>
          </div>
        ) : (
          <div className="flex items-center justify-between">
            <p className="text-sm font-bold text-gray-900">{value || '-'}</p>
            <button onClick={() => { setEditingField({ domain, field }); setEditValue(value) }}
              className="text-gray-400 hover:text-blue-500 ml-2">
              <Edit className="w-3 h-3" />
            </button>
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="w-full space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="text-base font-bold text-gray-900">Websites ({filtered.length})</span>
          <button onClick={handleSync} disabled={syncing}
            className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors disabled:opacity-50">
            <RefreshCw className={`w-3 h-3 ${syncing ? 'animate-spin' : ''}`} />
            {syncing ? 'A sincronizar...' : 'Sincronizar'}
          </button>
          <button onClick={() => setShowCreateModal(true)}
            className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors">
            <Plus className="w-3 h-3" /> Criar Website
          </button>
          <button onClick={() => {
            const rows = [['Domínio','IP','Estado','Pacote']]
            sites.forEach(s => rows.push([s.domain, '109.199.104.22', s.state || 'Active', (s as any).package || 'Default']))
            const blob = new Blob([rows.map(r => r.join(',')).join('\n')], { type: 'text/csv' })
            const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'websites.csv'; a.click()
          }} className="bg-gray-100 hover:bg-gray-200 text-gray-700 px-4 py-2 rounded-lg text-xs font-bold">
            ↓ Exportar CSV
          </button>
        </div>
        <div className="relative">
          <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Pesquisar websites..."
            className="pl-8 pr-3 py-1.5 border border-gray-300 rounded-lg text-sm w-52" />
        </div>
      </div>

      {msg && <div className="px-4 py-2.5 rounded-lg text-sm bg-green-50 text-green-700 border border-green-200">{msg}</div>}

      {/* Lista de sites como cards expansíveis */}
      <div className="space-y-2">
        {paginatedSites.map((s, i) => (
          <div key={i} className={`bg-white rounded-xl border ${expandedSite === s.domain ? 'border-blue-200 shadow-md' : 'border-gray-200 shadow-sm'} overflow-hidden transition-all`}>
            
            {/* Linha do site com botões explícitos */}
            <div className="flex items-center justify-between px-4 py-4">
              
              {/* Info do site */}
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setExpandedSite(expandedSite === s.domain ? null : s.domain)}
                  className="p-1 rounded hover:bg-gray-100 transition-colors"
                  title="Expandir/Colapsar"
                >
                  <ChevronRight className={`w-4 h-4 text-gray-400 transition-transform ${expandedSite === s.domain ? 'rotate-90' : ''}`} />
                </button>
                <Globe className="w-4 h-4 text-blue-500" />
                <a href={`https://${s.domain}`} target="_blank"
                  className="text-blue-600 hover:underline font-bold text-sm">
                  {s.domain}
                </a>
                <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${parseState(s.state) === 'Active' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                  {parseState(s.state) || 'Active'}
                </span>
                {/* Badge por tipo de site */}
                {s.siteType === 'wordpress' && <span className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full text-xs font-bold">WordPress</span>}
                {s.siteType === 'nextjs' && <span className="px-2 py-0.5 bg-black text-white rounded-full text-xs font-bold">Next.js</span>}
                {s.siteType === 'html' && <span className="px-2 py-0.5 bg-orange-100 text-orange-700 rounded-full text-xs font-bold">HTML/PHP</span>}
                {s.ssl ? (
                  <span className="flex items-center gap-1 text-green-600 text-xs font-bold">
                    <Lock className="w-3.5 h-3.5" /> SSL Activo
                  </span>
                ) : (
                  <span className="flex items-center gap-1 text-red-500 text-xs font-bold">
                    <LockOpen className="w-3.5 h-3.5" /> Sem SSL
                  </span>
                )}
              </div>

              {/* Botões */}
              <div className="flex items-center gap-3">
                {/* Botão Gerir — abre cards de gestão */}
                <button
                  onClick={() => setExpandedSite(expandedSite === s.domain ? null : s.domain)}
                  className="bg-black hover:bg-red-600 text-white px-4 py-1.5 rounded-lg text-xs font-bold transition-colors">
                  Gerir
                </button>
                
                {/* Botão Explorar Directório — sem fundo, texto link */}
                <button
                  onClick={() => {
                    setFileManagerDomain(s.domain)
                    setTimeout(() => setActiveSection('file-manager'), 50)
                  }}
                  className="text-gray-600 hover:text-red-600 text-xs font-medium transition-colors underline-offset-2 hover:underline">
                  Explorar directório
                </button>
              </div>
            </div>

            {/* Conteúdo expandido */}
            {expandedSite === s.domain && (
              <div className="border-t border-gray-100 p-4 space-y-4">
                
                {/* Grid de cards de detalhes editáveis */}
                <div className="grid grid-cols-4 gap-3">

                  {/* COLUNA 1 — Screenshot */}
                  <div className="bg-gray-100 rounded-lg overflow-hidden border border-gray-200 h-36 relative">
                    <iframe
                      src={`https://${s.domain}`}
                      className="absolute top-0 left-0"
                      style={{ width: '400%', height: '400%', transform: 'scale(0.25)', transformOrigin: 'top left', pointerEvents: 'none' }}
                      scrolling="no"
                      sandbox="allow-same-origin"
                    />
                  </div>

                  {/* COLUNA 2 — State + Disk Usage */}
                  <div className="flex flex-col gap-3">
                    <EditableField domain={s.domain} field="state" value={parseState(s.state) || 'Active'} label="State" />
                    <div className="bg-gray-50 rounded-lg p-3 border border-gray-200">
                      <p className="text-xs font-bold text-gray-400 uppercase mb-1">Disk Usage</p>
                      <p className="text-sm font-bold text-gray-900">{(s as any).diskUsed ? `${(s as any).diskUsed}MB` : '0MB'}</p>
                    </div>
                  </div>

                  {/* COLUNA 3 — IP + Package */}
                  <div className="flex flex-col gap-3">
                    <div className="bg-gray-50 rounded-lg p-3 border border-gray-200">
                      <p className="text-xs font-bold text-gray-400 uppercase mb-1">IP Address</p>
                      <p className="text-sm font-bold text-gray-900">{(s as any).ip || '109.199.104.22'}</p>
                    </div>
                    <EditableField domain={s.domain} field="package" value={(s as any).package || 'Default'} label="Package" />
                  </div>

                  {/* COLUNA 4 — PHP + Owner */}
                  <div className="flex flex-col gap-3">
                    <EditableField domain={s.domain} field="php" value={(s as any).phpVersion || 'PHP 8.2'} label="PHP Version" />
                    <div className="bg-gray-50 rounded-lg p-3 border border-gray-200">
                      <p className="text-xs font-bold text-gray-400 uppercase mb-1">Owner</p>
                      <p className="text-sm font-bold text-gray-900">{(s as any).owner || 'admin'}</p>
                    </div>
                  </div>

                </div>

                {/* Botões de acção numa linha */}
                <div className="flex items-center gap-2 pt-2 border-t border-gray-100">
                  <a href={`https://${s.domain}`} target="_blank" rel="noopener noreferrer"
                    className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-xs font-bold transition-colors">
                    <ExternalLink className="w-3.5 h-3.5" /> Visitar Site
                  </a>
                  <button
                    onClick={async () => {
                      setLoading(s.domain + '-ssl')
                      try {
                        // Primeiro verificar se o domínio resolve para o IP correcto
                        const checkRes = await fetch('/api/server-exec', {
                          method: 'POST', headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({
                            action: 'execCommand',
                            params: { command: `dig +short ${s.domain} 2>&1` }
                          })
                        })
                        const checkData = await checkRes.json()
                        const resolvedIP = (checkData.data?.output || '').trim()
                        const serverIP = '109.199.104.22'

                        if (!resolvedIP) {
                          alert(`⚠️ DNS não propagou ainda!\n\nO domínio "${s.domain}" não está a resolver para nenhum IP.\n\nAguarda a propagação DNS (pode demorar até 24h) e tenta novamente.`)
                          setLoading(null)
                          return
                        }

                        if (!resolvedIP.includes(serverIP)) {
                          alert(`⚠️ DNS ainda não propagou!\n\nO domínio "${s.domain}" está a resolver para:\n${resolvedIP}\n\nMas devia resolver para:\n${serverIP}\n\nAguarda a propagação DNS e tenta novamente.`)
                          setLoading(null)
                          return
                        }

                        // DNS está correcto — emitir SSL
                        const sslRes = await fetch('/api/server-exec', {
                          method: 'POST', headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({
                            action: 'execCommand',
                            params: { command: `cyberpanel issueSSL --domainName ${s.domain} 2>&1` }
                          })
                        })
                        const sslData = await sslRes.json()
                        const output = sslData.data?.output || ''

                        if (output.toLowerCase().includes('success') || output.toLowerCase().includes('issued')) {
                          alert(`✅ SSL emitido com sucesso para ${s.domain}!`)
                          onRefresh()
                        } else {
                          alert(`⚠️ Erro ao emitir SSL:\n\n${output}`)
                        }

                      } catch (e: any) {
                        alert('Erro: ' + e.message)
                      }
                      setLoading(null)
                    }} disabled={loading === s.domain + '-ssl'}
                    className="flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg text-xs font-bold transition-colors disabled:opacity-50">
                    <Lock className="w-3.5 h-3.5" /> {loading === s.domain + '-ssl' ? 'A verificar...' : 'Issue SSL'}
                  </button>
                  <button
                    onClick={() => {
                      setSelectedDNSDomain(s.domain)
                      setActiveSection('domains-dns')
                    }}
                    className="flex items-center gap-1.5 bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg text-xs font-bold transition-colors">
                    <Server className="w-3.5 h-3.5" /> Editar DNS
                  </button>
                  <button onClick={async () => {
                    setLoading(s.domain + '-backup')
                    try {
                      await fetch('/api/server-exec', {
                        method: 'POST', headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                          action: 'execCommand',
                          params: { command: `mkdir -p /home/backup/full && cyberpanel createBackup --domainName ${s.domain} --backupPath /home/backup/full 2>&1` }
                        })
                      })
                      alert(`✅ Backup de "${s.domain}" criado com sucesso!\n\nPode ver na página Backups.`)
                    } catch (e: any) {
                      alert('Erro ao criar backup: ' + e.message)
                    }
                    setLoading(null)
                  }}
                  disabled={loading === s.domain + '-backup'}
                  className="flex items-center gap-1.5 bg-gray-700 hover:bg-gray-800 text-white px-4 py-2 rounded-lg text-xs font-bold transition-colors disabled:opacity-50">
                    {loading === s.domain + '-backup' 
                      ? <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      : <Archive className="w-3.5 h-3.5" />
                    }
                    {loading === s.domain + '-backup' ? 'A criar...' : 'Backup'}
                  </button>
                  <button onClick={() => handleSuspend(s.domain, parseState(s.state) || 'Active')}
                    className="flex items-center gap-1.5 bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 rounded-lg text-xs font-bold transition-colors">
                    <Power className="w-3.5 h-3.5" /> {parseState(s.state) === 'Active' ? 'Suspender' : 'Activar'}
                  </button>
                  <button onClick={() => handleDelete(s.domain)} disabled={loading === s.domain}
                    className="flex items-center gap-1.5 bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg text-xs font-bold transition-colors disabled:opacity-50">
                    <Trash2 className="w-3.5 h-3.5" /> {loading === s.domain ? 'A apagar...' : 'Apagar'}
                  </button>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Paginação */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 pt-4">
          <button
            onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
            disabled={currentPage === 1}
            className="px-4 py-2 rounded-lg text-xs font-bold bg-white border border-gray-300 text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Anterior
          </button>
          
          <div className="flex items-center gap-1">
            {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
              <button
                key={page}
                onClick={() => setCurrentPage(page)}
                className={`w-8 h-8 rounded-lg text-xs font-bold transition-colors ${
                  currentPage === page
                    ? 'bg-red-600 text-white'
                    : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50'
                }`}
              >
                {page}
              </button>
            ))}
          </div>
          
          <button
            onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
            disabled={currentPage === totalPages}
            className="px-4 py-2 rounded-lg text-xs font-bold bg-white border border-gray-300 text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Próximo
          </button>
        </div>
      )}

      {/* Modal de criação de website */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-2xl p-6 w-full max-w-md mx-4">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-lg font-bold text-gray-900">Criar Novo Website</h2>
              <button onClick={() => { setShowCreateModal(false); setCreateMsg('') }}
                className="text-gray-400 hover:text-gray-600 text-xl">✕</button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="text-xs font-bold text-gray-600 uppercase block mb-1.5">Domínio</label>
                <input value={createForm.domain} onChange={e => setCreateForm({...createForm, domain: e.target.value})}
                  placeholder="exemplo.com"
                  className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm" />
              </div>
              <div>
                <label className="text-xs font-bold text-gray-600 uppercase block mb-1.5">Email Admin</label>
                <input value={createForm.email} onChange={e => setCreateForm({...createForm, email: e.target.value})}
                  placeholder="admin@exemplo.com"
                  className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm" />
              </div>
              <div>
                <label className="text-xs font-bold text-gray-600 uppercase block mb-1.5">Pacote</label>
                <select value={createForm.packageName} onChange={e => setCreateForm({...createForm, packageName: e.target.value})}
                  className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm">
                  <option>Default</option>
                  {packages.map(p => <option key={p.packageName} value={p.packageName}>{p.packageName}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs font-bold text-gray-600 uppercase block mb-1.5">Versão PHP</label>
                <select value={createForm.php} onChange={e => setCreateForm({...createForm, php: e.target.value})}
                  className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm">
                  <option>PHP 7.4</option><option>PHP 8.0</option>
                  <option>PHP 8.1</option><option>PHP 8.2</option><option>PHP 8.3</option>
                </select>
              </div>
            </div>
            {createMsg && (
              <div className={`mt-4 px-4 py-2.5 rounded-lg text-sm font-medium ${createMsg.includes('sucesso') ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>
                {createMsg}
              </div>
            )}
            <div className="flex gap-3 mt-6">
              <button onClick={async () => {
                if (!createForm.domain || !createForm.email) return
                setCreating(true); setCreateMsg('')
                const res = await fetch('/api/server-exec', {
                  method: 'POST', headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ action: 'createWebsite', params: createForm })
                })
                const data = await res.json()
                if (data.success) {
                  setCreateMsg('Website criado com sucesso!')
                  setTimeout(() => { setShowCreateModal(false); setCreateMsg(''); onRefresh() }, 1500)
                } else {
                  setCreateMsg('Erro: ' + (data.data?.output || data.error || 'desconhecido'))
                }
                setCreating(false)
              }} disabled={creating || !createForm.domain || !createForm.email}
                className="flex-1 bg-black hover:bg-red-600 text-white py-2.5 rounded-lg text-sm font-bold transition-colors disabled:opacity-50 flex items-center justify-center gap-2">
                {creating ? <><RefreshCw className="w-4 h-4 animate-spin" /> A criar...</> : '+ Criar Website'}
              </button>
              <button onClick={() => { setShowCreateModal(false); setCreateMsg('') }}
                className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 py-2.5 rounded-lg text-sm font-bold">
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default function AdminPage() {
  const [activeSection, setActiveSection] = useState('dashboard')
  const [isCollapsed, setIsCollapsed] = useState(false)
  const [fileManagerDomain, setFileManagerDomain] = useState('')
  const [cyberPanelSites, setCyberPanelSites] = useState<CyberPanelWebsite[]>([])
  const [cyberPanelUsers, setCyberPanelUsers] = useState<CyberPanelUser[]>([])
  const [cyberPanelPackages, setCyberPanelPackages] = useState<CyberPanelPackage[]>([])
  const [isFetchingCyberPanel, setIsFetchingCyberPanel] = useState(false)
  const [syncing, setSyncing] = useState(false)
  const [selectedDNSDomain, setSelectedDNSDomain] = useState<string>('')

  useEffect(() => {
    loadCyberPanelData()
  }, [])

  const handleSync = async () => {
    setSyncing(true)
    try {
      const res = await fetch('/api/server-exec', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'listWebsites', params: {} })
      })
      const data = await res.json()
      // CORRIGIR — garantir que usa data.data.sites e não data.data
      const sites = Array.isArray(data.data?.sites) ? data.data.sites : 
                    Array.isArray(data.data) ? data.data : []
      if (data.success) setCyberPanelSites(sites)
    } catch (e) { console.error(e) }
    setSyncing(false)
  }

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

  // Definir domínio principal
  const primaryDomain = cyberPanelSites.length > 0 
    ? cyberPanelSites.find(s => !s.domain.includes('contaboserver'))?.domain || cyberPanelSites[0].domain
    : 'visualdesigne.com'

  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: Home },
    { id: 'domains', label: 'O Meu Site', icon: Globe },
    { id: 'emails-new', label: 'Email', icon: Mail },
    { id: 'tickets', label: 'Suporte', icon: Users },
    { id: 'faturas', label: 'Faturas', icon: FileText },
    { id: 'conta', label: 'Conta', icon: Settings },
  ]

  const currentSidebarWidth = isCollapsed ? 80 : 250

  const renderSection = () => {
    switch (activeSection) {
      case 'dashboard':
        return <ClienteDashboardHome />
      case 'emails-new':
        return <EmailWebmailSection />
      case 'domains':
  return <ListWebsitesSection
    sites={cyberPanelSites.filter(s => s.domain === 'visualdesigne.com')}
    onRefresh={loadCyberPanelData}
    packages={cyberPanelPackages}
    setActiveSection={setActiveSection}
    setFileManagerDomain={setFileManagerDomain}
    setSelectedDNSDomain={setSelectedDNSDomain}
    loadCyberPanelData={loadCyberPanelData}
    syncing={syncing}
    handleSync={handleSync}
  />
      case 'domains-list':
        return <ListWebsitesSection 
        sites={cyberPanelSites} 
        onRefresh={loadCyberPanelData} 
        packages={cyberPanelPackages}
        setActiveSection={setActiveSection}
        setFileManagerDomain={setFileManagerDomain}
        setSelectedDNSDomain={setSelectedDNSDomain}
        loadCyberPanelData={loadCyberPanelData}
        syncing={syncing}
        handleSync={handleSync}
      />
      case 'file-manager':
      case 'cp-file-manager':
        return <FileManagerSection domain={fileManagerDomain || 'visualdesigne.com'} sites={cyberPanelSites} />
      case 'tickets':
        return <SuporteSection />
      case 'faturas':
        return <FacturacaoSection />
      case 'conta':
        return <ContaSection />
      case 'domains-new':
        // return <CreateWebsiteSection packages={cyberPanelPackages} onRefresh={loadCyberPanelData} /> // Removido - não usado no painel do cliente
        return <div className="p-6"><h1 className="text-2xl font-bold">Criar Website</h1><p className="text-gray-500 mt-1">Secção não disponível no painel do cliente</p></div>
      case 'cp-subdomains':
        // return <SubdomainsSection sites={cyberPanelSites} /> // Removido - não usado no painel do cliente
        return <div className="p-6"><h1 className="text-2xl font-bold">Subdomínios</h1><p className="text-gray-500 mt-1">Secção não disponível no painel do cliente</p></div>
      case 'cp-list-subdomains':
        // return <ListSubdomainsSection sites={cyberPanelSites} /> // Removido - não usado no painel do cliente
        return <div className="p-6"><h1 className="text-2xl font-bold">Listar Subdomínios</h1><p className="text-gray-500 mt-1">Secção não disponível no painel do cliente</p></div>
      case 'cp-modify-website':
        // return <ModifyWebsiteSection sites={cyberPanelSites} packages={cyberPanelPackages} /> // Removido - não usado no painel do cliente
        return <div className="p-6"><h1 className="text-2xl font-bold">Modificar Website</h1><p className="text-gray-500 mt-1">Secção não disponível no painel do cliente</p></div>
      case 'cp-suspend-website':
        // return <SuspendWebsiteSection sites={cyberPanelSites} onRefresh={loadCyberPanelData} /> // Removido - não usado no painel do cliente
        return <div className="p-6"><h1 className="text-2xl font-bold">Suspender Website</h1><p className="text-gray-500 mt-1">Secção não disponível no painel do cliente</p></div>
      case 'cp-delete-website':
        // return <DeleteWebsiteSection sites={cyberPanelSites} onRefresh={loadCyberPanelData} /> // Removido - não usado no painel do cliente
        return <div className="p-6"><h1 className="text-2xl font-bold">Apagar Website</h1><p className="text-gray-500 mt-1">Secção não disponível no painel do cliente</p></div>
      case 'cp-databases':
        // return <DatabasesSection sites={cyberPanelSites} /> // Removido - não usado no painel do cliente
        return <div className="p-6"><h1 className="text-2xl font-bold">Bases de Dados</h1><p className="text-gray-500 mt-1">Secção não disponível no painel do cliente</p></div>
      case 'cp-ftp':
        // return <FTPSection sites={cyberPanelSites} /> // Removido - não usado no painel do cliente
        return <div className="p-6"><h1 className="text-2xl font-bold">FTP</h1><p className="text-gray-500 mt-1">Secção não disponível no painel do cliente</p></div>
      case 'cp-email-delete':
        // return <EmailDeleteSection sites={cyberPanelSites} /> // Removido - não usado no painel do cliente
        return <div className="p-6"><h1 className="text-2xl font-bold">Apagar Email</h1><p className="text-gray-500 mt-1">Secção não disponível no painel do cliente</p></div>
      case 'cp-email-limits':
        // return <EmailLimitsSection sites={cyberPanelSites} /> // Removido - não usado no painel do cliente
        return <div className="p-6"><h1 className="text-2xl font-bold">Limites de Email</h1><p className="text-gray-500 mt-1">Secção não disponível no painel do cliente</p></div>
      case 'cp-email-forwarding':
        // return <EmailForwardingSection sites={cyberPanelSites} /> // Removido - não usado no painel do cliente
        return <div className="p-6"><h1 className="text-2xl font-bold">Encaminhamento de Email</h1><p className="text-gray-500 mt-1">Secção não disponível no painel do cliente</p></div>
      case 'cp-email-catchall':
        // return <CatchAllEmailSection sites={cyberPanelSites} /> // Removido - não usado no painel do cliente
        return <div className="p-6"><h1 className="text-2xl font-bold">Catch All Email</h1><p className="text-gray-500 mt-1">Secção não disponível no painel do cliente</p></div>
      case 'cp-email-pattern-fwd':
        // return <PatternForwardingSection sites={cyberPanelSites} /> // Removido - não usado no painel do cliente
        return <div className="p-6"><h1 className="text-2xl font-bold">Pattern Forwarding</h1><p className="text-gray-500 mt-1">Secção não disponível no painel do cliente</p></div>
      case 'cp-email-plus-addr':
        // return <PlusAddressingSection sites={cyberPanelSites} /> // Removido - não usado no painel do cliente
        return <div className="p-6"><h1 className="text-2xl font-bold">Plus Addressing</h1><p className="text-gray-500 mt-1">Secção não disponível no painel do cliente</p></div>
      case 'cp-email-change-pass':
        // return <EmailChangePasswordSection sites={cyberPanelSites} /> // Removido - não usado no painel do cliente
        return <div className="p-6"><h1 className="text-2xl font-bold">Alterar Senha Email</h1><p className="text-gray-500 mt-1">Secção não disponível no painel do cliente</p></div>
      case 'cp-email-dkim':
        // return <DKIMManagerSection sites={cyberPanelSites} /> // Removido - não usado no painel do cliente
        return <div className="p-6"><h1 className="text-2xl font-bold">DKIM Manager</h1><p className="text-gray-500 mt-1">Secção não disponível no painel do cliente</p></div>
      case 'cp-users':
        // return <CPUsersSection /> // Removido - não usado no painel do cliente
        return <div className="p-6"><h1 className="text-2xl font-bold">Utilizadores</h1><p className="text-gray-500 mt-1">Secção não disponível no painel do cliente</p></div>
      case 'cp-reseller':
        // return <ResellerSection /> // Removido - não usado no painel do cliente
        return <div className="p-6"><h1 className="text-2xl font-bold">Revenda</h1><p className="text-gray-500 mt-1">Secção não disponível no painel do cliente</p></div>
      case 'cp-ssl':
        // return <SSLSection sites={cyberPanelSites} /> // Removido - não usado no painel do cliente
        return <div className="p-6"><h1 className="text-2xl font-bold">SSL</h1><p className="text-gray-500 mt-1">Secção não disponível no painel do cliente</p></div>
      case 'cp-security':
        // return <SecuritySection sites={cyberPanelSites} /> // Removido - não usado no painel do cliente
        return <div className="p-6"><h1 className="text-2xl font-bold">Segurança</h1><p className="text-gray-500 mt-1">Secção não disponível no painel do cliente</p></div>
      case 'cp-php':
        // return <PHPConfigSection sites={cyberPanelSites} /> // Removido - não usado no painel do cliente
        return <div className="p-6"><h1 className="text-2xl font-bold">Configuração PHP</h1><p className="text-gray-500 mt-1">Secção não disponível no painel do cliente</p></div>
      case 'cp-api':
      case 'infrastructure':
        // return <APIConfigSection /> // Removido - não usado no painel do cliente
        return <div className="p-6"><h1 className="text-2xl font-bold">Configurações</h1><p className="text-gray-500 mt-1">Secção não disponível no painel do cliente</p></div>
      case 'cp-wp-list':
        // return <WPListSection sites={cyberPanelSites} setFileManagerDomain={setFileManagerDomain} setActiveSection={setActiveSection} /> // Removido - não usado no painel do cliente
        return <div className="p-6"><h1 className="text-2xl font-bold">WordPress</h1><p className="text-gray-500 mt-1">Secção não disponível no painel do cliente</p></div>
      case 'cp-wp-plugins':
        // return <WPPluginsSection sites={cyberPanelSites} /> // Removido - não usado no painel do cliente
        return <div className="p-6"><h1 className="text-2xl font-bold">Plugins WordPress</h1><p className="text-gray-500 mt-1">Secção não disponível no painel do cliente</p></div>
      case 'cp-wp-restore-backup':
        // return <WPRestoreBackupSection sites={cyberPanelSites} /> // Removido - não usado no painel do cliente
        return <div className="p-6"><h1 className="text-2xl font-bold">Restaurar Backup WordPress</h1><p className="text-gray-500 mt-1">Secção não disponível no painel do cliente</p></div>
      case 'cp-wp-remote-backup':
        // return <WPRemoteBackupSection sites={cyberPanelSites} /> // Removido - não usado no painel do cliente
        return <div className="p-6"><h1 className="text-2xl font-bold">Backup Remoto WordPress</h1><p className="text-gray-500 mt-1">Secção não disponível no painel do cliente</p></div>
      case 'cp-dns-nameserver':
        // return <DNSNameserverSection sites={cyberPanelSites} /> // Removido - não usado no painel do cliente
        return <div className="p-6"><h1 className="text-2xl font-bold">Nameservers DNS</h1><p className="text-gray-500 mt-1">Secção não disponível no painel do cliente</p></div>
      case 'cp-dns-default-ns':
        // return <DNSDefaultNSSection /> // Removido - não usado no painel do cliente
        return <div className="p-6"><h1 className="text-2xl font-bold">Default Nameservers</h1><p className="text-gray-500 mt-1">Secção não disponível no painel do cliente</p></div>
      case 'cp-dns-create-zone':
        // return <DNSCreateZoneSection sites={cyberPanelSites} /> // Removido - não usado no painel do cliente
        return <div className="p-6"><h1 className="text-2xl font-bold">Criar Zona DNS</h1><p className="text-gray-500 mt-1">Secção não disponível no painel do cliente</p></div>
      case 'domains-dns':
        return <DNSZoneEditorSection 
          sites={cyberPanelSites} 
          initialDomain={selectedDNSDomain || primaryDomain} 
        />
      case 'cp-dns-delete-zone':
        // return <DNSDeleteZoneSection sites={cyberPanelSites} /> // Removido - não usado no painel do cliente
        return <div className="p-6"><h1 className="text-2xl font-bold">Apagar Zona DNS</h1><p className="text-gray-500 mt-1">Secção não disponível no painel do cliente</p></div>
      case 'cp-dns-cloudflare':
        // return <CloudFlareSection sites={cyberPanelSites} /> // Removido - não usado no painel do cliente
        return <div className="p-6"><h1 className="text-2xl font-bold">Cloudflare</h1><p className="text-gray-500 mt-1">Secção não disponível no painel do cliente</p></div>
      case 'cp-dns-reset':
        // return <DNSResetSection sites={cyberPanelSites} /> // Removido - não usado no painel do cliente
        return <div className="p-6"><h1 className="text-2xl font-bold">Reset DNS</h1><p className="text-gray-500 mt-1">Secção não disponível no painel do cliente</p></div>
      case 'cp-dns-zone-editor':
        return <DNSZoneEditorSection sites={cyberPanelSites} />
      case 'git-deploy':
        // return <GitDeploySection /> // Removido - não usado no painel do cliente
        return <div className="p-6"><h1 className="text-2xl font-bold">Deploy GitHub</h1><p className="text-gray-500 mt-1">Secção não disponível no painel do cliente</p></div>
      case 'backup-manager':
      case 'cp-backup':
        // return <BackupManagerSection sites={cyberPanelSites} /> // Removido - não usado no painel do cliente
        return <div className="p-6"><h1 className="text-2xl font-bold">Backups</h1><p className="text-gray-500 mt-1">Secção não disponível no painel do cliente</p></div>
      case 'wordpress-install':
        // return <WordPressInstallSection sites={cyberPanelSites} /> // Removido - não usado no painel do cliente
        return <div className="p-6"><h1 className="text-2xl font-bold">Instalar WordPress</h1><p className="text-gray-500 mt-1">Secção não disponível no painel do cliente</p></div>
      case 'cp-wp-backup':
        // return <WPBackupSection sites={cyberPanelSites} /> // Removido - não usado no painel do cliente
        return <div className="p-6"><h1 className="text-2xl font-bold">Backup WordPress</h1><p className="text-gray-500 mt-1">Secção não disponível no painel do cliente</p></div>
      case 'domain-manager':
        // return <DomainManagerSection sites={cyberPanelSites} /> // Removido - não usado no painel do cliente
        return <div className="p-6"><h1 className="text-2xl font-bold">Gestor de Domínios</h1><p className="text-gray-500 mt-1">Secção não disponível no painel do cliente</p></div>
      case 'deploy':
        // return <DeploySection sites={cyberPanelSites} /> // Removido - não usado no painel do cliente
        return <div className="p-6"><h1 className="text-2xl font-bold">Deploy</h1><p className="text-gray-500 mt-1">Secção não disponível no painel do cliente</p></div>
      case 'packages-list':
        // return <PackagesSection packages={cyberPanelPackages} onRefresh={loadCyberPanelData} /> // Removido - não usado no painel do cliente
        return <div className="p-6"><h1 className="text-2xl font-bold">Pacotes</h1><p className="text-gray-500 mt-1">Secção não disponível no painel do cliente</p></div>
      default:
        return <CpanelDashboard sites={cyberPanelSites} users={cyberPanelUsers} isFetching={isFetchingCyberPanel} onNavigate={setActiveSection} onRefresh={loadCyberPanelData} onSetFileManagerDomain={setFileManagerDomain} />
    }
  }

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      {/* Sidebar */}
      <motion.div
        className="relative bg-white border-r border-gray-200 text-gray-800 flex flex-col shadow-sm"
        style={{ width: `${currentSidebarWidth}px` }}
        animate={{ width: currentSidebarWidth }}
        transition={{ duration: 0.2, ease: 'easeInOut' }}
        initial={{ width: 250 }}
      >
        {/* Sidebar Header */}
        <div className="px-2 pb-4 border-b border-gray-100 pt-4">
          {isCollapsed ? (
            <div className="flex flex-col items-center gap-3">
              <img src="/assets/simbolo.png" alt="Logo" className="w-10 h-10 object-contain cursor-pointer" onClick={() => window.location.href = '/'} />
              <button onClick={() => setIsCollapsed(!isCollapsed)} className="rounded-lg hover:bg-gray-100 transition-colors">
                <LogOut size={20} className="text-gray-500" />
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-3">
              <img src="/assets/logotipo.png" alt="VisualDesign" className="h-10 object-contain cursor-pointer" onClick={() => window.location.href = '/'} />
              <button onClick={() => setIsCollapsed(!isCollapsed)} className="ml-auto rounded-lg hover:bg-gray-100 transition-colors">
                <LogOut size={20} className="text-gray-500 rotate-180" />
              </button>
            </div>
          )}
        </div>

        {/* Menu Items */}
        <nav className="flex-1 overflow-y-auto px-2 py-2.5">
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
                  className={`w-full flex items-center ${isCollapsed ? 'justify-center' : ''} ${isCollapsed ? 'px-2 py-2' : 'p-2.5'} rounded-lg transition-colors ${
                    isActive
                      ? 'bg-red-50 text-red-600 font-bold'
                      : 'hover:bg-gray-100 text-gray-600'
                  }`}
                  title={isCollapsed ? item.label : ''}
                >
                  <Icon size={22} className={isActive ? 'text-red-600' : 'text-gray-500'} />
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
                <p className="text-xs font-bold text-gray-900 truncate">João Silva</p>
                <p className="text-[10px] text-gray-400 truncate">joao@aamihe.com</p>
              </div>
            )}
          </div>
        </div>
      </motion.div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top Header */}
        <header className="bg-white border-b border-gray-200 px-6 py-3">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 ml-6">
                Dashboard
              </h1>
              <p className="text-xs text-gray-400 mt-0.5 ml-6">
                Visão geral do servidor
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={() => window.location.href = '/'}
                className="bg-gray-700 hover:bg-red-600 text-white text-xs font-bold px-4 py-2 rounded-lg flex items-center gap-1.5 transition-colors" title="Sair">
                <LogOut size={13} />
                Sair
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
