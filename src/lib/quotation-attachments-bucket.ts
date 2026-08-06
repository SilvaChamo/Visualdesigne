import { createClient } from '@supabase/supabase-js'

const BUCKET = 'quotation-attachments'

function admin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || ''
  return createClient(url, key)
}

// #11: privado — este bucket guarda comprovativos de pagamento (M-Pesa/
// transferência) de clientes e revendedores, além de anexos de cotação.
// Era público com getPublicUrl (URL permanente, sem autenticação nenhuma) —
// qualquer pessoa com o link via talões e comprovativos bancários de outras
// pessoas. updateBucket cobre buckets já criados como públicos antes desta
// correcção (createBucket sozinho não muda um bucket já existente).
export async function ensureQuotationAttachmentsBucket(): Promise<void> {
  const client = admin()
  const { error } = await client.storage.createBucket(BUCKET, { public: false })
  if (error && !/already exists|duplicate/i.test(error.message)) {
    console.error('[quotation-attachments-bucket] falha ao criar bucket:', error.message)
  }
  const { error: updateError } = await client.storage.updateBucket(BUCKET, { public: false })
  if (updateError) {
    console.error('[quotation-attachments-bucket] falha ao tornar o bucket privado:', updateError.message)
  }
}

const SIGNED_URL_TTL_SECONDS = 60 * 60

/**
 * Extrai o caminho dentro do bucket a partir do que estiver gravado — pode
 * ser só o caminho (a partir desta correcção) ou uma URL pública/assinada
 * antiga (ficheiros enviados antes desta correcção, compatibilidade).
 */
export function extractStoragePath(stored: string): string {
  const publicMarker = `/object/public/${BUCKET}/`
  const publicIdx = stored.indexOf(publicMarker)
  if (publicIdx !== -1) return decodeURIComponent(stored.slice(publicIdx + publicMarker.length))

  const signedMarker = `/object/sign/${BUCKET}/`
  const signedIdx = stored.indexOf(signedMarker)
  if (signedIdx !== -1) return decodeURIComponent(stored.slice(signedIdx + signedMarker.length).split('?')[0])

  return stored
}

/** URL temporário (1h) para mostrar/descarregar um ficheiro deste bucket — nunca `getPublicUrl`, o bucket é privado. */
export async function getAttachmentSignedUrl(stored: string | null | undefined): Promise<string | null> {
  if (!stored) return null
  const path = extractStoragePath(stored)
  const { data, error } = await admin().storage.from(BUCKET).createSignedUrl(path, SIGNED_URL_TTL_SECONDS)
  if (error || !data?.signedUrl) {
    console.error('[quotation-attachments-bucket] falha a assinar URL:', path, error?.message)
    return null
  }
  return data.signedUrl
}

/** Mesmo que getAttachmentSignedUrl, mas para várias linhas de uma vez (evita N chamadas sequenciais). */
export async function getAttachmentSignedUrls(stored: (string | null | undefined)[]): Promise<(string | null)[]> {
  return Promise.all(stored.map((s) => getAttachmentSignedUrl(s)))
}

export { BUCKET as QUOTATION_ATTACHMENTS_BUCKET }
