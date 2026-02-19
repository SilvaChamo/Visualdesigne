'use client'

import { Header } from '@/components/layout/Header'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import { ArrowLeft, TrendingUp, Target, Megaphone, BarChart3, Users, Search } from 'lucide-react'

export default function MarketingDigital() {
  const [isScrolled, setIsScrolled] = useState(false)

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 40)
    }

    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  const servicosMarketing = [
    {
      icone: <TrendingUp className="w-8 h-8" />,
      titulo: "SEO Marketing",
      descricao: "Otimização completa para buscadores e aumento de tráfego orgânico",
      servicos: ["SEO on-page", "SEO técnico", "Link building", "SEO local", "SEO de conteúdo"]
    },
    {
      icone: <Target className="w-8 h-8" />,
      titulo: "Marketing de Conteúdo",
      descricao: "Criação estratégica de conteúdo para engajar e converter",
      servicos: ["Blog posts", "E-books", "Infográficos", "Vídeos", "Podcasts"]
    },
    {
      icone: <Megaphone className="w-8 h-8" />,
      titulo: "Anúncios Pagos",
      descricao: "Campanhas em Google Ads, Facebook Ads e outras plataformas",
      servicos: ["Google Ads", "Facebook Ads", "Instagram Ads", "LinkedIn Ads", "Display ads"]
    },
    {
      icone: <BarChart3 className="w-8 h-8" />,
      titulo: "Análise e Métricas",
      descricao: "Monitoramento completo de performance e relatórios detalhados",
      servicos: ["Google Analytics", "Heatmaps", "A/B testing", "Relatórios mensais", "KPIs tracking"]
    },
    {
      icone: <Users className="w-8 h-8" />,
      titulo: "Gestão de Redes Sociais",
      descricao: "Administração completa de redes sociais com conteúdo estratégico",
      servicos: ["Content calendar", "Community management", "Social ads", "Influencer marketing", "Social listening"]
    },
    {
      icone: <Search className="w-8 h-8" />,
      titulo: "Email Marketing",
      descricao: "Campanhas de email automatizadas e segmentadas",
      servicos: ["Newsletters", "Email automation", "Lead nurturing", "Segmentação", "Email design"]
    }
  ]

  return (
    <div className="min-h-screen bg-black/10">
      {/* Top Menu Bar */}
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
      
      <Header isScrolled={isScrolled} />
      
      <div className="bg-[#404040] relative overflow-hidden">
        <div 
          className="absolute inset-0 bg-cover bg-center bg-no-repeat opacity-20"
          style={{ backgroundImage: "url('/assets/BG.jpg')" }}
        />
        <div className="absolute inset-0 bg-black/50" />
        <div className="container mx-auto max-w-7xl px-6 pt-[150px] pb-[80px] flex items-center justify-center min-h-[300px] relative z-10">
          <div className="text-center">
            <div className="flex items-center justify-center mb-4">
              <Link href="/" className="text-white hover:text-red-500 transition-colors flex items-center">
                <ArrowLeft className="w-5 h-5 mr-2" />
                Voltar para Home
              </Link>
            </div>
            <h1 className="text-3xl font-bold text-white mb-2">Marketing Digital</h1>
            <p className="text-base text-white font-normal">
              Estratégias digitais completas para aumentar sua visibilidade e vendas
            </p>
          </div>
        </div>
      </div>

      <div className="py-16">
        <div className="container mx-auto max-w-7xl px-6">
          <h2 className="text-2xl font-bold text-black mb-8 text-center">Nossos Serviços de Marketing Digital</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {servicosMarketing.map((servico, index) => (
              <div key={index} className="bg-white text-black/70 p-6 rounded-lg">
                <div className="flex items-center mb-4">
                  <div className="text-red-500 mr-3">
                    {servico.icone}
                  </div>
                  <h3 className="text-xl font-bold">{servico.titulo}</h3>
                </div>
                
                <p className="text-black/70 mb-6 text-sm leading-relaxed">
                  {servico.descricao}
                </p>
                
                <div className="mb-6">
                  <h4 className="font-medium mb-3 text-sm">Serviços incluídos:</h4>
                  <ul className="space-y-0">
                    {servico.servicos.map((item, idx) => (
                      <li key={idx} className="flex items-center text-black/70 text-sm">
                        <span className="w-2 h-2 bg-red-500 rounded-full mr-3"></span>
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>
                
                <button className="w-full bg-black text-white px-4 py-3 rounded font-medium hover:bg-red-600 hover:text-white transition-colors">
                  Solicitar Orçamento
                </button>
              </div>
            ))}
          </div>

          <div className="mt-16 text-center">
            <h3 className="text-xl font-bold text-black mb-4">Nossa Abordagem Estratégica</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-gray-50 p-6 rounded-lg">
                <h4 className="font-medium text-black mb-3">Análise de Mercado</h4>
                <p className="text-gray-600 text-sm">Estudo completo do seu nicho e concorrentes</p>
              </div>
              <div className="bg-gray-50 p-6 rounded-lg">
                <h4 className="font-medium text-black mb-3">Estratégia Personalizada</h4>
                <p className="text-gray-600 text-sm">Plano de ação customizado para seus objetivos</p>
              </div>
              <div className="bg-gray-50 p-6 rounded-lg">
                <h4 className="font-medium text-black mb-3">Otimização Contínua</h4>
                <p className="text-gray-600 text-sm">Monitoramento e ajustes constantes para melhores resultados</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
