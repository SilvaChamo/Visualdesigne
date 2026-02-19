'use client'

import { Header } from '@/components/layout/Header'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import { ArrowLeft, Video, Camera, Film, Play, Edit3, Mic } from 'lucide-react'

export default function VideoProducao() {
  const [isScrolled, setIsScrolled] = useState(false)

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 40)
    }

    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  const servicosVideo = [
    {
      icone: <Camera className="w-8 h-8" />,
      titulo: "Vídeos Institucionais",
      descricao: "Produção completa de vídeos corporativos para apresentar sua empresa",
      servicos: ["Corporate videos", "Company presentations", "Brand videos", "Internal communications", "Annual reports"]
    },
    {
      icone: <Film className="w-8 h-8" />,
      titulo: "Vídeos Comerciais",
      descricao: "Comerciais publicitários para TV, internet e redes sociais",
      servicos: ["TV commercials", "Social media ads", "Product videos", "Testimonials", "Before/after videos"]
    },
    {
      icone: <Video className="w-8 h-8" />,
      titulo: "Vídeos para Redes Sociais",
      descricao: "Conteúdo otimizado para diferentes plataformas digitais",
      servicos: ["Instagram Reels", "TikTok videos", "YouTube content", "LinkedIn videos", "Facebook content"]
    },
    {
      icone: <Play className="w-8 h-8" />,
      titulo: "Eventos e Coberturas",
      descricao: "Registro profissional de eventos, conferências e cerimônias",
      servicos: ["Event coverage", "Conferences", "Weddings", "Corporate events", "Live streaming"]
    },
    {
      icone: <Edit3 className="w-8 h-8" />,
      titulo: "Pós-produção e Edição",
      descricao: "Edição profissional, efeitos especiais e finalização",
      servicos: ["Video editing", "Color grading", "Motion graphics", "Special effects", "Audio mixing"]
    },
    {
      icone: <Mic className="w-8 h-8" />,
      titulo: "Produção de Áudio",
      descricao: "Gravação e mixagem de áudio para vídeos e podcasts",
      servicos: ["Voice over", "Podcast production", "Sound design", "Music licensing", "Audio cleaning"]
    }
  ]

  return (
    <div className="min-h-screen bg-black/15">
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
            <h1 className="text-3xl font-bold text-white mb-2">Produção de Vídeo</h1>
            <p className="text-base text-white font-normal">
              Criamos vídeos profissionais que comunicam sua mensagem com impacto
            </p>
          </div>
        </div>
      </div>

      <div className="py-16">
        <div className="container mx-auto max-w-7xl px-6">
          <h2 className="text-2xl font-bold text-black mb-8 text-center">Nossos Serviços de Produção de Vídeo</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {servicosVideo.map((servico, index) => (
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
                  <ul className="space-y-2">
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
            <h3 className="text-xl font-bold text-black mb-4">Nosso Processo de Produção</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-gray-50 p-6 rounded-lg">
                <h4 className="font-medium text-black mb-3">Pré-produção</h4>
                <p className="text-gray-600 text-sm">Planejamento, roteiro e preparação completa</p>
              </div>
              <div className="bg-gray-50 p-6 rounded-lg">
                <h4 className="font-medium text-black mb-3">Produção</h4>
                <p className="text-gray-600 text-sm">Gravação profissional com equipamento de alta qualidade</p>
              </div>
              <div className="bg-gray-50 p-6 rounded-lg">
                <h4 className="font-medium text-black mb-3">Pós-produção</h4>
                <p className="text-gray-600 text-sm">Edição, efeitos e finalização profissional</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
