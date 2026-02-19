// Sistema de Autenticação Administrativa
export const ADMIN_CREDENTIALS = {
  email: 'silva.chamo@gmail.com',
  password: 'Meckito#77'
}

// Verificar se as credenciais são válidas
export function validateAdminCredentials(email: string, password: string): boolean {
  return email === ADMIN_CREDENTIALS.email && password === ADMIN_CREDENTIALS.password
}

// Gerar token de sessão (simplificado)
export function generateAdminToken(): string {
  const token = btoa(`${ADMIN_CREDENTIALS.email}:${Date.now()}`)
  return token
}

// Verificar token de sessão
export function validateAdminToken(token: string): boolean {
  try {
    const decoded = atob(token)
    const [email] = decoded.split(':')
    return email === ADMIN_CREDENTIALS.email
  } catch {
    return false
  }
}
