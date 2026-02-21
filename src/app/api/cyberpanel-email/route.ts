import { NextResponse } from 'next/server';
import { Client } from 'ssh2';
import * as fs from 'fs';

// Helper function to execute SSH commands
function executeSSHCommand(command: string): Promise<string> {
    return new Promise((resolve, reject) => {
        const conn = new Client();

        conn.on('ready', () => {
            conn.exec(command, (err, stream) => {
                if (err) {
                    conn.end();
                    return reject(err);
                }

                let output = '';
                let errorOutput = '';

                stream.on('close', (code: any, signal: any) => {
                    conn.end();
                    if (code !== 0 && errorOutput) {
                        reject(new Error(`SSH Command failed with code ${code}: ${errorOutput}`));
                    } else {
                        resolve(output);
                    }
                }).on('data', (data: any) => {
                    output += data;
                }).stderr.on('data', (data: any) => {
                    errorOutput += data;
                });
            });
        }).on('error', (err) => {
            reject(new Error(`SSH Connection Error: ${err.message}`));
        }).connect({
            host: process.env.CYBERPANEL_IP,
            port: Number(process.env.CYBERPANEL_SSH_PORT || 22),
            username: process.env.CYBERPANEL_SSH_USER || 'root',
            privateKey: process.env.CYBERPANEL_SSH_KEY_PATH
                ? fs.readFileSync(process.env.CYBERPANEL_SSH_KEY_PATH, 'utf8')
                : (process.env.CYBERPANEL_SSH_KEY ? process.env.CYBERPANEL_SSH_KEY.replace(/\\n/g, '\n') : undefined),
            password: process.env.CYBERPANEL_SSH_PASS, // fallback if no key
        });
    });
}

function parseEmailOutput(output: string, domain: string) {
    const lines = output.trim().split('\n');
    const emails = [];

    if (lines.length === 0 || (lines.length === 1 && lines[0] === '')) return [];

    for (const line of lines) {
        if (!line.includes('|')) continue;
        const parts = line.split('|');
        if (parts.length >= 2) {
            const emailId = parts[0].trim();
            const emailUser = parts[1].trim();

            emails.push({
                id: emailId,
                email: `${emailUser}@${domain}`,
                user: emailUser,
                domain: domain
            });
        }
    }

    return emails;
}

export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const domain = searchParams.get('domain');

        if (!domain) {
            return NextResponse.json({ error: 'Domain param is required.' }, { status: 400 });
        }

        const cleanDomain = domain.replace(/[^a-zA-Z0-9_.-]/g, '');

        // Inside CyberPanel database, emails are stored in email_emails, linked to websiteBase_websites
        // Fetch emails associated to a specific domain name directly
        const query = `mysql -D cyberpanel -e "SELECT id, email FROM email_emails WHERE domain_id=(SELECT id FROM websiteBase_websites WHERE domain='${cleanDomain}');" | tr '\\t' '|' | grep -v "email"`;

        const output = await executeSSHCommand(query);
        const emails = parseEmailOutput(output, cleanDomain);

        return NextResponse.json({ success: true, emails });
    } catch (error: any) {
        console.error('Error listing Emails:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { domainName, userName, password } = body;

        // Note: As per request "createEmail --domainName <d> --userName <u_only> --password <pass>"
        // userName here means the part before the @ sign

        if (!domainName || !userName || !password) {
            return NextResponse.json({ error: 'Missing required parameters (domainName, userName, password).' }, { status: 400 });
        }

        const cleanDomain = domainName.replace(/[^a-zA-Z0-9_.-]/g, '');
        // userName typically alphanumeric and safe dots/hyphens for email
        const cleanUser = userName.replace(/[^a-zA-Z0-9_.-]/g, '');
        const cleanPassword = password.replace(/['"]/g, '');

        // Command to create email directly in CyberPanel CLI
        const command = `cyberpanel createEmail --domainName "${cleanDomain}" --userName "${cleanUser}" --password "${cleanPassword}"`;

        const output = await executeSSHCommand(command);

        if (output.includes('successfully') || !output.toLowerCase().includes('error')) {
            return NextResponse.json({ success: true, message: 'Conta de E-mail criada com sucesso!' });
        } else {
            return NextResponse.json({ error: 'Erro ao criar conta de E-mail.', details: output }, { status: 400 });
        }

    } catch (error: any) {
        console.error('Error creating Email:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function DELETE(request: Request) {
    try {
        const body = await request.json();
        // The endpoint should receive the full email string like "info@domain.com"
        const { email } = body;

        if (!email) {
            return NextResponse.json({ error: 'Email parameter is required for deletion.' }, { status: 400 });
        }

        const cleanEmail = email.replace(/[^a-zA-Z0-9_.-@]/g, '');

        // CyberPanel command: cyberpanel deleteEmail --emailAddress <email@dom.com>
        const command = `cyberpanel deleteEmail --emailAddress "${cleanEmail}"`;

        const output = await executeSSHCommand(command);

        if (output.includes('successfully') || !output.toLowerCase().includes('error') || output.includes('Deleted')) {
            return NextResponse.json({ success: true, message: 'Conta de E-mail removida com sucesso!' });
        } else {
            return NextResponse.json({ error: 'Erro ao remover conta de E-mail.', details: output }, { status: 400 });
        }

    } catch (error: any) {
        console.error('Error deleting Email:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
