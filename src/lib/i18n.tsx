'use client'

import React, { createContext, useContext, useEffect, useMemo, useState } from 'react'

export type Lang = 'pt' | 'en'

type Dict = Record<string, string>

type I18nContextValue = {
  lang: Lang
  toggleLang: () => void
  t: (key: string) => string
}

const I18nContext = createContext<I18nContextValue | null>(null)

const dict: Record<Lang, Dict> = {
  pt: {
    'nav.home': 'Início',
    'nav.services': 'Serviços',
    'nav.portfolio': 'Portfolio',
    'nav.about': 'Sobre Nós',
    'nav.courses': 'Cursos',
    'nav.contact': 'Contacto',
    'nav.help': 'Ajuda',

    'services.web': 'Web Design',
    'services.graphic': 'Design Gráfico',
    'services.marketing': 'Marketing Digital',
    'services.dev': 'Desenvolvimento Web',

    'cta.quote': 'Orçamento Gratuito',

    'theme.light': 'Tema claro',
    'theme.dark': 'Tema escuro',

    'lang.english': 'Inglês',
    'lang.portuguese': 'Português',

    'banner.badge.1': 'Agência de Design Premiada em Maputo',
    'banner.badge.2': '15+ Anos de Experiência',
    'banner.badge.3': '98% de Satisfação',

    'banner.title.1': 'Transformamos suas\nIdeias em Realidade Digital',
    'banner.title.2': 'Design Inovador\nPara o Seu Negócio',
    'banner.title.3': 'Resultados que\nImpulsionam o Crescimento',

    'banner.desc.1': 'Criamos experiências digitais excepcionais que impulsionam seu negócio. Web design, desenvolvimento e marketing digital que geram resultados.',
    'banner.desc.2': 'Soluções criativas e modernas que destacam sua marca no mercado digital. Transformamos sua visão em realidade.',
    'banner.desc.3': 'Estratégias digitais comprovadas que aumentam sua visibilidade e convertem visitantes em clientes.',

    'banner.card.title.1': 'Transformação Digital',
    'banner.card.title.2': 'Design Criativo',
    'banner.card.title.3': 'Resultados Comprovados',

    'banner.card.sub.1': 'Inovação e Tecnologia de ponta',
    'banner.card.sub.2': 'Soluções criativas e modernas',
    'banner.card.sub.3': 'Estratégias que geram crescimento',

    'banner.button.portfolio': 'Ver Portfolio',

    'contact.name': 'Nome',
    'contact.email': 'Email',
    'contact.phone': 'Telefone',
    'contact.message': 'Mensagem',
    'contact.service': 'Serviço de Interesse',
    'contact.selectService': 'Selecione um serviço',
    'contact.send': 'Enviar Mensagem',
    'contact.sending': 'Enviando...',
    'contact.success': 'Mensagem enviada com sucesso!',
    'contact.successMessage': 'Entraremos em contato em breve.',
    'contact.title': 'Entre em Contato',
    'contact.subtitle': 'Estamos prontos para transformar suas ideias em realidade digital.',
    'contact.formTitle': 'Envie-nos uma mensagem'
  },
  en: {
    'nav.home': 'Home',
    'nav.services': 'Services',
    'nav.portfolio': 'Portfolio',
    'nav.about': 'About Us',
    'nav.courses': 'Courses',
    'nav.contact': 'Contact',
    'nav.help': 'Help',

    'services.web': 'Web Design',
    'services.graphic': 'Graphic Design',
    'services.marketing': 'Digital Marketing',
    'services.dev': 'Web Development',

    'cta.quote': 'Free Quote',

    'theme.light': 'Light theme',
    'theme.dark': 'Dark theme',

    'lang.english': 'English',
    'lang.portuguese': 'Portuguese',

    'banner.badge.1': 'Award-Winning Design Agency in Maputo',
    'banner.badge.2': '15+ Years of Experience',
    'banner.badge.3': '98% Satisfaction',

    'banner.title.1': 'We turn your\nIdeas into Digital Reality',
    'banner.title.2': 'Innovative Design\nFor Your Business',
    'banner.title.3': 'Results that\nDrive Growth',

    'banner.desc.1': 'We create exceptional digital experiences that grow your business. Web design, development, and digital marketing that deliver results.',
    'banner.desc.2': 'Creative and modern solutions that make your brand stand out in the digital market. We turn your vision into reality.',
    'banner.desc.3': 'Proven digital strategies that increase visibility and convert visitors into customers.',

    'banner.card.title.1': 'Digital Transformation',
    'banner.card.title.2': 'Creative Design',
    'banner.card.title.3': 'Proven Results',

    'banner.card.sub.1': 'Innovation and cutting-edge tech',
    'banner.card.sub.2': 'Creative and modern solutions',
    'banner.card.sub.3': 'Strategies that drive growth',

    'banner.button.portfolio': 'View Portfolio',

    'contact.name': 'Name',
    'contact.email': 'Email',
    'contact.phone': 'Phone',
    'contact.message': 'Message',
    'contact.service': 'Service of Interest',
    'contact.selectService': 'Select a service',
    'contact.send': 'Send Message',
    'contact.sending': 'Sending...',
    'contact.success': 'Message sent successfully!',
    'contact.successMessage': 'We will get in touch shortly.',
    'contact.title': 'Get in Touch',
    'contact.subtitle': 'We are ready to transform your ideas into digital reality.',
    'contact.formTitle': 'Send us a message'
  },
}

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLang] = useState<Lang>('pt')

  useEffect(() => {
    const saved = localStorage.getItem('vd-lang')
    const initial: Lang = saved === 'en' ? 'en' : 'pt'
    setLang(initial)
  }, [])

  useEffect(() => {
    localStorage.setItem('vd-lang', lang)
    document.documentElement.lang = lang === 'pt' ? 'pt-MZ' : 'en'
  }, [lang])

  const value = useMemo<I18nContextValue>(() => {
    const t = (key: string) => dict[lang][key] ?? key
    const toggleLang = () => setLang((prev) => (prev === 'pt' ? 'en' : 'pt'))
    return { lang, t, toggleLang }
  }, [lang])

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>
}

export function useI18n() {
  const ctx = useContext(I18nContext)
  if (!ctx) throw new Error('useI18n must be used within I18nProvider')
  return ctx
}
