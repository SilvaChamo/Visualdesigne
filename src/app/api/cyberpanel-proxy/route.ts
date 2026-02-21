import { NextRequest, NextResponse } from 'next/server';

// CyberPanel API Configuration
const CYBERPANEL_URL = 'https://109.199.104.22:8090/api';
const CYBERPANEL_ADMIN_PASS = 'Vgz5Zat4uMyFt2tb';
const CYBERPANEL_TIMEOUT_MS = 20000; // 20 seconds

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { endpoint, params } = body;

        // Build the request to CyberPanel
        // CyberPanel API usually expects a POST request with JSON body
        // and the endpoint as a key like 'controller' or similar, but the docs show different styles.
        // Based on common CyberPanel API implementations:
        const url = `${CYBERPANEL_URL}/${endpoint}`;

        console.log(`[CyberPanel Proxy] Requesting: ${endpoint} for ${params?.domainName || 'all'}`);

        // In a production environment, you might want to force certain parameters 
        // or validate the adminPass against a secret stored in environment variables.

        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(params),
            signal: AbortSignal.timeout(CYBERPANEL_TIMEOUT_MS),
        });

        const data = await response.text();

        if (!response.ok) {
            console.error(`[CyberPanel ERROR] Status: ${response.status}, Body: ${data.substring(0, 500)}`);
            return NextResponse.json(
                { error: `CyberPanel API Error: ${response.status}`, raw: data },
                { status: response.status }
            );
        }

        try {
            const jsonData = JSON.parse(data);
            console.log(`[CyberPanel SUCCESS] Content: ${endpoint}`);
            return NextResponse.json(jsonData);
        } catch {
            console.log('[CyberPanel] Response is not JSON. Preview:', data.substring(0, 100));
            return NextResponse.json({ raw: data });
        }

    } catch (error: any) {
        console.error('[CyberPanel Proxy Exception]', error?.message || error);

        // Handle timeouts
        if (error?.name === 'TimeoutError' || error?.name === 'AbortError') {
            return NextResponse.json(
                {
                    error: 'Servidor CyberPanel indisponível',
                    details: 'O servidor não respondeu dentro do tempo limite. Verifique se o CyberPanel está ativo e se a API está habilitada.'
                },
                { status: 504 }
            );
        }

        return NextResponse.json(
            {
                error: 'Erro no proxy do CyberPanel',
                details: error instanceof Error ? error.message : 'Erro desconhecido'
            },
            { status: 500 }
        );
    }
}
