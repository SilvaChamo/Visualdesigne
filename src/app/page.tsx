'use client'

import { Header } from '@/components/layout/Header'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Search, ArrowRight, Sparkles } from 'lucide-react'

export default function Inicio() {
  const [activeTab, setActiveTab] = useState('Domínios')
  const [searchQuery, setSearchQuery] = useState('')
  const [isScrolled, setIsScrolled] = useState(false)

  const tabs = ['Domínios', 'Hospedagem', 'SSL', 'Email', 'Suporte']

  const frequentQuestions = [
    {
      category: 'Domínios',
      questions: [
        'Como registrar um domínio?',
        'Quanto custa um domínio .mz?',
        'Como transferir meu domínio?',
        'O que é DNS?'
      ]
    },
    {
      category: 'Hospedagem',
      questions: [
        'Qual plano de hospedagem escolher?',
        'Como migrar meu site?',
        'Hospedagem WordPress disponível?',
        'Backup automático incluído?'
      ]
    },
    {
      category: 'SSL',
      questions: [
        'Por que preciso de certificado SSL?',
        'Como instalar SSL no meu site?',
        'SSL gratuito ou pago?',
        'Validação SSL demora quanto?'
      ]
    },
    {
      category: 'Email',
      questions: [
        'Como criar email profissional?',
        'Configurar email no celular?',
        'Quantas contas de email?',
        'Email com meu domínio?'
      ]
    },
    {
      category: 'Suporte',
      questions: [
        'Suporte 24/7 disponível?',
        'Como abrir chamado técnico?',
        'Tempo de resposta do suporte?',
        'Suporte via telefone?'
      ]
    }
  ]

  const currentQuestions = frequentQuestions.find(q => q.category === activeTab)?.questions || []

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 40)
    }

    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  return (
    <div className="min-h-screen bg-black/10">
      {/* Top Menu Bar - Aparece apenas sem scroll */}
      {!isScrolled && (
        <div className="fixed top-0 left-0 right-0 z-[60] bg-black h-[40px] flex items-center transition-all duration-300 shadow-lg">
          <div className="container mx-auto max-w-7xl px-6 grid grid-cols-3 items-center h-full">
            <div className="flex justify-start">
              <a href="#faq" className="text-white text-sm hover:text-red-500 transition-colors">Ajuda</a>
            </div>
            <div className="flex justify-center">
              <a href="#faq" className="text-white text-sm hover:text-red-500 transition-colors">FAQ</a>
            </div>
            <div className="flex justify-end">
              <a href="#faq" className="text-white text-sm hover:text-red-500 transition-colors">Perguntas e Respostas</a>
            </div>
          </div>
        </div>
      )}
      
      {/* Header - Fixo e ocupa espaço do top menu quando scrolled */}
      <Header isScrolled={isScrolled} />
      
      {/* Header Section - Gray 25% */}
      <div className="bg-[#404040] relative overflow-hidden">
        <div 
          className="absolute inset-0 bg-cover bg-center bg-no-repeat opacity-20"
          style={{ backgroundImage: "url('/assets/BG.jpg')" }}
        />
        <div className="absolute inset-0 bg-black/50" />
        <div className="container mx-auto max-w-7xl px-6 pt-[150px] pb-[20px] flex flex-col justify-between items-center min-h-[400px] relative z-10">
          <div className="w-full max-w-4xl text-center">
            <h1 className="text-3xl font-bold text-white mb-2">
              Encontre o domínio perfeito para seu negócio
            </h1>
            <p className="text-base text-white mb-[30px] font-normal">
              Registre seu domínio com confiança. Hospedagem rápida e segura para seu site.
            </p>
            
            {/* Domain Search Box */}
            <div className="flex justify-center mb-[40px]">
              <div className="flex flex-col sm:flex-row gap-3 w-full max-w-2xl">
                <input
                  type="text"
                  placeholder="Digite seu domínio..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="flex-1 px-4 py-[6px] rounded-[6px] bg-white text-black border border-gray-300 focus:outline-none focus:ring-2 focus:ring-red-500"
                />
                <select className="px-4 py-[6px] rounded-[6px] bg-white text-black border border-gray-300 focus:outline-none focus:ring-2 focus:ring-red-500 w-32">
                  <option value="todos">Todos</option>
                  <option value=".mz">.mz</option>
                  <option value=".com">.com</option>
                  <option value=".org">.org</option>
                  <option value=".net">.net</option>
                </select>
                <button className="bg-red-600 hover:bg-red-700 text-white px-6 py-[6px] rounded-[6px] flex items-center gap-2 transition-colors">
                  <Search className="w-5 h-5" />
                  Verificar
                </button>
              </div>
            </div>

            {/* Tabs */}
            <div className="flex justify-center pb-0 mb-0">
              <div className="flex flex-wrap justify-center gap-2 mb-0">
                {tabs.map((tab) => (
                  <button
                    key={tab}
                    onClick={() => {
                      setActiveTab(tab)
                      // Redirecionar para página específica
                      if (tab === 'Domínios') window.location.href = '/precos/dominios'
                      else if (tab === 'Hospedagem') window.location.href = '/precos/hospedagem'
                      else if (tab === 'SSL') window.location.href = '/precos/ssl'
                      else if (tab === 'Email') window.location.href = '/precos/email'
                      else if (tab === 'Suporte') window.location.href = '/precos/suporte'
                    }}
                    className={`px-6 py-3 rounded-lg font-medium transition-all py-[5px] relative ${
                      activeTab === tab
                        ? 'bg-red-600 text-white'
                        : 'bg-black text-white hover:bg-red-600'
                    }`}
                  >
                    {tab}
                  </button>
                ))}
              </div>
            </div>
          </div>
          
          {/* Service Categories - Bottom Center */}
          {/* <div className="w-full max-w-4xl text-center mt-4">
            <div className="flex flex-wrap justify-center gap-4">
              <Link href="/servicos/design-grafico" className="text-white hover:text-red-500 transition-colors font-medium text-sm">
                Design Gráfico
              </Link>
              <Link href="/servicos/webdesign" className="text-white hover:text-red-500 transition-colors font-medium text-sm">
                Web Design
              </Link>
              <Link href="/servicos/marketing-digital" className="text-white hover:text-red-500 transition-colors font-medium text-sm">
                Marketing Digital
              </Link>
              <Link href="/servicos/branding" className="text-white hover:text-red-500 transition-colors font-medium text-sm">
                Branding
              </Link>
              <Link href="/servicos/seo" className="text-white hover:text-red-500 transition-colors font-medium text-sm">
                SEO
              </Link>
              <Link href="/servicos/redes-sociais" className="text-white hover:text-red-500 transition-colors font-medium text-sm">
                Redes Sociais
              </Link>
              <Link href="/servicos/video-producao" className="text-white hover:text-red-500 transition-colors font-medium text-sm">
                Produção de Vídeo
              </Link>
              <Link href="/servicos/fotografia" className="text-white hover:text-red-500 transition-colors font-medium text-sm">
                Fotografia
              </Link>
            </div>
          </div> */}
        </div>
      </div>

      {/* Content Section */}
      <div>
        <div className="container mx-auto max-w-7xl px-6 py-8">
          {/* Design Services */}
          <div className="text-center">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-white text-black/70 p-4 rounded-lg">
                <h4 className="font-medium mb-2">Design Gráfico</h4>
                <div className="text-black/70 text-sm mb-4">Criação de identidade visual, logos, banners e materiais gráficos</div>
                <Link href="/servicos/design-grafico" className="bg-black text-white px-4 py-2 rounded text-sm font-medium hover:bg-red-600 hover:text-white transition-colors inline-block cursor-pointer">
                  Ver Serviços
                </Link>
              </div>
              <div className="bg-white text-black/70 p-4 rounded-lg">
                <h4 className="font-medium mb-2">Web Design</h4>
                <p className="text-black/70 text-sm mb-4">Desenvolvimento de sites modernos, aplicativos e sistemas de gestão</p>
                <Link href="/servicos/webdesign" className="bg-black text-white px-4 py-2 rounded text-sm font-medium hover:bg-red-600 hover:text-white transition-colors inline-block cursor-pointer">
                  Ver Serviços
                </Link>
              </div>
              <div className="bg-white text-black/70 p-4 rounded-lg">
                <h4 className="font-medium mb-2">Marketing Digital</h4>
                <p className="text-black/70 text-sm mb-4">Campanhas online, SEO, anúncios e gestão de redes sociais</p>
                <Link href="/servicos/marketing-digital" className="bg-black text-white px-4 py-2 rounded text-sm font-medium hover:bg-red-600 hover:text-white transition-colors inline-block cursor-pointer">
                  Ver Serviços
                </Link>
              </div>
              <div className="bg-white text-black/70 p-4 rounded-lg">
                <h4 className="font-medium mb-2">Branding</h4>
                <p className="text-black/70 text-sm mb-4">Construção e layouts de marcas fortes, memoráveis e impactantes</p>
                <Link href="/servicos/branding" className="bg-black text-white px-4 py-2 rounded text-sm font-medium hover:bg-red-600 hover:text-white transition-colors inline-block cursor-pointer">
                  Ver Serviços
                </Link>
              </div>
              <div className="bg-white text-black/70 p-4 rounded-lg">
                <h4 className="font-medium mb-2">SEO</h4>
                <p className="text-black/70 text-sm mb-4">Otimização para buscadores e ranking orgânico</p>
                <Link href="/servicos/seo" className="bg-black text-white px-4 py-2 rounded text-sm font-medium hover:bg-red-600 hover:text-white transition-colors inline-block cursor-pointer">
                  Ver Serviços
                </Link>
              </div>
              <div className="bg-white text-black/70 p-4 rounded-lg">
                <h4 className="font-medium mb-2">Redes Sociais</h4>
                <p className="text-black/70 text-sm mb-4">Gestão de conteúdo e engajamento em redes sociais</p>
                <Link href="/servicos/redes-sociais" className="bg-black text-white px-4 py-2 rounded text-sm font-medium hover:bg-red-600 hover:text-white transition-colors inline-block cursor-pointer">
                  Ver Serviços
                </Link>
              </div>
              <div className="bg-white text-black/70 p-4 rounded-lg">
                <h4 className="font-medium mb-2">Produção de Vídeo</h4>
                <p className="text-black/70 text-sm mb-4">Vídeos institucionais, comerciais e conteúdo audiovisual</p>
                <Link href="/servicos/video-producao" className="bg-black text-white px-4 py-2 rounded text-sm font-medium hover:bg-red-600 hover:text-white transition-colors inline-block cursor-pointer">
                  Ver Serviços
                </Link>
              </div>
              <div className="bg-white text-black/70 p-4 rounded-lg">
                <h4 className="font-medium mb-2">Fotografia</h4>
                <p className="text-black/70 text-sm mb-4">Ensaios fotográficos, festas e eventos, casamentos e produtos</p>
                <Link href="/servicos/fotografia" className="bg-black text-white px-4 py-2 rounded text-sm font-medium hover:bg-red-600 hover:text-white transition-colors inline-block cursor-pointer">
                  Ver Serviços
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
