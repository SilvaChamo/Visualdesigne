'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { motion, AnimatePresence } from 'framer-motion'
import { Menu, X, ChevronDown, Sun, Moon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { useI18n } from '@/lib/i18n'

const navigation = [
  { nameKey: 'nav.home', href: '/' },
  { nameKey: 'nav.about', href: '/sobre' },
  { nameKey: 'nav.services', href: '/servicos', dropdown: [
    { nameKey: 'services.web', href: '/servicos/web-design' },
    { nameKey: 'services.graphic', href: '/servicos/design-grafico' },
    { nameKey: 'services.marketing', href: '/servicos/marketing-digital' },
    { nameKey: 'services.dev', href: '/servicos/desenvolvimento-web' },
  ]},
  { nameKey: 'nav.portfolio', href: '/portfolio' },
  { nameKey: 'nav.courses', href: '/cursos' },
  { nameKey: 'nav.contact', href: '/contacto' },
]

export function Header() {
  const { lang, t, toggleLang } = useI18n()
  const [isOpen, setIsOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)
  const [activeDropdown, setActiveDropdown] = useState<string | null>(null)
  const [theme, setTheme] = useState<'dark' | 'light'>('dark')

  useEffect(() => {
    const savedTheme = typeof window !== 'undefined' ? localStorage.getItem('vd-theme') : null
    const initialTheme = savedTheme === 'light' ? 'light' : 'dark'

    setTheme(initialTheme)
    if (initialTheme === 'light') {
      document.documentElement.classList.add('theme-light')
    } else {
      document.documentElement.classList.remove('theme-light')
    }

    const handleScroll = () => {
      setScrolled(window.scrollY > 20)
    }

    const handleClickOutside = () => {
      setActiveDropdown(null)
    }

    window.addEventListener('scroll', handleScroll)
    document.addEventListener('click', handleClickOutside)

    return () => {
      window.removeEventListener('scroll', handleScroll)
      document.removeEventListener('click', handleClickOutside)
    }
  }, [])

  const toggleMobileMenu = () => {
    setIsOpen(!isOpen)
  }

  const handleDropdownClick = (e: React.MouseEvent, name: string) => {
    e.stopPropagation()
    setActiveDropdown(activeDropdown === name ? null : name)
  }

  const otherLangLabel = lang === 'pt' ? 'EN' : 'PT'

  const toggleTheme = (e: React.MouseEvent) => {
    e.stopPropagation()
    setTheme((prev) => {
      const next = prev === 'dark' ? 'light' : 'dark'

      if (next === 'light') {
        document.documentElement.classList.add('theme-light')
      } else {
        document.documentElement.classList.remove('theme-light')
      }

      localStorage.setItem('vd-theme', next)
      return next
    })
  }

  return (
    <motion.header
      initial={{ y: -100 }}
      animate={{ y: 0 }}
      className={cn(
        'fixed top-0 left-0 right-0 z-50 transition-all duration-300',
        scrolled ? 'bg-black/30 backdrop-blur-md shadow-lg' : 'bg-black/30 backdrop-blur-sm'
      )}
    >
      <div className="container mx-auto px-4">
        <div className="flex items-center h-16 lg:h-20 relative">
          {/* Red Blur Line Below Header */}
          <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-red-600 to-transparent" />
          
          {/* Left Section - Logo */}
          <div className="flex items-center flex-shrink-0">
            <Link href="/" className="flex items-center">
              <motion.div
                whileHover={{ scale: 1.05 }}
                className="w-12 h-12 lg:w-14 lg:h-14 rounded-lg flex items-center justify-center overflow-hidden"
              >
                <img 
                  src="/assets/Logo.png" 
                  alt="Visual Design Logo" 
                  className="w-full h-full object-contain"
                />
              </motion.div>
              <span className="font-normal text-sm lg:text-base text-white ml-0.5">
                Visual<span className="text-red-600 font-bold">Design</span>
              </span>
            </Link>
          </div>

          {/* Center Section - Navigation */}
          <div className="flex-1 flex items-center justify-center">
            <nav className="hidden lg:flex items-center space-x-8">
              {navigation.map((item) => (
                <div key={item.nameKey} className="relative">
                  {item.dropdown ? (
                    <div>
                      <button
                        onClick={(e) => handleDropdownClick(e, item.nameKey)}
                        className="flex items-center space-x-1 text-gray-300 hover:text-red-500 font-medium transition-colors py-2"
                      >
                        <span>{t(item.nameKey)}</span>
                        <ChevronDown className={cn(
                          'w-4 h-4 transition-transform',
                          activeDropdown === item.nameKey ? 'rotate-180' : ''
                        )} />
                      </button>
                      
                      <AnimatePresence>
                        {activeDropdown === item.nameKey && (
                          <motion.div
                            initial={{ opacity: 0, y: -10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -10 }}
                            className="absolute top-full left-0 mt-2 w-64 bg-black rounded-lg shadow-xl border border-gray-800 z-50"
                          >
                            <div className="p-4">
                              {item.dropdown?.map((subItem) => (
                                <Link
                                  key={subItem.nameKey}
                                  href={subItem.href}
                                  className="block px-4 py-3 text-gray-300 hover:text-red-500 hover:bg-white/5 rounded-lg transition-colors"
                                >
                                  {t(subItem.nameKey)}
                                </Link>
                              ))}
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  ) : (
                    <Link
                      href={item.href}
                      className="text-gray-300 hover:text-red-500 font-medium transition-colors py-2"
                    >
                      {t(item.nameKey)}
                    </Link>
                  )}
                </div>
              ))}
            </nav>
          </div>

          {/* Right Section - Buttons */}
          <div className="flex items-center flex-shrink-0 space-x-2">
            <Button asChild className="hidden lg:flex">
              <Link href="/contacto">{t('cta.quote')}</Link>
            </Button>
            {/* Theme & Language Toggle Buttons */}
            <button
              onClick={toggleTheme}
              className="w-8 h-8 rounded-lg bg-white/10 hover:bg-white/15 flex items-center justify-center text-white transition-colors"
              aria-label="Alternar tema"
              type="button"
            >
              {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>
            <button
              onClick={toggleLang}
              className="h-8 w-10 rounded-lg bg-white/10 hover:bg-red-600 border border-white/10 flex items-center justify-center text-white transition-colors text-xs font-extrabold"
              type="button"
            >
              {otherLangLabel}
            </button>
          </div>

          {/* Mobile Menu Button */}
          <button
            onClick={toggleMobileMenu}
            className="lg:hidden p-2 rounded-lg hover:bg-gray-900 transition-colors ml-2"
          >
            {isOpen ? <X className="w-6 h-6 text-white" /> : <Menu className="w-6 h-6 text-white" />}
          </button>
        </div>
      </div>

      {/* Mobile Menu */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="lg:hidden bg-black border-t border-gray-800"
          >
            <div className="container mx-auto px-4 py-4 space-y-4">
              {navigation.map((item) => (
                <div key={item.nameKey}>
                  {item.dropdown ? (
                    <div>
                      <button
                        onClick={(e) => handleDropdownClick(e, item.nameKey)}
                        className="flex items-center justify-between w-full text-left text-gray-300 hover:text-red-500 font-medium transition-colors py-2"
                      >
                        <span>{t(item.nameKey)}</span>
                        <ChevronDown className={cn(
                          'w-4 h-4 transition-transform',
                          activeDropdown === item.nameKey ? 'rotate-180' : ''
                        )} />
                      </button>
                      
                      <AnimatePresence>
                        {activeDropdown === item.nameKey && (
                          <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            exit={{ opacity: 0, height: 0 }}
                            className="pl-4 space-y-2"
                          >
                            {item.dropdown.map((dropdownItem) => (
                              <Link
                                key={dropdownItem.href}
                                href={dropdownItem.href}
                                className="block py-2 text-gray-400 hover:text-red-500 transition-colors"
                                onClick={() => setIsOpen(false)}
                              >
                                {t(dropdownItem.nameKey)}
                              </Link>
                            ))}
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  ) : (
                    <Link
                      href={item.href}
                      className="block text-gray-300 hover:text-red-500 font-medium transition-colors py-2"
                      onClick={() => setIsOpen(false)}
                    >
                      {t(item.nameKey)}
                    </Link>
                  )}
                </div>
              ))}
              
              <div className="pt-4 border-t border-gray-800 space-y-3">
                <button
                  onClick={toggleTheme}
                  className="w-full flex items-center justify-center gap-2 py-3 rounded-lg bg-white/10 hover:bg-white/15 border border-white/10 text-white transition-colors"
                  type="button"
                >
                  {theme === 'dark' ? (
                    <>
                      <Sun className="w-4 h-4" />
                      <span>{t('theme.light')}</span>
                    </>
                  ) : (
                    <>
                      <Moon className="w-4 h-4" />
                      <span>{t('theme.dark')}</span>
                    </>
                  )}
                </button>
                <button
                  onClick={toggleLang}
                  className="w-full flex items-center justify-center py-3 rounded-lg bg-white/10 hover:bg-red-600 border border-white/10 text-white transition-colors font-extrabold"
                  type="button"
                >
                  {otherLangLabel}
                </button>
                <Button asChild className="w-full">
                  <Link href="/contacto" onClick={() => setIsOpen(false)}>
                    {t('cta.quote')}
                  </Link>
                </Button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.header>
  )
}
