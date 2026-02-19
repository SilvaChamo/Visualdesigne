'use client'

import { Header } from '@/components/layout/Header'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import { ArrowLeft, Share2, Calendar, TrendingUp, Users, MessageSquare, Target } from 'lucide-react'

export default function RedesSociais() {
  const [isScrolled, setIsScrolled] = useState(false)

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 40)
    }

    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  const servicosRedesSociais = [
    {
      icone: <Share2 className="w-8 h-8" />,
      titulo: "Gestão de Conteúdo",
      descricao: "Criação e publicação estratégica de conteúdo para todas as redes",
      servicos: ["Content calendar", "Post creation", "Copywriting", "Visual design", "Hashtag strategy"]
    },
    {
      icone: <Calendar className="w-8 h-8" />,
      titulo: "Planejamento Estratégico",
      descricao: "Desenvolvimento de estratégias personalizadas para cada plataforma",
      servicos: ["Social media strategy", "Platform selection", "Content pillars", "Campaign planning", "Goal setting"]
    },
    {
      icone: <TrendingUp className="w-8 h-8" />,
      titulo: "Análise e Métricas",
      descricao: "Monitoramento completo de performance e relatórios detalhados",
      servicos: ["Performance tracking", "Engagement analysis", "Follower growth", "ROI analysis", "Monthly reports"]
    },
    {
      icone: <Users className="w-8 h-8" />,
      titulo: "Community Management",
      descricao: "Gestão ativa da comunidade e engajamento com seguidores",
      servicos: ["Comment moderation", "Customer service", "Community engagement", "Crisis management", "Brand voice consistency"]
    },
    {
      icone: <MessageSquare className="w-8 h-8" />,
      titulo: "Social Ads",
      descricao: "Campanhas pagas em redes sociais para aumentar alcance e conversões",
      servicos: ["Facebook Ads", "Instagram Ads", "LinkedIn Ads", "Twitter Ads", "TikTok Ads"]
    },
    {
      icone: <Target className="w-8 h-8" />,
      titulo: "Influencer Marketing",
      descricao: "Parcerias estratégicas com influenciadores para amplificar sua marca",
      servicos: ["Influencer identification", "Campaign management", "Partnership negotiation", "Content collaboration", "Performance tracking"]
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
            <h1 className="text-3xl font-bold text-white mb-2">Gestão de Redes Sociais</h1>
            <p className="text-base text-white font-normal">
              Gerenciamos suas redes sociais para aumentar engajamento e resultados
            </p>
          </div>
        </div>
      </div>

      <div className="py-16">
        <div className="container mx-auto max-w-7xl px-6">
          <h2 className="text-2xl font-bold text-black mb-8 text-center">Nossos Serviços de Redes Sociais</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {servicosRedesSociais.map((servico, index) => (
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
            <h3 className="text-xl font-bold text-black mb-4">Nossa Metodologia de Trabalho</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-gray-50 p-6 rounded-lg">
                <h4 className="font-medium text-black mb-3">Diagnóstico e Estratégia</h4>
                <p className="text-gray-600 text-sm">Análise completa das suas redes sociais e definição de objetivos</p>
              </div>
              <div className="bg-gray-50 p-6 rounded-lg">
                <h4 className="font-medium text-black mb-3">Criação e Gestão</h4>
                <p className="text-gray-600 text-sm">Produção de conteúdo e gerenciamento diário das redes</p>
              </div>
              <div className="bg-gray-50 p-6 rounded-lg">
                <h4 className="font-medium text-black mb-3">Análise e Otimização</h4>
                <p className="text-gray-600 text-sm">Monitoramento de resultados e ajustes estratégicos</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
