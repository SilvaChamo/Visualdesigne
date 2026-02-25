import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export const runtime = 'experimental-edge'

export async function middleware(req: NextRequest) {
  const res = NextResponse.next()
  
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co'
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder-key'
  const supabase = createClient(supabaseUrl, supabaseAnonKey)

  const { data: { session } } = await supabase.auth.getSession()
  const { pathname } = req.nextUrl

  // Rotas públicas — deixar passar sem verificação
  const publicRoutes = ['/', '/servicos', '/portfolio', '/sobre-nos', '/contacto', '/precos', '/auth']
  const isPublic = publicRoutes.some(route => pathname.startsWith(route))
  if (isPublic) return res

  // Se não tem sessão e tenta aceder rota protegida → login
  if (!session) {
    return NextResponse.redirect(new URL('/auth/login', req.url))
  }

  const userEmail = session.user.email
  const userRole = session.user.user_metadata?.role

  const adminEmails = ['admin@visualdesigne.com', 'silva.chamo@gmail.com']
  let role = 'client'
  if (adminEmails.includes(userEmail || '') || userRole === 'admin') role = 'admin'
  else if (userRole === 'reseller') role = 'reseller'

  // Proteger /admin — só admin
  if (pathname.startsWith('/admin') && role !== 'admin') {
    return NextResponse.redirect(new URL('/client', req.url))
  }

  // Proteger /dashboard — só reseller e admin
  if (pathname.startsWith('/dashboard') && role === 'client') {
    return NextResponse.redirect(new URL('/client', req.url))
  }

  return res
}

export const config = {
  matcher: ['/dashboard/:path*', '/client/:path*']
}
