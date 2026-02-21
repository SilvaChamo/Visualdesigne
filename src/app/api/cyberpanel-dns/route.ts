import { NextRequest, NextResponse } from 'next/server';
import { Client } from 'ssh2';

// CyberPanel Server SSH Configuration
const CYBERPANEL_HOST = process.env.CYBERPANEL_IP || '109.199.104.22';
const CYBERPANEL_SSH_PORT = parseInt(process.env.CYBERPANEL_SSH_PORT || '22');
const CYBERPANEL_SSH_USER = process.env.CYBERPANEL_SSH_USER || 'root';
const CYBERPANEL_SSH_PASS = process.env.CYBERPANEL_SSH_PASS || '';
const CYBERPANEL_SSH_KEY = process.env.CYBERPANEL_SSH_KEY || '';

// Helper para executar comandos SSH
function executeSSH(command: string): Promise<string> {
    return new Promise((resolve, reject) => {
        const conn = new Client();
        conn.on('ready', () => {
            conn.exec(command, (err: Error | undefined, stream: any) => {
                if (err) {
                    conn.end();
                    return reject(err);
                }
                let output = '';
                stream.on('close', (code: any, signal: any) => {
                    conn.end();
                    resolve(output);
                }).on('data', (data: any) => {
                    output += data;
                }).stderr.on('data', (data: any) => {
                    output += data;
                });
            });
        }).on('error', (err: Error) => {
            reject(err);
        }).connect({
            host: CYBERPANEL_HOST,
            port: CYBERPANEL_SSH_PORT,
            username: CYBERPANEL_SSH_USER,
            password: CYBERPANEL_SSH_PASS,
            privateKey: CYBERPANEL_SSH_KEY ? Buffer.from(CYBERPANEL_SSH_KEY, 'base64') : undefined
        });
    });
}

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { action, domainName, recordType, name, value, ttl, recordID } = body;

        if (!domainName) {
            return NextResponse.json({ error: 'O nome do domínio é obrigatório' }, { status: 400 });
        }

        if (!CYBERPANEL_SSH_PASS && !CYBERPANEL_SSH_KEY) {
            return NextResponse.json({ error: 'Configuração SSH ausente no servidor' }, { status: 500 });
        }

        if (action === 'get') {
            // Usa query MySQL limpa pois CLI retorna HTML output às vezes e é dificil de parsear
            const getCommand = `mysql -D cyberpanel -e "SELECT id, name, type, content, ttl FROM records WHERE domain_id = (SELECT id FROM domains WHERE name = '${domainName}' LIMIT 1);" | awk 'NR>1 {print $1"|"$2"|"$3"|"$4"|"$5}'`;
            const output = await executeSSH(getCommand);

            const records = output.split('\\n').filter(line => line.trim().length > 0).map(line => {
                const parts = line.split('|');
                return {
                    id: parts[0],
                    name: parts[1],
                    type: parts[2],
                    content: parts[3],
                    ttl: parts[4]
                };
            });

            return NextResponse.json({ success: true, records });
        }
        else if (action === 'add') {
            if (!recordType || !name || !value) {
                return NextResponse.json({ error: 'Faltam parâmetros para adicionar o registo' }, { status: 400 });
            }

            const addCommand = `cyberpanel addDNSRecord --domainName "${domainName}" --name "${name}" --recordType "${recordType}" --value "${value}" --ttl "${ttl || 3600}"`;
            const output = await executeSSH(addCommand);

            if (output.toLowerCase().includes('error') || output.toLowerCase().includes('fail')) {
                return NextResponse.json({ error: 'Falha ao adicionar', details: output }, { status: 400 });
            }
            return NextResponse.json({ success: true, message: 'Registo adicionado com sucesso', output });
        }
        else if (action === 'delete') {
            if (!recordID) {
                return NextResponse.json({ error: 'ID do registo é obrigatório' }, { status: 400 });
            }

            const deleteCommand = `cyberpanel deleteDNSRecord --domainName "${domainName}" --recordID "${recordID}"`;
            const output = await executeSSH(deleteCommand);

            if (output.toLowerCase().includes('error') || output.toLowerCase().includes('fail')) {
                return NextResponse.json({ error: 'Falha ao apagar', details: output }, { status: 400 });
            }
            return NextResponse.json({ success: true, message: 'Registo apagado com sucesso', output });
        }

        return NextResponse.json({ error: 'Ação inválida' }, { status: 400 });

    } catch (error: any) {
        console.error('[DNS Manager Exception]', error?.message || error);
        return NextResponse.json({ error: 'Erro no gestor de DNS', details: error?.message }, { status: 500 });
    }
}
