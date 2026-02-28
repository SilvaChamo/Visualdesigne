import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get('code')

  if (code) {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    const supabase = createClient(supabaseUrl, supabaseAnonKey)
    
    await supabase.auth.exchangeCodeForSession(code)

    // Obter utilizador e determinar destino
    const { data: { user } } = await supabase.auth.getUser()

    if (user) {
  const userEmail = user.email || ''
  const userRole = user.user_metadata?.role
  const adminEmails = ['admin@visualdesigne.com', 'geral@visualdesign.ao', 'silva.chamo@gmail.com']
  let redirectPath = '/client'
  if (adminEmails.includes(userEmail) || userRole === 'admin') {
    redirectPath = '/admin'
  } else if (userRole === 'reseller') {
    redirectPath = '/dashboard'
  }
  return NextResponse.redirect(new URL(redirectPath, requestUrl.origin))
}
  }

  return NextResponse.redirect(new URL('/auth/login', requestUrl.origin))
}
