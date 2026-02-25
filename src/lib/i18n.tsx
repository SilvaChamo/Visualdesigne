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

    'services.web': 'Web Design',
    'services.graphic': 'Design Gráfico',
    'services.marketing': 'Marketing Digital',
    'services.dev': 'Desenvolvimento Web',
    'services.seo': 'SEO',
    'services.social': 'Redes Sociais',
    'services.video': 'Produção de Vídeo',
    'services.photography': 'Fotografia',
    'services.branding': 'Branding',

    'services.graphic.desc': 'Criação de identidade visual, logos, banners e materiais gráficos',
    'services.web.desc': 'Desenvolvimento de sites modernos, aplicativos e sistemas de gestão',
    'services.marketing.desc': 'Campanhas online, SEO, anúncios e gestão de redes sociais',
    'services.branding.desc': 'Construção e layouts de marcas fortes, memoráveis e impactantes',
    'services.seo.desc': 'Otimização para buscadores e ranking orgânico',
    'services.social.desc': 'Gestão de conteúdo e engajamento em redes sociais',
    'services.video.desc': 'Vídeos institucionais, comerciais e conteúdo audiovisual',
    'services.photography.desc': 'Ensaios fotográficos, festas e eventos, casamentos e produtos',

    'services.view': 'Ver Serviços',

    'home.title': 'Alojamento para nossos clientes',
    'home.subtitle': 'Encontre o domínio perfeito para seu negócio, hospedagem rápida e segura para seu site',
    'home.search.placeholder': 'Digite o nome do seu dominio',
    'home.search.button': 'Buscar',
    'home.tabs.domains': 'Domínios',
    'home.tabs.hosting': 'Hospedagem',
    'home.tabs.ssl': 'SSL',
    'home.tabs.email': 'Email',
    'home.tabs.support': 'Suporte',

    'nav.help': 'Ajuda',
    'nav.faq': 'FAQ',
    'nav.questions': 'Perguntas e Respostas',

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
    'contact.formTitle': 'Envie-nos uma mensagem',

    'admin.login.email': 'E-mail',
    'admin.login.password': 'Palavra-passe',
    'admin.login.forgot': 'Esqueceu?',
    'admin.login.submit': 'Entrar na Conta',
    'admin.login.noaccount': 'Ainda não é nosso cliente?',
    'admin.login.plans': 'Ver Planos',
    'admin.login.social': 'Junte-se a mais de',
    'admin.login.social2': 'profissionais.',
    'admin.login.ssl': 'Acesso Seguro SSL 256-bit',

    'admin.tab.sites': 'Sites',
    'admin.tab.email': 'Email',
    'admin.tab.dns': 'DNS',
    'admin.tab.packages': 'Pacotes',
    'admin.tab.wordpress': 'WordPress',
    'admin.tab.settings': 'Configurações',
    'admin.tab.clients': 'Clientes',
    'admin.tab.domains': 'Domínios',
    'admin.tab.billing': 'Faturação',

    'admin.sites.title': 'Websites',
    'admin.sites.new': 'Novo Site',
    'admin.sites.search': 'Pesquisar domínio...',
    'admin.sites.domain': 'Domínio',
    'admin.sites.package': 'Pacote',
    'admin.sites.owner': 'Proprietário',
    'admin.sites.status': 'Estado',
    'admin.sites.actions': 'Ações',
    'admin.sites.empty': 'Nenhum website encontrado',

    'admin.email.title': 'Contas de Email',
    'admin.email.new': 'Nova Conta',
    'admin.email.search': 'Pesquisar email...',
    'admin.email.quota': 'Quota',
    'admin.email.empty': 'Nenhuma conta de email encontrada',

    'admin.pkg.title': 'Pacotes de Alojamento',
    'admin.pkg.new': 'Novo Pacote',
    'admin.pkg.name': 'Nome',
    'admin.pkg.disk': 'Disco',
    'admin.pkg.bw': 'Largura de Banda',
    'admin.pkg.emails': 'Emails',
    'admin.pkg.dbs': 'Bases de Dados',
    'admin.pkg.ftp': 'FTP',
    'admin.pkg.empty': 'Nenhum pacote encontrado',

    'admin.clients.title': 'Clientes',
    'admin.clients.new': 'Nova Conta',
    'admin.clients.search': 'Pesquisar cliente...',
    'admin.clients.name': 'Nome',
    'admin.clients.email': 'Email',
    'admin.clients.domain': 'Domínio',
    'admin.clients.plan': 'Plano',
    'admin.clients.status': 'Estado',
    'admin.clients.empty': 'Nenhum cliente encontrado',

    'admin.dns.title': 'Gestão de DNS',
    'admin.dns.new': 'Novo Registo',
    'admin.dns.domain': 'Domínio',
    'admin.dns.type': 'Tipo',
    'admin.dns.value': 'Valor',
    'admin.dns.ttl': 'TTL',
    'admin.dns.empty': 'Nenhum registo DNS encontrado',

    'admin.wp.title': 'Instalar WordPress',
    'admin.wp.domain': 'Domínio',
    'admin.wp.install': 'Instalar WordPress',
    'admin.wp.installing': 'A instalar...',

    'admin.settings.title': 'Configurações',
    'admin.settings.cyberpanel': 'CyberPanel',
    'admin.settings.supabase': 'Supabase',
    'admin.settings.save': 'Guardar',
    'admin.settings.saving': 'A guardar...',
    'admin.settings.saved': 'Guardado!',

    'admin.status.active': 'Ativo',
    'admin.status.inactive': 'Inativo',
    'admin.status.suspended': 'Suspenso',
    'admin.status.pending': 'Pendente',

    'admin.btn.edit': 'Editar',
    'admin.btn.delete': 'Eliminar',
    'admin.btn.save': 'Guardar',
    'admin.btn.cancel': 'Cancelar',
    'admin.btn.create': 'Criar',
    'admin.btn.refresh': 'Atualizar',
    'admin.btn.logout': 'Terminar Sessão'
  },
  en: {
    'nav.home': 'Home',
    'nav.services': 'Services',
    'nav.portfolio': 'Portfolio',
    'nav.about': 'About Us',
    'nav.courses': 'Courses',
    'nav.contact': 'Contact',

    'services.web': 'Web Design',
    'services.graphic': 'Graphic Design',
    'services.marketing': 'Digital Marketing',
    'services.dev': 'Web Development',
    'services.seo': 'SEO',
    'services.social': 'Social Media',
    'services.video': 'Video Production',
    'services.photography': 'Photography',
    'services.branding': 'Branding',

    'services.graphic.desc': 'Creation of visual identity, logos, banners and graphic materials',
    'services.web.desc': 'Development of modern websites, applications and management systems',
    'services.marketing.desc': 'Online campaigns, SEO, advertising and social media management',
    'services.branding.desc': 'Construction and layouts of strong, memorable and impactful brands',
    'services.seo.desc': 'Search engine optimization and organic ranking',
    'services.social.desc': 'Content management and engagement on social media',
    'services.video.desc': 'Corporate videos, commercials and audiovisual content',
    'services.photography.desc': 'Photo shoots, parties and events, weddings and products',

    'services.view': 'View Services',

    'home.title': 'Hosting for our clients',
    'home.subtitle': 'Find the perfect domain for your business, fast and secure hosting for your site',
    'home.search.placeholder': 'Enter your domain name',
    'home.search.button': 'Search',
    'home.tabs.domains': 'Domains',
    'home.tabs.hosting': 'Hosting',
    'home.tabs.ssl': 'SSL',
    'home.tabs.email': 'Email',
    'home.tabs.support': 'Support',

    'nav.help': 'Help',
    'nav.faq': 'FAQ',
    'nav.questions': 'Questions & Answers',

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
    'contact.formTitle': 'Send us a message',

    'admin.login.email': 'Email',
    'admin.login.password': 'Password',
    'admin.login.forgot': 'Forgot?',
    'admin.login.submit': 'Sign In',
    'admin.login.noaccount': 'Not a client yet?',
    'admin.login.plans': 'View Plans',
    'admin.login.social': 'Join over',
    'admin.login.social2': 'professionals.',
    'admin.login.ssl': 'Secure SSL 256-bit Access',

    'admin.tab.sites': 'Sites',
    'admin.tab.email': 'Email',
    'admin.tab.dns': 'DNS',
    'admin.tab.packages': 'Packages',
    'admin.tab.wordpress': 'WordPress',
    'admin.tab.settings': 'Settings',
    'admin.tab.clients': 'Clients',
    'admin.tab.domains': 'Domains',
    'admin.tab.billing': 'Billing',

    'admin.sites.title': 'Websites',
    'admin.sites.new': 'New Site',
    'admin.sites.search': 'Search domain...',
    'admin.sites.domain': 'Domain',
    'admin.sites.package': 'Package',
    'admin.sites.owner': 'Owner',
    'admin.sites.status': 'Status',
    'admin.sites.actions': 'Actions',
    'admin.sites.empty': 'No websites found',

    'admin.email.title': 'Email Accounts',
    'admin.email.new': 'New Account',
    'admin.email.search': 'Search email...',
    'admin.email.quota': 'Quota',
    'admin.email.empty': 'No email accounts found',

    'admin.pkg.title': 'Hosting Packages',
    'admin.pkg.new': 'New Package',
    'admin.pkg.name': 'Name',
    'admin.pkg.disk': 'Disk',
    'admin.pkg.bw': 'Bandwidth',
    'admin.pkg.emails': 'Emails',
    'admin.pkg.dbs': 'Databases',
    'admin.pkg.ftp': 'FTP',
    'admin.pkg.empty': 'No packages found',

    'admin.clients.title': 'Clients',
    'admin.clients.new': 'New Account',
    'admin.clients.search': 'Search client...',
    'admin.clients.name': 'Name',
    'admin.clients.email': 'Email',
    'admin.clients.domain': 'Domain',
    'admin.clients.plan': 'Plan',
    'admin.clients.status': 'Status',
    'admin.clients.empty': 'No clients found',

    'admin.dns.title': 'DNS Management',
    'admin.dns.new': 'New Record',
    'admin.dns.domain': 'Domain',
    'admin.dns.type': 'Type',
    'admin.dns.value': 'Value',
    'admin.dns.ttl': 'TTL',
    'admin.dns.empty': 'No DNS records found',

    'admin.wp.title': 'Install WordPress',
    'admin.wp.domain': 'Domain',
    'admin.wp.install': 'Install WordPress',
    'admin.wp.installing': 'Installing...',

    'admin.settings.title': 'Settings',
    'admin.settings.cyberpanel': 'CyberPanel',
    'admin.settings.supabase': 'Supabase',
    'admin.settings.save': 'Save',
    'admin.settings.saving': 'Saving...',
    'admin.settings.saved': 'Saved!',

    'admin.status.active': 'Active',
    'admin.status.inactive': 'Inactive',
    'admin.status.suspended': 'Suspended',
    'admin.status.pending': 'Pending',

    'admin.btn.edit': 'Edit',
    'admin.btn.delete': 'Delete',
    'admin.btn.save': 'Save',
    'admin.btn.cancel': 'Cancel',
    'admin.btn.create': 'Create',
    'admin.btn.refresh': 'Refresh',
    'admin.btn.logout': 'Sign Out',

    // Authentication
    'auth.login.title': 'Entrar',
    'auth.login.subtitle': 'Gestão de Clientes',
    'auth.login.email': 'E-mail',
    'auth.login.password': 'Palavra-passe',
    'auth.login.signIn': 'Entrar',
    'auth.login.signingIn': 'A entrar...',
    'auth.login.forgotPassword': 'Esqueceu a palavra-passe?',
    'auth.login.noAccount': 'Não tem conta?',
    'auth.login.signUp': 'Registar',
    'auth.login.invalidCredentials': 'Credenciais inválidas',
    'auth.login.error': 'Erro ao fazer login',

    'auth.register.title': 'Criar Conta',
    'auth.register.fullName': 'Nome Completo',
    'auth.register.phone': 'Telefone',
    'auth.register.confirmPassword': 'Confirmar Palavra-passe',
    'auth.register.alreadyHaveAccount': 'Já tem conta?',
    'auth.register.signIn': 'Entrar',

    'auth.forgotPassword.title': 'Recuperar Palavra-passe',
    'auth.forgotPassword.description': 'Enviaremos um link para o seu email',
    'auth.forgotPassword.sendReset': 'Enviar Link de Recuperação',
    'auth.forgotPassword.backToLogin': 'Voltar ao Login',
    'auth.forgotPassword.checkEmail': 'Verifique seu email',

    'auth.resetPassword.title': 'Nova Palavra-passe',
    'auth.resetPassword.newPassword': 'Nova Palavra-passe',
    'auth.resetPassword.confirmPassword': 'Confirmar Nova Palavra-passe',
    'auth.resetPassword.updatePassword': 'Atualizar Palavra-passe',

    'auth.common.required': 'Campo obrigatório',
    'auth.common.invalidEmail': 'Email inválido',
    'auth.common.passwordMinLength': 'Palavra-passe deve ter pelo menos 6 caracteres',
    'auth.common.passwordMismatch': 'Palavra-passes não coincidem'
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
