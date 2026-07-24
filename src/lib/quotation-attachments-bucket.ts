import { createClient } from '@supabase/supabase-js'

const BUCKET = 'quotation-attachments'

function admin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || ''
  return createClient(url, key)
}

// Idempotente — chamado a partir de POST /api/cotacoes/[id]/anexos antes do
// upload. Público (mesma decisão que o resto da app: MultiFileUpload/
// /api/storage-upload sempre devolvem getPublicUrl, nunca URLs assinadas).
export async function ensureQuotationAttachmentsBucket(): Promise<void> {
  const client = admin()
  const { error } = await client.storage.createBucket(BUCKET, { public: true })
  if (error && !/already exists|duplicate/i.test(error.message)) {
    console.error('[quotation-attachments-bucket] falha ao criar bucket:', error.message)
  }
}

export { BUCKET as QUOTATION_ATTACHMENTS_BUCKET }
