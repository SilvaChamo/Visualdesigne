import sharp from 'sharp'

const MAX_BYTES_DEFAULT = 100 * 1024
const MAX_DIMENSION = 1600
// Poucos passos de propósito: cada passo com palette:true refaz a quantização
// inteira, e em imagens adversárias (ruído puro, sem padrão) isso pode demorar
// dezenas de segundos por passo — mantém o pior caso limitado.
const QUALITY_STEPS = [80, 60, 40]
// Rede de segurança: fotos/logótipos reais comprimem em bem menos de 1s por
// passo (testado); só uma imagem adversária (ruído puro em vez de conteúdo
// real) chegaria aqui. Nesse caso é preferível subir o ficheiro original do
// que bloquear o pedido.
const TIME_BUDGET_MS = 10_000

const COMPRESSIBLE_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp'])

const TIMED_OUT = Symbol('timed-out')

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T | typeof TIMED_OUT> {
  return Promise.race([
    promise,
    new Promise<typeof TIMED_OUT>((resolve) => setTimeout(() => resolve(TIMED_OUT), ms)),
  ])
}

/**
 * Recomprime uma imagem para no máximo `maxBytes`, tentando manter a
 * qualidade visual: primeiro reduz dimensões absurdas (fotos de câmara/telemóvel
 * chegam facilmente a 4000px+, muito acima do que qualquer layout do site mostra),
 * depois desce a qualidade JPEG/PNG em passos até caber no limite.
 * PNGs com transparência mantêm-se PNG; o resto converte para JPEG (muito mais
 * compressível). Ficheiros que não sejam imagem, ou já dentro do limite, passam
 * sem alteração.
 */
export async function compressImageToMaxSize(
  input: Buffer,
  mimeType: string,
  maxBytes: number = MAX_BYTES_DEFAULT
): Promise<{ buffer: Buffer; contentType: string }> {
  if (!COMPRESSIBLE_TYPES.has(mimeType)) {
    return { buffer: input, contentType: mimeType }
  }
  if (input.length <= maxBytes) {
    return { buffer: input, contentType: mimeType }
  }

  const deadline = Date.now() + TIME_BUDGET_MS

  let pipeline: ReturnType<typeof sharp>
  let hasAlpha = false
  try {
    pipeline = sharp(input, { failOn: 'none' }).rotate()
    const meta = await pipeline.metadata()
    hasAlpha = !!meta.hasAlpha
    if ((meta.width || 0) > MAX_DIMENSION || (meta.height || 0) > MAX_DIMENSION) {
      pipeline = pipeline.resize({
        width: MAX_DIMENSION,
        height: MAX_DIMENSION,
        fit: 'inside',
        withoutEnlargement: true,
      })
    }
  } catch {
    // Ficheiro não é uma imagem válida para o sharp — devolve como veio.
    return { buffer: input, contentType: mimeType }
  }

  const contentType = hasAlpha ? 'image/png' : 'image/jpeg'
  let best: Buffer | null = null

  for (const quality of QUALITY_STEPS) {
    const remaining = deadline - Date.now()
    if (remaining <= 0) break

    const attempt = hasAlpha
      ? pipeline.clone().png({ quality, compressionLevel: 9, palette: true }).toBuffer()
      : pipeline.clone().jpeg({ quality, mozjpeg: true }).toBuffer()

    const result = await withTimeout(attempt, remaining)
    if (result === TIMED_OUT) break

    best = result
    if (result.length <= maxBytes) break
  }

  if (!best) {
    // Nem um único passo terminou a tempo (imagem adversária) — mais vale
    // devolver o original do que falhar o upload.
    return { buffer: input, contentType: mimeType }
  }

  return { buffer: best, contentType }
}
