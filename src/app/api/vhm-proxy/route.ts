import { NextRequest, NextResponse } from 'next/server'

// VHM Proxy API - Server-side to bypass CORS
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { endpoint, params } = body

    // VHM API Configuration
    const vhmUrl = 'https://za4.mozserver.com:2087'
    const username = 'yknrnlev'
    const apiToken = '2WTFJ8YO8QH0PCXMO6YE1QEQFM0W2YX1'

    // Use WHM API Token format: whm username:token
    const authHeader = `whm ${username}:${apiToken}`

    // Convert params to query string if they exist
    let url = `${vhmUrl}${endpoint}`
    if (params && Object.keys(params).length > 0) {
      const queryParams = new URLSearchParams()
      Object.keys(params).forEach(key => {
        queryParams.append(key, params[key])
      })
      url += (url.includes('?') ? '&' : '?') + queryParams.toString()
    }

    console.log('VHM Proxy Request (API Token):', url)

    // Make request to VHM API from server
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Authorization': authHeader,
        'User-Agent': 'Mozilla/5.0 (compatible; VHM-Proxy/1.0)',
      },
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
      console.log('VHM API RESPONSE IS NOT JSON')
      return NextResponse.json({ raw: data })
    }

  } catch (error) {
    console.error('VHM Proxy Error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
