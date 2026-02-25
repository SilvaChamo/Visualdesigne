import { NextResponse } from 'next/server';
import { Client } from 'ssh2';

async function execSSH(command: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const conn = new Client();
    let out = '';
    const rawKey = process.env.SSH_PRIVATE_KEY || '';
    const privateKey = rawKey.replace(/\\n/g, '\n');
    conn.on('ready', () => {
      conn.exec(command, (err, stream) => {
        if (err) { conn.end(); return reject(err); }
        stream.on('data', (d: Buffer) => { out += d.toString(); });
        stream.stderr.on('data', (d: Buffer) => { out += d.toString(); });
        stream.on('close', () => { conn.end(); resolve(out); });
      });
    });
    conn.on('error', reject);
    conn.connect({
      host: process.env.CYBERPANEL_IP || '109.199.104.22',
      port: 22, username: 'root', privateKey,
    });
  });
}

function parseBindZone(zoneContent: string, domain: string) {
  const records: any[] = [];
  let idCounter = 1;
  const lines = zoneContent.split('\n');
  
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith(';') || trimmed.startsWith('$')) continue;
    
    // Match: name TTL class type value
    const match = trimmed.match(/^(\S+)\s+(\d+)\s+IN\s+(\w+)\s+(.+)$/i) ||
                  trimmed.match(/^(\S+)\s+IN\s+(\w+)\s+(.+)$/i);
    
    if (match) {
      if (match.length === 5) {
        records.push({
          id: idCounter++,
          name: match[1] === '@' ? domain : match[1].replace(/\.$/, ''),
          ttl: match[2],
          type: match[3].toUpperCase(),
          content: match[4].trim(),
        });
      } else if (match.length === 4) {
        records.push({
          id: idCounter++,
          name: match[1] === '@' ? domain : match[1].replace(/\.$/, ''),
          ttl: '14400',
          type: match[2].toUpperCase(),
          content: match[3].trim(),
        });
      }
    }
  }
  return records;
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const domain = searchParams.get('domain');
    if (!domain) return NextResponse.json({ error: 'Domain required' }, { status: 400 });
    
    const cleanDomain = domain.replace(/[^a-zA-Z0-9_.-]/g, '');
    
    // Tentar diferentes localizações do ficheiro de zona BIND
    const zoneContent = await execSSH(
      `cat /etc/named/domains/${cleanDomain}.db 2>/dev/null || ` +
      `cat /var/named/${cleanDomain}.db 2>/dev/null || ` +
      `cat /etc/bind/zones/${cleanDomain}.db 2>/dev/null || ` +
      `cat /etc/named/${cleanDomain}.zone 2>/dev/null || ` +
      `named-compilezone -o - ${cleanDomain} /etc/named/domains/${cleanDomain}.db 2>/dev/null || ` +
      `echo "ZONE_NOT_FOUND"`
    );
    
    if (zoneContent.includes('ZONE_NOT_FOUND')) {
      return NextResponse.json({ success: true, records: [], message: 'Zona DNS não encontrada para este domínio' });
    }
    
    const records = parseBindZone(zoneContent, cleanDomain);
    return NextResponse.json({ success: true, records });
    
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { domainName, name, type, value, ttl = 14400, priority } = body;
    if (!domainName || !name || !type || !value) {
      return NextResponse.json({ error: 'Parâmetros em falta' }, { status: 400 });
    }
    
    const cleanDomain = domainName.replace(/[^a-zA-Z0-9_.-]/g, '');
    const cleanName = name.replace(/[^a-zA-Z0-9_.*@-]/g, '');
    const cleanType = type.replace(/[^A-Z]/g, '');
    const cleanValue = type === 'MX' ? `${priority || 10} ${value}` : value;
    
    const raw = await execSSH(
      `cyberpanel createDnsRecord ` +
      `--domainName ${cleanDomain} ` +
      `--name "${cleanName}" ` +
      `--recordType ${cleanType} ` +
      `--value "${cleanValue}" ` +
      `--ttl ${ttl} 2>&1`
    );
    
    const success = !raw.toLowerCase().includes('error') && !raw.toLowerCase().includes('traceback');
    return NextResponse.json({ success, message: success ? 'Registo criado!' : 'Erro ao criar registo', details: raw });
    
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const body = await request.json();
    const { domainName, id, name, type, value, ttl, priority } = body;
    if (!domainName || !id) {
      return NextResponse.json({ error: 'domainName e id são obrigatórios' }, { status: 400 });
    }
    
    const cleanDomain = domainName.replace(/[^a-zA-Z0-9_.-]/g, '');
    const cleanValue = type === 'MX' ? `${priority || 10} ${value}` : value;
    
    // CyberPanel: apagar e recriar
    await execSSH(`cyberpanel deleteDnsRecord --domainName ${cleanDomain} --recordID ${id} 2>&1`);
    const raw = await execSSH(
      `cyberpanel createDnsRecord ` +
      `--domainName ${cleanDomain} ` +
      `--name "${name}" ` +
      `--recordType ${type} ` +
      `--value "${cleanValue}" ` +
      `--ttl ${ttl || 14400} 2>&1`
    );
    
    const success = !raw.toLowerCase().includes('error');
    return NextResponse.json({ success, details: raw });
    
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const body = await request.json();
    const { domainName, id } = body;
    if (!domainName || !id) {
      return NextResponse.json({ error: 'domainName e id são obrigatórios' }, { status: 400 });
    }
    
    const cleanDomain = domainName.replace(/[^a-zA-Z0-9_.-]/g, '');
    const raw = await execSSH(
      `cyberpanel deleteDnsRecord --domainName ${cleanDomain} --recordID ${id} 2>&1`
    );
    
    const success = !raw.toLowerCase().includes('error');
    return NextResponse.json({ success, message: success ? 'Registo removido!' : 'Erro ao remover', details: raw });
    
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

