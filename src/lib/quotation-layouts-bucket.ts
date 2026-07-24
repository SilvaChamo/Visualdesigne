import { createClient } from '@supabase/supabase-js'

const BUCKET = 'quotation-layouts'

function admin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || ''
  return createClient(url, key)
}

// Idempotente — chamado a partir de POST /api/cotacoes/[id]/layouts antes do
// upload. Público (mesma decisão que 'quotation-attachments': sempre
// getPublicUrl, nunca URLs assinadas).
export async function ensureQuotationLayoutsBucket(): Promise<void> {
  const client = admin()
  const { error } = await client.storage.createBucket(BUCKET, { public: true })
  if (error && !/already exists|duplicate/i.test(error.message)) {
    console.error('[quotation-layouts-bucket] falha ao criar bucket:', error.message)
  }
}

export { BUCKET as QUOTATION_LAYOUTS_BUCKET }
