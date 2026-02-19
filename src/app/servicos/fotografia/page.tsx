'use client'

import { Header } from '@/components/layout/Header'
import { I18nProvider, useI18n } from '@/lib/i18n'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import { ArrowLeft, Camera, Calendar, MapPin, Users, Heart } from 'lucide-react'

export default function Fotografia() {
  const { t } = useI18n()
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
    <div className="min-h-screen bg-black/10">
      {/* Breadcrumb Navigation */}
      <div className="bg-white border-b border-gray-200">
        <div className="container mx-auto max-w-7xl px-6 py-3">
          <div className="flex items-center space-x-2 text-sm">
            <Link href="/" className="text-black hover:text-red-600 transition-colors">
              Home
            </Link>
            <span className="text-gray-400">/</span>
            <span className="text-black font-medium">Fotografia</span>
          </div>
        </div>
      </div>

      {/* Header */}
      <Header isScrolled={isScrolled} />
      
      {/* Content Section */}
      <div className="py-16">
        <div className="container mx-auto max-w-7xl px-6">
          <h2 className="text-2xl font-bold text-black mb-8 text-center">Fotografia Profissional</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {eventosFotograficos.map((evento, index) => (
              <div key={index} className="bg-white text-black/70 p-6 rounded-lg">
                <div className="flex items-center mb-4">
                  <div className="text-red-500 mr-3">
                    {evento.icone}
                  </div>
                  <h3 className="text-xl font-bold">{evento.titulo}</h3>
                </div>
                
                <p className="text-black/70 mb-6 text-sm leading-relaxed">
                  {evento.descricao}
                </p>
                
                <div className="mb-6">
                  <h4 className="font-medium mb-3 text-sm">Serviços incluídos:</h4>
                  <ul className="space-y-0">
                    {evento.servicos.map((servico, idx) => (
                      <li key={idx} className="flex items-center text-black/70 text-sm">
                        <span className="w-2 h-2 bg-red-500 rounded-full mr-3"></span>
                        {servico}
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
