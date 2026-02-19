'use client'

import { Header } from '@/components/layout/Header'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import { ArrowLeft, Palette, PenTool, Layers, Download } from 'lucide-react'

export default function DesignGrafico() {
  const [isScrolled, setIsScrolled] = useState(false)

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 40)
    }

    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  const servicosDesign = [
    {
      icone: <Palette className="w-8 h-8" />,
      titulo: "Identidade Visual",
      descricao: "Criação completa da identidade visual da sua marca com logo, cores e tipografia",
      servicos: ["Logo design", "Paleta de cores", "Tipografia", "Manual de marca"]
    },
    {
      icone: <PenTool className="w-8 h-8" />,
      titulo: "Materiais Gráficos",
      descricao: "Desenvolvimento de todos os materiais gráficos para sua comunicação visual",
      servicos: ["Cartões de visita", "Papeteria", "Brindes", "Material de escritório"]
    },
    {
      icone: <Layers className="w-8 h-8" />,
      titulo: "Design para Redes Sociais",
      descricao: "Criação de posts, stories e banners para suas redes sociais",
      servicos: ["Posts para Instagram", "Banners Facebook", "Capas YouTube", "Templates LinkedIn"]
    },
    {
      icone: <Download className="w-8 h-8" />,
      titulo: "Design para Impressão",
      descricao: "Arquivos prontos para impressão em diversos formatos e materiais",
      servicos: ["Flyers e folhetos", "Outdoors", "Banner impressos", "Material POP"]
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
            <h1 className="text-3xl font-bold text-white mb-2">Design Gráfico Profissional</h1>
            <p className="text-base text-white font-normal">
              Criamos identidades visuais marcantes e materiais gráficos de impacto
            </p>
          </div>
        </div>
      </div>

      <div className="py-16">
        <div className="container mx-auto max-w-7xl px-6">
          <h2 className="text-2xl font-bold text-black mb-8 text-center">Nossos Serviços de Design Gráfico</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-8">
            {servicosDesign.map((servico, index) => (
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
                <h4 className="font-medium text-black mb-3">Briefing Completo</h4>
                <p className="text-gray-600 text-sm">Análise detalhada do seu negócio e público-alvo</p>
              </div>
              <div className="bg-gray-50 p-6 rounded-lg">
                <h4 className="font-medium text-black mb-3">Apresentação de Mockups</h4>
                <p className="text-gray-600 text-sm">Visualização do projeto antes da finalização</p>
              </div>
              <div className="bg-gray-50 p-6 rounded-lg">
                <h4 className="font-medium text-black mb-3">Entrega de Arquivos</h4>
                <p className="text-gray-600 text-sm">Formatos profissionais para impressão e uso digital</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
