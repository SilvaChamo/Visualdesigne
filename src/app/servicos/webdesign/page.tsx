'use client'

import { Header } from '@/components/layout/Header'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import { ArrowLeft, Monitor, Smartphone, Globe, Code, Palette, Zap } from 'lucide-react'

export default function WebDesign() {
  const [isScrolled, setIsScrolled] = useState(false)

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 40)
    }

    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  const servicosWebDesign = [
    {
      icone: <Monitor className="w-8 h-8" />,
      titulo: "Sites Institucionais",
      descricao: "Desenvolvimento de sites corporativos com design moderno e funcional",
      servicos: ["Landing pages", "Sites empresariais", "Portais institucionais", "Sites governamentais"]
    },
    {
      icone: <Smartphone className="w-8 h-8" />,
      titulo: "Design Responsivo",
      descricao: "Sites que se adaptam perfeitamente a todos os dispositivos e tamanhos de tela",
      servicos: ["Mobile-first design", "Tablet adaptation", "Desktop optimization", "Cross-browser compatibility"]
    },
    {
      icone: <Globe className="w-8 h-8" />,
      titulo: "E-commerce",
      descricao: "Lojas virtuais completas com sistema de pagamento e gestão de produtos",
      servicos: ["Lojas online", "Catálogos digitais", "Sistemas de pagamento", "Gestão de estoque"]
    },
    {
      icone: <Code className="w-8 h-8" />,
      titulo: "Desenvolvimento Customizado",
      descricao: "Soluções sob medida para necessidades específicas de negócio",
      servicos: ["Aplicações web", "Sistemas customizados", "Integrações API", "Dashboards"]
    },
    {
      icone: <Palette className="w-8 h-8" />,
      titulo: "UI/UX Design",
      descricao: "Design de interface focado na experiência do usuário",
      servicos: ["Wireframing", "Prototipagem", "Testes de usabilidade", "Design systems"]
    },
    {
      icone: <Zap className="w-8 h-8" />,
      titulo: "Performance e SEO",
      descricao: "Otimização de velocidade e posicionamento em buscadores",
      servicos: ["SEO on-page", "Otimização de velocidade", "Core Web Vitals", "Analytics setup"]
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
            <h1 className="text-3xl font-bold text-white mb-2">Web Design Profissional</h1>
            <p className="text-base text-white font-normal">
              Criamos sites modernos, responsivos e otimizados para conversão
            </p>
          </div>
        </div>
      </div>

      <div className="py-16">
        <div className="container mx-auto max-w-7xl px-6">
          <h2 className="text-2xl font-bold text-black mb-8 text-center">Nossos Serviços de Web Design</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {servicosWebDesign.map((servico, index) => (
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
                <h4 className="font-medium text-black mb-3">Descoberta e Planejamento</h4>
                <p className="text-gray-600 text-sm">Análise completa do seu negócio e definição de objetivos</p>
              </div>
              <div className="bg-gray-50 p-6 rounded-lg">
                <h4 className="font-medium text-black mb-3">Design e Desenvolvimento</h4>
                <p className="text-gray-600 text-sm">Criação iterativa com feedback constante do cliente</p>
              </div>
              <div className="bg-gray-50 p-6 rounded-lg">
                <h4 className="font-medium text-black mb-3">Lançamento e Suporte</h4>
                <p className="text-gray-600 text-sm">Deploy completo e manutenção contínua</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
