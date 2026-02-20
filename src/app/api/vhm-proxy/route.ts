import { NextRequest, NextResponse } from 'next/server'

// VHM API Configuration
const VHM_URL = 'https://za4.mozserver.com:2087'
const VHM_USERNAME = 'yknrnlev'
const VHM_API_TOKEN = '2WTFJ8YO8QH0PCXMO6YE1QEQFM0W2YX1'
const VHM_TIMEOUT_MS = 15000 // 15 seconds

// VHM Proxy API - Server-side to bypass CORS
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { endpoint, params } = body

    // Use token from header if provided, otherwise fallback to hardcoded
    const clientToken = request.headers.get('X-VHM-Token')
    const tokenToUse = clientToken || VHM_API_TOKEN

    // Use WHM API Token format: whm username:token
    const authHeader = `whm ${VHM_USERNAME}:${tokenToUse}`

    // Convert params to query string if they exist
    let url = `${VHM_URL}${endpoint}`
    if (params && Object.keys(params).length > 0) {
      const queryParams = new URLSearchParams()
      Object.keys(params).forEach(key => {
        queryParams.append(key, String(params[key]))
      })
      url += (url.includes('?') ? '&' : '?') + queryParams.toString()
    }

    console.log(`[VHM Proxy] Request: ${endpoint}`)

    // Make request to VHM API from server with timeout
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Authorization': authHeader,
        'User-Agent': 'Mozilla/5.0 (compatible; VHM-Proxy/1.0)',
      },
      signal: AbortSignal.timeout(VHM_TIMEOUT_MS),
    })

    const data = await response.text()

    if (!response.ok) {
      console.error(`[VHM ERROR] Endpoint: ${endpoint}, Status: ${response.status}, Body: ${data.substring(0, 500)}`)
      return NextResponse.json(
        { error: `VHM API Error: ${response.status} ${response.statusText}`, raw: data },
        { status: response.status }
      )
    }

    console.log(`[VHM SUCCESS] Endpoint: ${endpoint}`)

    // Try to parse JSON
    try {
      const jsonData = JSON.parse(data)
      return NextResponse.json(jsonData)
    } catch {
      // Return raw text if not JSON
      console.log('[VHM] Response is not JSON. Preview:', data.substring(0, 100))
      return NextResponse.json({ raw: data })
    }

  } catch (error: any) {
    // Detect timeout / connection refused errors
    const isTimeout = error?.name === 'TimeoutError' ||
      error?.name === 'AbortError' ||
      error?.message?.includes('timed out') ||
      error?.message?.includes('timeout') ||
      error?.cause?.code === 'UND_ERR_CONNECT_TIMEOUT' ||
      error?.cause?.code === 'ECONNREFUSED' ||
      error?.cause?.code === 'ECONNRESET' ||
      error?.cause?.code === 'ETIMEDOUT'

    if (isTimeout) {
      console.error(`[VHM TIMEOUT] Servidor za4.mozserver.com não respondeu em ${VHM_TIMEOUT_MS / 1000}s`)
      return NextResponse.json(
        {
          error: 'Servidor VHM indisponível',
          details: `O servidor za4.mozserver.com não respondeu dentro de ${VHM_TIMEOUT_MS / 1000} segundos. O servidor pode estar em manutenção ou temporariamente inacessível. Tente novamente mais tarde.`,
          code: 'VHM_TIMEOUT'
        },
        { status: 504 }
      )
    }

    console.error('[VHM Proxy Exception]', error?.message || error)
    return NextResponse.json(
      {
        error: 'Erro interno do servidor',
        details: error instanceof Error ? error.message : 'Erro desconhecido',
        code: 'VHM_INTERNAL_ERROR'
      },
      { status: 500 }
    )
  }
}
