import { NextRequest, NextResponse } from 'next/server'

// VHM Proxy API - Server-side to bypass CORS
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { endpoint, params } = body

    // VHM API Configuration
    const vhmUrl = 'https://za4.mozserver.com:2087'
    const username = 'yknrnlev'
    const password = 'FerramentasWeb#2020'

    // Create form data for VHM API
    const formData = new FormData()
    formData.append('user', username)
    formData.append('pass', password)

    // Add additional parameters
    if (params) {
      Object.keys(params).forEach(key => {
        formData.append(key, params[key])
      })
    }

    console.log('VHM Proxy Request:', `${vhmUrl}${endpoint}`)

    // Make request to VHM API from server (no CORS)
    const response = await fetch(`${vhmUrl}${endpoint}`, {
      method: 'POST',
      body: formData,
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; VHM-Proxy/1.0)',
      },
    })

    if (!response.ok) {
      console.error('VHM API Error:', response.status, response.statusText)
      return NextResponse.json(
        { error: `VHM API Error: ${response.status} ${response.statusText}` },
        { status: response.status }
      )
    }

    const data = await response.text()
    console.log('VHM API Response length:', data.length)

    // Try to parse JSON
    try {
      const jsonData = JSON.parse(data)
      return NextResponse.json(jsonData)
    } catch {
      // Return raw text if not JSON
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
