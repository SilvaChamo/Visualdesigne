import { NextResponse } from 'next/server';
import { executeCyberPanelCommand } from '@/lib/cyberpanel-exec';

function parseDnsOutput(output: string) {
    const lines = output.trim().split('\n');
    const records = [];

    // Skip empty outputs
    if (lines.length === 0 || (lines.length === 1 && lines[0] === '')) return [];

    for (const line of lines) {
        if (!line.includes('|')) continue;
        const parts = line.split('|');
        if (parts.length >= 5) {
            records.push({
                id: parts[0].trim(),
                name: parts[1].trim(),
                type: parts[2].trim(),
                content: parts[3].trim(),
                ttl: parts[4].trim(),
            });
        }
    }

    return records;
}

export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const domain = searchParams.get('domain');

        if (!domain) {
            return NextResponse.json({ error: 'Domain param is required.' }, { status: 400 });
        }

        // Clean domain string for safety
        const cleanDomain = domain.replace(/[^a-zA-Z0-9_.-]/g, '');

        // Query the PowerDNS (pdns) database directly
        const query = `mysql -D pdns -e "SELECT id, name, type, content, ttl FROM records WHERE domain_id=(SELECT id FROM domains WHERE name='${cleanDomain}');" | tr '\\t' '|' | grep -v "type|content"`;

        const output = await executeCyberPanelCommand(query);
        const records = parseDnsOutput(output);

        return NextResponse.json({ success: true, records });
    } catch (error: any) {
        console.error('Error listing DNS records:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { domainName, name, type, value, ttl = 3600 } = body;

        if (!domainName || !name || !type || !value) {
            return NextResponse.json({ error: 'Missing required parameters (domainName, name, type, value).' }, { status: 400 });
        }

        // Clean parameters (allow standard DNS characters like . _ - and alnum)
        const cleanDomain = domainName.replace(/[^a-zA-Z0-9_.-]/g, '');
        const cleanName = name.replace(/[^a-zA-Z0-9_.-]/g, '');
        const cleanType = type.replace(/[^A-Z]/g, '');
        // Value might contain spaces (like for TXT records)
        const cleanValue = value.replace(/['"]/g, '');
        const cleanTtl = parseInt(ttl, 10);

        // Envolve value with double quotes in the CLI command
        const command = `cyberpanel createDnsRecord --domainName "${cleanDomain}" --name "${cleanName}" --type "${cleanType}" --value "${cleanValue}" --ttl ${cleanTtl}`;

        const output = await executeCyberPanelCommand(command);

        if (output.includes('successfully created') || output.includes('Record Created') || !output.toLowerCase().includes('error')) {
            return NextResponse.json({ success: true, message: 'Registo DNS criado com sucesso!' });
        } else {
            return NextResponse.json({ error: 'Erro ao criar registo DNS.', details: output }, { status: 400 });
        }

    } catch (error: any) {
        console.error('Error creating DNS record:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function DELETE(request: Request) {
    try {
        const body = await request.json();
        // The DNS deletion requires passing the domainName and record ID
        const { domainName, id } = body;

        if (!domainName || !id) {
            return NextResponse.json({ error: 'domainName and record id are required for deletion.' }, { status: 400 });
        }

        const cleanDomain = domainName.replace(/[^a-zA-Z0-9_.-]/g, '');
        const cleanId = parseInt(id, 10);

        // Since CyberPanel CLI deleteDnsRecord asks for name, we might just run a MySQL statement or try to pass what cyberpanel expects: cyberpanel deleteDnsRecord --domainName DOMAIN --id ID
        // Often, CLI implementation of CyberPanel lacks ID-based deletion easily without interacting directly with PowerDNS DB
        // Let's use the DB approach directly for deletions to be 100% precise avoiding CLI regex matches
        const command = `mysql -D pdns -e "DELETE FROM records WHERE id=${cleanId} AND domain_id=(SELECT id FROM domains WHERE name='${cleanDomain}');" `;

        const output = await executeCyberPanelCommand(command);

        // Since mysql command output is empty on success DELETE statement:
        if (!output.toLowerCase().includes('error')) {
            return NextResponse.json({ success: true, message: 'Registo DNS removido com sucesso!' });
        } else {
            return NextResponse.json({ error: 'Erro ao remover registo DNS.', details: output }, { status: 400 });
        }

    } catch (error: any) {
        console.error('Error deleting DNS record:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
