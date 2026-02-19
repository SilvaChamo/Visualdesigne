'use client'

import { Header } from '@/components/layout/Header'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import { ArrowLeft, Camera, Calendar, MapPin, Users, Heart } from 'lucide-react'

export default function Fotografia() {
  const [isScrolled, setIsScrolled] = useState(false)

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 40)
    }

    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  const eventosFotograficos = [
    {
      icone: <Camera className="w-8 h-8" />,
      titulo: "Ensaios Fotográficos",
      descricao: "Ensaios individuais, casais e familiares em estúdio ou locação",
      servicos: ["Book individual", "Book casal", "Book família", "Ensaios gestantes"]
    },
    {
      icone: <Calendar className="w-8 h-8" />,
      titulo: "Eventos e Festas",
      descricao: "Cobertura completa de eventos sociais, corporativos e festas particulares",
      servicos: ["Aniversários", "Casamentos", "Formaturas", "Eventos corporativos"]
    },
    {
      icone: <MapPin className="w-8 h-8" />,
      titulo: "Fotografia de Viagem",
      descricao: "Registro de suas viagens e aventuras com cobertura nacional e internacional",
      servicos: ["Acompanhamento fotográfico", "Ensaios em destinos", "Documentário de viagem"]
    },
    {
      icone: <Users className="w-8 h-8" />,
      titulo: "Retratos Corporativos",
      descricao: "Fotografia profissional para equipes, executivos e materiais institucionais",
      servicos: ["Retratos individuais", "Fotos de equipe", "Headshots profissionais"]
    },
    {
      icone: <Heart className="w-8 h-8" />,
      titulo: "Fotografia de Produtos",
      descricao: "Catalogação fotográfica para e-commerce, catálogos e materiais de marketing",
      servicos: ["Fotos de produto", "Still life", "Catalogação completa"]
    }
  ]

  return (
    <div className="min-h-screen bg-white">
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
            <h1 className="text-3xl font-bold text-white mb-2">Fotografia Profissional</h1>
            <p className="text-base text-white font-normal">
              Capturamos seus melhores momentos com qualidade e criatividade
            </p>
          </div>
        </div>
      </div>

      <div className="bg-white py-16">
        <div className="container mx-auto max-w-7xl px-6">
          <h2 className="text-2xl font-bold text-black mb-8 text-center">Nossos Serviços Fotográficos</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {eventosFotograficos.map((evento, index) => (
              <div key={index} className="bg-black text-white p-6 rounded-lg hover:bg-red-600 transition-colors">
                <div className="flex items-center mb-4">
                  <div className="text-red-500 mr-3">
                    {evento.icone}
                  </div>
                  <h3 className="text-xl font-bold">{evento.titulo}</h3>
                </div>
                
                <p className="text-gray-300 mb-6 text-sm leading-relaxed">
                  {evento.descricao}
                </p>
                
                <div className="mb-6">
                  <h4 className="font-medium mb-3 text-sm">Serviços incluídos:</h4>
                  <ul className="space-y-2">
                    {evento.servicos.map((servico, idx) => (
                      <li key={idx} className="flex items-center text-gray-300 text-sm">
                        <span className="w-2 h-2 bg-red-500 rounded-full mr-3"></span>
                        {servico}
                      </li>
                    ))}
                  </ul>
                </div>
                
                <button className="w-full bg-white text-black px-4 py-3 rounded font-medium hover:bg-gray-100 transition-colors">
                  Solicitar Orçamento
                </button>
              </div>
            ))}
          </div>

          <div className="mt-16 text-center">
            <h3 className="text-xl font-bold text-black mb-4">Por que escolher nossa fotografia?</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-gray-50 p-6 rounded-lg">
                <h4 className="font-medium text-black mb-3">Equipamento Profissional</h4>
                <p className="text-gray-600 text-sm">Câmeras de última geração, lentes profissionais e iluminação adequada</p>
              </div>
              <div className="bg-gray-50 p-6 rounded-lg">
                <h4 className="font-medium text-black mb-3">Experiência Comprovada</h4>
                <p className="text-gray-600 text-sm">Mais de 10 anos de experiência em diversos tipos de eventos</p>
              </div>
              <div className="bg-gray-50 p-6 rounded-lg">
                <h4 className="font-medium text-black mb-3">Prazo de Entrega</h4>
                <p className="text-gray-600 text-sm">Edição e entrega das fotos em até 15 dias úteis</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
