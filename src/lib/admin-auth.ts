// Sistema de Autenticação Administrativa
const AUTH_VERSION = 'v2'

export const ADMIN_CREDENTIALS = {
  email: 'silva.chamo@gmail.com',
  password: '0001'
}

// Verificar se as credenciais são válidas
export function validateAdminCredentials(email: string, password: string): boolean {
  return email === ADMIN_CREDENTIALS.email && password === ADMIN_CREDENTIALS.password
}

// Gerar token de sessão (simplificado)
export function generateAdminToken(): string {
  const token = btoa(`${AUTH_VERSION}:${ADMIN_CREDENTIALS.email}:${Date.now()}`)
  return token
}

// Verificar token de sessão
export function validateAdminToken(token: string): boolean {
  try {
    const decoded = atob(token)
    const [version, email] = decoded.split(':')
    return version === AUTH_VERSION && email === ADMIN_CREDENTIALS.email
  } catch {
    return false
  }
}
