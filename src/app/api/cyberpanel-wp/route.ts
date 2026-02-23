import { NextRequest, NextResponse } from 'next/server';
import { Client } from 'ssh2';

// CyberPanel Server SSH Configuration
const CYBERPANEL_HOST = process.env.CYBERPANEL_IP || '109.199.104.22';
const CYBERPANEL_SSH_PORT = parseInt(process.env.CYBERPANEL_SSH_PORT || '22');
const CYBERPANEL_SSH_USER = process.env.CYBERPANEL_SSH_USER || 'root';
const CYBERPANEL_SSH_PASS = process.env.CYBERPANEL_SSH_PASS || '';
const CYBERPANEL_SSH_KEY = process.env.CYBERPANEL_SSH_KEY || ''; // Preferred method

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { domainName, wpTitle, wpUser, wpPassword } = body;

        if (!domainName || !wpTitle || !wpUser || !wpPassword) {
            return NextResponse.json({ error: 'Faltam parâmetros obrigatórios' }, { status: 400 });
        }

        // Try CyberPanel API proxy first (no SSH needed)
        try {
            const cpUrl = process.env.CYBERPANEL_URL || 'https://109.199.104.22:8090/api';
            const https = require('https');
            const agent = new https.Agent({ rejectUnauthorized: false });
            const proxyBody = JSON.stringify({
                adminUser: process.env.CYBERPANEL_USER || 'admin',
                adminPass: process.env.CYBERPANEL_PASS || 'Vgz5Zat4uMyFt2tb',
                domainName, wpTitle, wpUser, wpPassword
            });
            const proxyRes = await fetch(`${cpUrl.replace('/api', '')}/api/installWordPress`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: proxyBody,
                // @ts-ignore
                agent
            }).catch(() => null);
            if (proxyRes && proxyRes.ok) {
                const proxyData = await proxyRes.json().catch(() => ({}));
                if (proxyData.status === 1 || proxyData.success === true) {
                    return NextResponse.json({ success: true, message: 'WordPress instalado via API CyberPanel' });
                }
            }
        } catch { /* fall through to SSH */ }

        // SSH fallback
        if (!CYBERPANEL_SSH_PASS && !CYBERPANEL_SSH_KEY) {
            return NextResponse.json({ success: true, message: 'WordPress marcado para instalação. Configure SSH ou instale manualmente via CyberPanel.', warning: true });
        }

        const installScript = `
        DOCUMENT_ROOT="/home/${domainName}/public_html"
        
        if [ ! -d "$DOCUMENT_ROOT" ]; then
            echo "ERRO: O diretório do domínio não existe. Crie o website primeiro no CyberPanel."
            exit 1
        fi
        
        cd "$DOCUMENT_ROOT"
        
        # Download WP-CLI if not present
        if ! command -v wp &> /dev/null; then
            curl -O https://raw.githubusercontent.com/wp-cli/builds/gh-pages/phar/wp-cli.phar
            chmod +x wp-cli.phar
            mv wp-cli.phar /usr/local/bin/wp
        fi
        
        # Obter detalhes da base de dados baseando na configuração do CyberPanel (geralmente existe um wp-config ou criando um novo)
        # Atenção: Criar BD não é feito automaticamente por este script bash. Vamos assumir que criaremos uma base de dados.
        
        DB_NAME=$(echo "${domainName}" | sed -e 's/\\.//g')
        DB_USER=$(echo "usr_${domainName}" | sed -e 's/\\.//g' | cut -c 1-16)
        DB_PASS=$(openssl rand -base64 12)
        
        echo "CREATE DATABASE IF NOT EXISTS \\\`$DB_NAME\\\`;" > /tmp/create_db.sql
        echo "CREATE USER IF NOT EXISTS '$DB_USER'@'localhost' IDENTIFIED BY '$DB_PASS';" >> /tmp/create_db.sql
        echo "GRANT ALL PRIVILEGES ON \\\`$DB_NAME\\\`.* TO '$DB_USER'@'localhost';" >> /tmp/create_db.sql
        echo "FLUSH PRIVILEGES;" >> /tmp/create_db.sql
        
        mysql < /tmp/create_db.sql
        rm /tmp/create_db.sql
        
        # Download and configure WP
        WP_CLI_ALLOW_ROOT=1 wp core download --allow-root --force
        WP_CLI_ALLOW_ROOT=1 wp config create --dbname=$DB_NAME --dbuser=$DB_USER --dbpass=$DB_PASS --allow-root --force
        
        # Install WP
        WP_CLI_ALLOW_ROOT=1 wp core install --url="https://${domainName}" --title="${wpTitle}" --admin_user="${wpUser}" --admin_password="${wpPassword}" --admin_email="${wpUser}@${domainName}" --allow-root
        
        # Fix permissions
        chown -R $(id -un):$(id -gn) "$DOCUMENT_ROOT"
        find "$DOCUMENT_ROOT" -type f -exec chmod 644 {} \\;
        find "$DOCUMENT_ROOT" -type d -exec chmod 755 {} \\;
        
        echo "SUCESSO: WordPress instalado"
        `;

        const result = await executeSSH(installScript);

        if (result.includes("ERRO:")) {
            return NextResponse.json({ error: 'Falha ao instalar o WordPress', details: result }, { status: 400 });
        }

        return NextResponse.json({ success: true, message: 'WordPress instalado com sucesso' });

    } catch (error: any) {
        console.error('[WP SSH Install Exception]', error?.message || error);
        return NextResponse.json(
            {
                error: 'Erro no instalador WP',
                details: error instanceof Error ? error.message : 'Erro desconhecido'
            },
            { status: 500 }
        );
    }
}

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
                    output += data; // include stderr in output for debug
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
