'use client'

import React, { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Eye, EyeOff, Lock, Mail, ArrowRight, Loader2, ShieldCheck, Sparkles } from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

export default function LoginPage() {
    const router = useRouter()
    const [isLoading, setIsLoading] = useState(false)
    const [showPassword, setShowPassword] = useState(false)
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [error, setError] = useState('')

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault()
        setIsLoading(true)
        setError('')

        const ADMIN_EMAIL = 'silva.chamo@gmail.com'
        const ADMIN_PASS = 'Meckito#77'

        // Simulation of login - to be connected with Supabase/Admin Auth
        setTimeout(() => {
            if (email === ADMIN_EMAIL && password === ADMIN_PASS) {
                // Set admin token for /admin access
                const token = btoa(`${ADMIN_EMAIL}:${Date.now()}`)
                localStorage.setItem('admin-token', token)
                router.push('/admin')
            } else if (email.includes('@') && password.length >= 6) {
                // Generic user login simulation
                localStorage.setItem('user-session', 'true')
                router.push('/dashboard')
            } else {
                setError('Credenciais inválidas. Verifique os seus dados.')
                setIsLoading(false)
            }
        }, 1500)
    }

    return (
        <div className="min-h-screen bg-white flex flex-col md:flex-row relative overflow-hidden font-exo-2">
            {/* Left Side - Visual/Branding (Fullscreen height on desktop) */}
            <div className="md:w-[45%] lg:w-[40%] bg-black p-8 lg:p-16 flex flex-col justify-between relative overflow-hidden min-h-[300px] md:min-h-screen">
                {/* Animated background pattern */}
                <div className="absolute inset-0 opacity-20">
                    <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-red-600/30 via-transparent to-transparent" />
                </div>

                <div className="relative z-10">
                    <Link href="/" className="inline-flex items-center gap-2 group">
                        <motion.div
                            whileHover={{ rotate: 90 }}
                            className="w-10 h-10 bg-red-600 rounded-[10px] flex items-center justify-center"
                        >
                            <img src="/assets/simbolo.png" alt="Visual Design" className="w-6 h-6 object-contain brightness-0 invert" />
                        </motion.div>
                        <span className="text-2xl font-black text-white tracking-tighter uppercase">Visual<span className="text-red-600">Design</span></span>
                    </Link>
                </div>

                <div className="relative z-10 my-12 md:my-0">
                    <motion.div
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: 0.2 }}
                        className="inline-flex items-center gap-2 px-3 py-1 rounded-[8px] bg-red-600/10 text-red-500 text-[10px] font-bold uppercase tracking-widest mb-6 border border-red-600/20"
                    >
                        <Sparkles className="w-3 h-3" />
                        Área Exclusiva
                    </motion.div>
                    <h2 className="text-4xl lg:text-5xl font-black text-white leading-none mb-6 tracking-tighter">
                        A sua visão,<br />
                        <span className="text-red-600">o nosso design.</span>
                    </h2>
                    <p className="text-gray-400 text-lg font-medium max-w-sm">
                        Aceda ao seu painel e gira todos os seus serviços de forma inteligente e integrada.
                    </p>
                </div>

                <div className="relative z-10 flex items-center gap-6">
                    <div className="flex -space-x-3">
                        {[1, 2, 3].map(i => (
                            <div key={i} className="w-10 h-10 rounded-full border-2 border-black bg-gray-800 flex items-center justify-center overflow-hidden">
                                <img src={`https://i.pravatar.cc/100?u=${i}`} alt="user" />
                            </div>
                        ))}
                    </div>
                    <p className="text-sm text-gray-500 font-medium">
                        Junte-se a mais de <span className="text-white font-bold">500+</span> profissionais.
                    </p>
                </div>
            </div>

            {/* Right Side - Login Form (Centered Vertically) */}
            <div className="flex-1 flex flex-col justify-center items-center bg-white p-8 lg:p-16 min-h-screen">
                <motion.div
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="max-w-md w-full"
                >
                    <div className="mb-10 text-center md:text-left">
                        <h3 className="text-3xl font-black text-gray-900 mb-2 tracking-tight">Bem-vindo de volta!</h3>
                        <p className="text-gray-500 font-medium">Introduza os seus dados para aceder à conta.</p>
                    </div>

                    <form onSubmit={handleLogin} className="space-y-6">
                        <AnimatePresence mode="wait">
                            {error && (
                                <motion.div
                                    initial={{ opacity: 0, height: 0 }}
                                    animate={{ opacity: 1, height: 'auto' }}
                                    exit={{ opacity: 0, height: 0 }}
                                    className="bg-red-50 text-red-600 p-4 rounded-[10px] text-sm font-bold flex items-center gap-3 border border-red-100"
                                >
                                    <div className="w-6 h-6 rounded-full bg-red-100 flex items-center justify-center shrink-0">
                                        <X className="w-4 h-4" />
                                    </div>
                                    {error}
                                </motion.div>
                            )}
                        </AnimatePresence>

                        <div className="space-y-4">
                            <div>
                                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5 ml-1">E-mail</label>
                                <div className="relative group">
                                    <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-red-500 transition-colors">
                                        <Mail className="w-5 h-5" />
                                    </div>
                                    <input
                                        type="email"
                                        required
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        placeholder="exemplo@gmail.com"
                                        className="w-full pl-12 pr-4 py-4 bg-gray-50 border border-gray-100 rounded-[10px] focus:ring-4 focus:ring-red-600/5 focus:bg-white focus:border-red-600 outline-none transition-all font-medium"
                                    />
                                </div>
                            </div>

                            <div>
                                <div className="flex justify-between items-center mb-1.5 ml-1">
                                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Palavra-passe</label>
                                    <Link href="#" className="text-[10px] font-bold text-red-600 hover:underline uppercase tracking-widest">Esqueceu a senha?</Link>
                                </div>
                                <div className="relative group">
                                    <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-red-500 transition-colors">
                                        <Lock className="w-5 h-5" />
                                    </div>
                                    <input
                                        type={showPassword ? "text" : "password"}
                                        required
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        placeholder="••••••••"
                                        className="w-full pl-12 pr-12 py-4 bg-gray-50 border border-gray-100 rounded-[10px] focus:ring-4 focus:ring-red-600/5 focus:bg-white focus:border-red-600 outline-none transition-all font-medium"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowPassword(!showPassword)}
                                        className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                                    >
                                        {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                                    </button>
                                </div>
                            </div>
                        </div>

                        <button
                            type="submit"
                            disabled={isLoading}
                            className="w-full py-4 bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white rounded-[10px] font-black uppercase tracking-widest shadow-xl shadow-red-900/20 transition-all flex items-center justify-center gap-3 group"
                        >
                            {isLoading ? (
                                <Loader2 className="w-5 h-5 animate-spin" />
                            ) : (
                                <>
                                    Entrar na Conta
                                    <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                                </>
                            )}
                        </button>
                    </form>

                    <div className="mt-10 pt-10 border-t border-gray-50 text-center">
                        <p className="text-gray-500 text-sm font-medium mb-6">Ainda não é nosso cliente?</p>
                        <Link
                            href="/servicos"
                            className="inline-flex items-center gap-2 px-8 py-3 bg-gray-900 hover:bg-black text-white rounded-[10px] font-bold text-sm transition-all shadow-lg"
                        >
                            Descobrir Planos
                        </Link>
                    </div>
                </motion.div>
            </div>

            {/* Bottom Security Badge */}
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.5 }}
                className="absolute bottom-8 right-8 flex items-center gap-2 text-gray-400"
            >
                <ShieldCheck className="w-4 h-4" />
                <span className="text-[10px] font-bold uppercase tracking-widest">Acesso Seguro SSL 256-bit</span>
            </motion.div>
        </div>
    )
}

function X({ className }: { className?: string }) {
    return (
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><path d="M18 6 6 18" /><path d="m6 6 12 12" /></svg>
    )
}
