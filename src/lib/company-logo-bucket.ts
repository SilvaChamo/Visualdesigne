import { createClient } from '@supabase/supabase-js'

const BUCKET = 'company-logos'

function admin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || ''
  return createClient(url, key)
}

// Idempotente — chamado a partir de POST /api/mailmarketing-logo antes do
// upload. Público (mesma decisão que o resto da app: os clientes de email
// precisam de conseguir carregar a imagem sem autenticação).
export async function ensureCompanyLogoBucket(): Promise<void> {
  const client = admin()
  const { error } = await client.storage.createBucket(BUCKET, { public: true })
  if (error && !/already exists|duplicate/i.test(error.message)) {
    console.error('[company-logo-bucket] falha ao criar bucket:', error.message)
  }
}

export { BUCKET as COMPANY_LOGO_BUCKET }
