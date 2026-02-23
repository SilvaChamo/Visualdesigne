import { NextRequest, NextResponse } from 'next/server';
import { executeCyberPanelCommand } from '@/lib/cyberpanel-exec';

function parseTable(output: string): Record<string, string>[] {
    const lines = output.trim().split('\n').filter(l => l.includes('|'));
    const results: Record<string, string>[] = [];
    for (const line of lines) {
        const parts = line.split('|').map(p => p.trim());
        if (parts.length >= 2) results.push({ _raw: line, ...Object.fromEntries(parts.map((v, i) => [`col${i}`, v])) });
    }
    return results;
}

export async function GET(request: NextRequest) {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type') || 'websites';

    try {
        if (type === 'websites') {
            const query = `mysql -D cyberpanel -e "SELECT w.domain, p.packageName, w.adminEmail, w.state, w.ssl FROM websiteFunctions_websites w LEFT JOIN packages_package p ON w.package_id = p.id;" | tr '\\t' '|' | grep -v "^domain"`;
            const output = await executeCyberPanelCommand(query);

            if (!output.trim()) return NextResponse.json({ success: true, data: [] });

            const sites = output.trim().split('\n')
                .filter(l => l.includes('|'))
                .map(line => {
                    const [domain, packageName, adminEmail, state, ssl] = line.split('|').map(s => s.trim());
                    return { domain, package: packageName || 'Default', admin: adminEmail, state: state === '1' ? 'Active' : 'Inactive', ssl: ssl === '1' ? 'Enabled' : 'Disabled' };
                })
                .filter(s => s.domain);

            return NextResponse.json({ success: true, data: sites });
        }

        if (type === 'users') {
            const query = `mysql -D cyberpanel -e "SELECT userName, email, type FROM loginSystem_administrator;" | tr '\\t' '|' | grep -v "^userName"`;
            const output = await executeCyberPanelCommand(query);

            if (!output.trim()) return NextResponse.json({ success: true, data: [] });

            const users = output.trim().split('\n')
                .filter(l => l.includes('|'))
                .map(line => {
                    const [userName, email, userType] = line.split('|').map(s => s.trim());
                    const role = userType === '1' ? 'admin' : userType === '3' ? 'user' : 'user';
                    return { userName, email, type: role };
                })
                .filter(u => u.userName);

            return NextResponse.json({ success: true, data: users });
        }

        if (type === 'packages') {
            const query = `mysql -D cyberpanel -e "SELECT packageName, diskSpace, bandwidth, emailAccounts, dataBases, ftpAccounts, allowedDomains FROM packages_package;" | tr '\\t' '|' | grep -v "^packageName"`;
            const output = await executeCyberPanelCommand(query);

            if (!output.trim()) return NextResponse.json({ success: true, data: [] });

            const packages = output.trim().split('\n')
                .filter(l => l.includes('|'))
                .map(line => {
                    const [packageName, diskSpace, bandwidth, emailAccounts, dataBases, ftpAccounts, allowedDomains] = line.split('|').map(s => s.trim());
                    return { packageName, diskSpace, bandwidth, emailAccounts, dataBases, ftpAccounts, allowedDomains };
                })
                .filter(p => p.packageName);

            return NextResponse.json({ success: true, data: packages });
        }

        if (type === 'all') {
            const [sitesOut, usersOut, pkgsOut] = await Promise.all([
                executeCyberPanelCommand(`mysql -D cyberpanel -e "SELECT w.domain, p.packageName, w.adminEmail, w.state, w.ssl FROM websiteFunctions_websites w LEFT JOIN packages_package p ON w.package_id = p.id;" | tr '\\t' '|' | grep -v "^domain"`),
                executeCyberPanelCommand(`mysql -D cyberpanel -e "SELECT userName, email, type FROM loginSystem_administrator;" | tr '\\t' '|' | grep -v "^userName"`),
                executeCyberPanelCommand(`mysql -D cyberpanel -e "SELECT packageName, diskSpace, bandwidth, emailAccounts, dataBases, ftpAccounts, allowedDomains FROM packages_package;" | tr '\\t' '|' | grep -v "^packageName"`),
            ]);

            const parse = (out: string, cols: string[]) =>
                out.trim().split('\n').filter(l => l.includes('|')).map(line => {
                    const parts = line.split('|').map(s => s.trim());
                    return Object.fromEntries(cols.map((c, i) => [c, parts[i] || '']));
                }).filter(r => r[cols[0]]);

            const sites = parse(sitesOut, ['domain', 'packageName', 'adminEmail', 'state', 'ssl']).map(s => ({
                ...s,
                package: s.packageName || 'Default',
                admin: s.adminEmail,
                state: s.state === '1' ? 'Active' : 'Inactive',
                ssl: s.ssl === '1' ? 'Enabled' : 'Disabled'
            }));

            const users = parse(usersOut, ['userName', 'email', 'type']).map(u => ({
                ...u,
                type: u.type === '1' ? 'admin' : u.type === '3' ? 'user' : 'user'
            }));

            return NextResponse.json({
                success: true,
                sites,
                users,
                packages: parse(pkgsOut, ['packageName', 'diskSpace', 'bandwidth', 'emailAccounts', 'dataBases', 'ftpAccounts', 'allowedDomains']),
            });
        }

        return NextResponse.json({ error: 'Unknown type' }, { status: 400 });

    } catch (error: any) {
        console.error('[cyberpanel-db]', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function POST(request: NextRequest) {
    const body = await request.json();
    const { action, domainName, ownerEmail, packageName, phpVersion, adminUser, adminPass } = body;

    try {
        if (action === 'createWebsite') {
            if (!domainName || !ownerEmail || !packageName) {
                return NextResponse.json({ error: 'domainName, ownerEmail e packageName são obrigatórios' }, { status: 400 });
            }
            const clean = (s: string) => s.replace(/[^a-zA-Z0-9._@-]/g, '');
            const php = phpVersion || 'PHP 8.2';
            const cmd = `cyberpanel createWebsite --domainName "${clean(domainName)}" --ownerEmail "${clean(ownerEmail)}" --packageName "${clean(packageName)}" --websiteOwner "${clean(adminUser || 'admin')}" --php "${php}"`;
            const output = await executeCyberPanelCommand(cmd);
            const ok = output.includes('successful') || output.includes('created') || !output.toLowerCase().includes('error');
            return NextResponse.json({ success: ok, message: ok ? 'Website criado no CyberPanel' : 'Erro ao criar website', details: output });
        }

        if (action === 'deleteWebsite') {
            const clean = (s: string) => s.replace(/[^a-zA-Z0-9._-]/g, '');
            const cmd = `cyberpanel deleteWebsite --domainName "${clean(domainName)}" --adminUser "${clean(adminUser || 'admin')}" --adminPass "${adminPass || ''}"`;
            const output = await executeCyberPanelCommand(cmd);
            const ok = output.includes('successful') || output.includes('deleted') || !output.toLowerCase().includes('error');
            return NextResponse.json({ success: ok, message: ok ? 'Website removido' : 'Erro ao remover', details: output });
        }

        return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
    } catch (error: any) {
        console.error('[cyberpanel-db POST]', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
