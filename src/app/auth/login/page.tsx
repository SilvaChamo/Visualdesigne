'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/components/auth/AuthProvider'
import { useI18n } from '@/lib/i18n'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [loadingGoogle, setLoadingGoogle] = useState(false)
  const [error, setError] = useState('')
  
  const { signIn, getRedirectPath } = useAuth()
  const router = useRouter()
  const { t } = useI18n()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    console.log('Login attempt:', email)

    try {
      if (password.length < 6) {
        throw new Error('A senha deve ter pelo menos 6 caracteres.')
      }

      await signIn(email, password)
      console.log('SignIn successful for:', email)
      
      const redirectPath = await getRedirectPath()
      console.log('Redirect path determined:', redirectPath)
      
      console.log('Redirecting to:', redirectPath)
      router.push(redirectPath)
    } catch (error: any) {
      console.error('Login error:', error)
      const msg = String(error?.message || '')
      if (msg.toLowerCase().includes('invalid login credentials')) {
        setError(
          `Credenciais inválidas. Confirme que:
1) a senha tem pelo menos 6 caracteres
2) o email foi confirmado (verifique a caixa de entrada/spam)
3) ou use "Esqueci a senha" para redefinir.`
        )
      } else {
        setError(error.message || 'Erro ao fazer login')
      }
    } finally {
      setLoading(false)
    }
  }

  const handleGoogleLogin = () => {
    setLoadingGoogle(true)
    setError('')
    // Redirecionar para o endpoint OAuth do Supabase
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    window.location.href = `${supabaseUrl}/auth/v1/authorize?provider=google&redirect_to=${encodeURIComponent(window.location.origin + '/auth/callback')}`
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl p-8 w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-600 rounded-full mb-4">
            <span className="text-white text-2xl font-bold">VD</span>
          </div>
          <h1 className="text-2xl font-bold text-gray-900">VisualDesign</h1>
          <p className="text-gray-600 text-sm mt-1">Gestão de Clientes</p>
        </div>

        {/* Botão Google */}
        <button
          onClick={handleGoogleLogin}
          disabled={loadingGoogle}
          className="w-full flex items-center justify-center gap-3 border border-gray-300 rounded-lg py-3 px-4 text-gray-700 font-medium hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed mb-6"
        >
          {loadingGoogle ? (
            <svg className="animate-spin h-5 w-5 text-gray-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
          ) : (
            <svg width="20" height="20" viewBox="0 0 48 48">
              <path fill="#FFC107" d="M43.6 20.1H42V20H24v8h11.3C33.7 32.9 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.1 7.9 3l5.7-5.7C34.5 6.5 29.5 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.7-.4-3.9z"/>
              <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 16 19.1 13 24 13c3.1 0 5.8 1.1 7.9 3l5.7-5.7C34.5 6.5 29.5 4 24 4 16.3 4 9.7 8.3 6.3 14.7z"/>
              <path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.3 35.5 26.8 36.5 24 36.5c-5.2 0-9.6-3.1-11.3-7.6l-6.5 5C9.5 40.1 16.3 44 24 44z"/>
              <path fill="#1976D2" d="M43.6 20.1H42V20H24v8h11.3c-.8 2.3-2.3 4.3-4.3 5.7l6.2 5.2C37 38.1 44 33 44 24c0-1.3-.1-2.7-.4-3.9z"/>
            </svg>
          )}
          {loadingGoogle ? 'A entrar...' : 'Entrar com Google'}
        </button>

        {/* Divisor */}
        <div className="flex items-center gap-3 mb-6">
          <div className="flex-1 border-t border-gray-200"></div>
          <span className="text-sm text-gray-400">ou</span>
          <div className="flex-1 border-t border-gray-200"></div>
        </div>

        {/* Form email/senha */}
        <form onSubmit={handleSubmit} className="space-y-6">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-lg text-sm">
              {error}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {t('auth.login.email')}
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="seu@email.com"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {t('auth.login.password')}
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="••••••••"
              required
              minLength={6}
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 text-white py-3 rounded-lg font-medium hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? (
              <span className="flex items-center justify-center">
                <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                {t('auth.login.signingIn')}
              </span>
            ) : (
              t('auth.login.signIn')
            )}
          </button>
        </form>

        {/* Links */}
        <div className="mt-6 text-center space-y-2">
          <Link href="/auth/forgot-password" className="text-sm text-blue-600 hover:text-blue-700">
            {t('auth.login.forgotPassword')}
          </Link>
          
          <div className="text-sm text-gray-600">
            {t('auth.login.noAccount')}{' '}
            <Link href="/auth/register" className="text-blue-600 hover:text-blue-700">
              {t('auth.login.signUp')}
            </Link>
          </div>
        </div>

        {/* Admin Access */}
        <div className="mt-6 pt-6 border-t border-gray-200">
          <div className="text-xs text-gray-500 text-center">
            <p>Admin Access:</p>
            <p>Email: geral@visualdesign.ao</p>
            <p>Use sua senha de admin</p>
          </div>
        </div>
      </div>
    </div>
  )
}
