import { NextRequest, NextResponse } from 'next/server'

// CyberPanel API Configuration
const CYBERPANEL_URL = 'https://109.199.104.22:8090'
const CYBERPANEL_USER = 'admin'
const CYBERPANEL_PASS = 'FerramentasWeb#2020'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { action } = body

    if (action === 'create-site') {
      // Criar site visualdesign.com no CyberPanel
      const createSiteResponse = await fetch(`${CYBERPANEL_URL}/cyberpanel/createWebsite`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Basic ${Buffer.from(`${CYBERPANEL_USER}:${CYBERPANEL_PASS}`).toString('base64')}`
        },
        body: JSON.stringify({
          domainName: 'visualdesign.com',
          email: 'admin@visualdesign.com',
          package: 'Default',
          owner: 'admin'
        })
      })

      if (!createSiteResponse.ok) {
        throw new Error(`Failed to create site: ${createSiteResponse.statusText}`)
      }

      const siteData = await createSiteResponse.json()

      // Configurar DNS básico
      const dnsRecords = [
        {
          type: 'A',
          name: '@',
          content: '109.199.104.22',
          ttl: 3600
        },
        {
          type: 'A',
          name: 'www',
          content: '109.199.104.22',
          ttl: 3600
        }
      ]

      for (const record of dnsRecords) {
        await fetch(`${CYBERPANEL_URL}/cyberpanel/addDNSRecord`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Basic ${Buffer.from(`${CYBERPANEL_USER}:${CYBERPANEL_PASS}`).toString('base64')}`
          },
          body: JSON.stringify({
            domainName: 'visualdesign.com',
            type: record.type,
            name: record.name,
            content: record.content,
            ttl: record.ttl
          })
        })
      }

      return NextResponse.json({
        success: true,
        message: 'Site visualdesign.com criado com sucesso!',
        site: siteData
      })
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 })

  } catch (error: any) {
    console.error('Setup visualdesign error:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}
