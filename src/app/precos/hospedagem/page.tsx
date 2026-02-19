'use client'

import { Header } from '@/components/layout/Header'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'

export default function PrecosHospedagem() {
  const [isScrolled, setIsScrolled] = useState(false)

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 40)
    }

    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  return (
    <div className="min-h-screen bg-white">
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
        <div className="container mx-auto max-w-7xl px-6 pt-[100px] pb-[60px] flex items-center justify-center min-h-[300px] relative z-10">
          <div className="text-center">
            <div className="flex items-center justify-center mb-4">
              <Link href="/" className="text-white hover:text-red-500 transition-colors flex items-center">
                <ArrowLeft className="w-5 h-5 mr-2" />
                Voltar para Home
              </Link>
            </div>
            <h1 className="text-3xl font-bold text-white mb-2">
              Planos de Hospedagem
            </h1>
            <p className="text-base text-white font-normal">
              Hospedagem rápida e segura para seu site
            </p>
          </div>
        </div>
      </div>

      {/* Pricing Section */}
      <div className="bg-white py-16">
        <div className="container mx-auto max-w-7xl px-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="bg-white rounded-lg shadow-lg p-6 hover:shadow-xl transition-shadow">
              <h4 className="text-xl font-bold text-black mb-4">Básico</h4>
              <div className="text-3xl font-bold text-red-600 mb-4">250 MZN<span className="text-lg font-normal">/mês</span></div>
              <ul className="space-y-2 mb-6">
                <li className="flex items-center"><span className="text-green-500 mr-2">✓</span> 10 GB Armazenamento</li>
                <li className="flex items-center"><span className="text-green-500 mr-2">✓</span> 100 GB Bandwidth</li>
                <li className="flex items-center"><span className="text-green-500 mr-2">✓</span> 5 Contas E-mail</li>
                <li className="flex items-center"><span className="text-green-500 mr-2">✓</span> 1 Banco de Dados</li>
                <li className="flex items-center"><span className="text-green-500 mr-2">✓</span> Backup Diário</li>
              </ul>
              <button className="w-full bg-red-600 hover:bg-red-700 text-white py-3 rounded-lg font-medium transition-colors">
                Contratar
              </button>
            </div>
            
            <div className="bg-white rounded-lg shadow-lg p-6 hover:shadow-xl transition-shadow border-2 border-red-500">
              <h4 className="text-xl font-bold text-black mb-4">Profissional</h4>
              <div className="text-3xl font-bold text-red-600 mb-4">500 MZN<span className="text-lg font-normal">/mês</span></div>
              <ul className="space-y-2 mb-6">
                <li className="flex items-center"><span className="text-green-500 mr-2">✓</span> 50 GB Armazenamento</li>
                <li className="flex items-center"><span className="text-green-500 mr-2">✓</span> 500 GB Bandwidth</li>
                <li className="flex items-center"><span className="text-green-500 mr-2">✓</span> 20 Contas E-mail</li>
                <li className="flex items-center"><span className="text-green-500 mr-2">✓</span> 5 Bancos de Dados</li>
                <li className="flex items-center"><span className="text-green-500 mr-2">✓</span> Backup Diário</li>
                <li className="flex items-center"><span className="text-green-500 mr-2">✓</span> SSL Gratuito</li>
              </ul>
              <button className="w-full bg-red-600 hover:bg-red-700 text-white py-3 rounded-lg font-medium transition-colors">
                Contratar
              </button>
            </div>
            
            <div className="bg-white rounded-lg shadow-lg p-6 hover:shadow-xl transition-shadow">
              <h4 className="text-xl font-bold text-black mb-4">Business</h4>
              <div className="text-3xl font-bold text-red-600 mb-4">1.000 MZN<span className="text-lg font-normal">/mês</span></div>
              <ul className="space-y-2 mb-6">
                <li className="flex items-center"><span className="text-green-500 mr-2">✓</span> 100 GB Armazenamento SSD</li>
                <li className="flex items-center"><span className="text-green-500 mr-2">✓</span> 1 TB Bandwidth</li>
                <li className="flex items-center"><span className="text-green-500 mr-2">✓</span> 50 Contas E-mail</li>
                <li className="flex items-center"><span className="text-green-500 mr-2">✓</span> 10 Bancos de Dados</li>
                <li className="flex items-center"><span className="text-green-500 mr-2">✓</span> Backup Diário</li>
                <li className="flex items-center"><span className="text-green-500 mr-2">✓</span> SSL Gratuito</li>
                <li className="flex items-center"><span className="text-green-500 mr-2">✓</span> Suporte Prioritário</li>
              </ul>
              <button className="w-full bg-red-600 hover:bg-red-700 text-white py-3 rounded-lg font-medium transition-colors">
                Contratar
              </button>
            </div>
            
            <div className="bg-white rounded-lg shadow-lg p-6 hover:shadow-xl transition-shadow">
              <h4 className="text-xl font-bold text-black mb-4">Enterprise</h4>
              <div className="text-3xl font-bold text-red-600 mb-4">2.500 MZN<span className="text-lg font-normal">/mês</span></div>
              <ul className="space-y-2 mb-6">
                <li className="flex items-center"><span className="text-green-500 mr-2">✓</span> 200 GB Armazenamento SSD</li>
                <li className="flex items-center"><span className="text-green-500 mr-2">✓</span> 2 TB Bandwidth</li>
                <li className="flex items-center"><span className="text-green-500 mr-2">✓</span> 100 Contas E-mail</li>
                <li className="flex items-center"><span className="text-green-500 mr-2">✓</span> 20 Bancos de Dados</li>
                <li className="flex items-center"><span className="text-green-500 mr-2">✓</span> Backup Diário</li>
                <li className="flex items-center"><span className="text-green-500 mr-2">✓</span> SSL Gratuito</li>
                <li className="flex items-center"><span className="text-green-500 mr-2">✓</span> Suporte 24/7</li>
                <li className="flex items-center"><span className="text-green-500 mr-2">✓</span> IP Dedicado</li>
              </ul>
              <button className="w-full bg-red-600 hover:bg-red-700 text-white py-3 rounded-lg font-medium transition-colors">
                Contratar
              </button>
            </div>
          </div>

          <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-gray-50 rounded-lg p-6">
              <h3 className="text-lg font-bold text-black mb-3">Recursos técnicos</h3>
              <ul className="space-y-2 text-gray-600">
                <li className="flex items-start">
                  <span className="text-green-500 mr-2">✓</span>
                  <span>Servidores SSD NVMe</span>
                </li>
                <li className="flex items-start">
                  <span className="text-green-500 mr-2">✓</span>
                  <span>PHP 7.4, 8.0, 8.1, 8.2</span>
                </li>
                <li className="flex items-start">
                  <span className="text-green-500 mr-2">✓</span>
                  <span>MySQL, PostgreSQL</span>
                </li>
              </ul>
            </div>
            
            <div className="bg-gray-50 rounded-lg p-6">
              <h3 className="text-lg font-bold text-black mb-3">Segurança</h3>
              <ul className="space-y-2 text-gray-600">
                <li className="flex items-start">
                  <span className="text-green-500 mr-2">✓</span>
                  <span>Firewall avançado</span>
                </li>
                <li className="flex items-start">
                  <span className="text-green-500 mr-2">✓</span>
                  <span>Proteção DDoS</span>
                </li>
                <li className="flex items-start">
                  <span className="text-green-500 mr-2">✓</span>
                  <span>SSL gratuito</span>
                </li>
              </ul>
            </div>
            
            <div className="bg-gray-50 rounded-lg p-6">
              <h3 className="text-lg font-bold text-black mb-3">Suporte</h3>
              <ul className="space-y-2 text-gray-600">
                <li className="flex items-start">
                  <span className="text-green-500 mr-2">✓</span>
                  <span>Chat 24/7</span>
                </li>
                <li className="flex items-start">
                  <span className="text-green-500 mr-2">✓</span>
                  <span>E-mail prioritário</span>
                </li>
                <li className="flex items-start">
                  <span className="text-green-500 mr-2">✓</span>
                  <span>Telefone (planos Business+)</span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
