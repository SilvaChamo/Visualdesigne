import { NextResponse } from 'next/server';
import { executeCyberPanelCommand } from '@/lib/cyberpanel-exec';

// Format CLI output into structured package array
function parsePackageSQLOutput(output: string) {
    const lines = output.trim().split('\n');
    const packages = [];

    // Skip empty outputs
    if (lines.length === 0 || (lines.length === 1 && lines[0] === '')) return [];

    for (const line of lines) {
        if (!line.includes('|')) continue;

        // fields: name|diskSpace|bandwidth|emailAccounts|dataBases|ftpAccounts|allowedDomains
        const parts = line.split('|');
        if (parts.length >= 7) {
            packages.push({
                name: parts[0].trim(),
                diskSpace: parts[1].trim(),
                bandwidth: parts[2].trim(),
                emailAccounts: parts[3].trim(),
                dataBases: parts[4].trim(),
                ftpAccounts: parts[5].trim(),
                allowedDomains: parts[6].trim()
            });
        }
    }

    return packages;
}

export async function GET() {
    try {
        // Query the packages table directly from the CyberPanel database
        // Using sed to format instead of awk to avoid bash escape issues. dataBases is a reserved keyword in MySQL, so using backticks.
        const query = `mysql -D cyberpanel -e "SELECT packageName, diskSpace, bandwidth, emailAccounts, \\\`dataBases\\\`, ftpAccounts, allowedDomains FROM packages_package;" | tr '\\t' '|' | grep -v "packageName|diskSpace"`;

        const output = await executeCyberPanelCommand(query);
        const packages = parsePackageSQLOutput(output);

        return NextResponse.json({ success: true, packages });
    } catch (error: any) {
        console.error('Error listing CyberPanel packages:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { packageName, diskSpace, bandwidth, emailAccounts, dataBases, ftpAccounts, allowedDomains } = body;

        // Validation
        if (!packageName || !diskSpace || !bandwidth || !emailAccounts || !dataBases || !ftpAccounts || !allowedDomains) {
            return NextResponse.json({ error: 'Todos os campos do pacote são obrigatórios.' }, { status: 400 });
        }

        // Clean names to prevent command injection
        const cleanName = packageName.replace(/[^a-zA-Z0-9_-]/g, '');

        // Generate the CyberPanel CLI command
        const command = `cyberpanel createPackage --packageName "${cleanName}" --diskSpace "${diskSpace}" --bandwidth "${bandwidth}" --emailAccounts "${emailAccounts}" --dataBases "${dataBases}" --ftpAccounts "${ftpAccounts}" --allowedDomains "${allowedDomains}"`;

        const output = await executeCyberPanelCommand(command);

        if (output.includes('successfully created') || output.includes('Package Created') || !output.toLowerCase().includes('error')) {
            return NextResponse.json({ success: true, message: 'Pacote criado com sucesso!' });
        } else {
            return NextResponse.json({ error: 'Erro ao criar o pacote no servidor.', details: output }, { status: 400 });
        }

    } catch (error: any) {
        console.error('Error creating CyberPanel package:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function DELETE(request: Request) {
    try {
        const body = await request.json();
        const { packageName } = body;

        if (!packageName) {
            return NextResponse.json({ error: 'packageName é obrigatório para remover.' }, { status: 400 });
        }

        // Keep core 'Default' package safe from accidental deletion
        if (packageName.toLowerCase() === 'default') {
            return NextResponse.json({ error: 'Não é possível apagar o pacote Default.' }, { status: 403 });
        }

        const cleanName = packageName.replace(/[^a-zA-Z0-9_-]/g, '');
        const command = `cyberpanel deletePackage --packageName "${cleanName}"`;

        const output = await executeCyberPanelCommand(command);

        if (output.includes('successfully deleted') || output.includes('Package Deleted') || (!output.toLowerCase().includes('error') && !output.includes('does not exist'))) {
            return NextResponse.json({ success: true, message: 'Pacote removido com sucesso!' });
        } else {
            return NextResponse.json({ error: 'Ocorreu um erro ou o pacote não existe.', details: output }, { status: 400 });
        }

    } catch (error: any) {
        console.error('Error deleting CyberPanel package:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
