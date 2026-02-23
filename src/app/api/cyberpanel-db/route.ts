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
            // Get main websites
            const mainSitesQuery = `mysql -D cyberpanel -e "SELECT w.domain, p.packageName, w.adminEmail, w.state, w.ssl FROM websiteFunctions_websites w LEFT JOIN packages_package p ON w.package_id = p.id;" | tr '\\t' '|' | grep -v "^domain"`
            const mainOutput = await executeCyberPanelCommand(mainSitesQuery);

            // Get subdomains
            const subdomainsQuery = `mysql -D cyberpanel -e "SELECT cd.domain, cd.path, cd.ssl, cd.phpSelection, w.domain as master_domain FROM websiteFunctions_childdomains cd LEFT JOIN websiteFunctions_websites w ON cd.master_id = w.id;" | tr '\\t' '|' | grep -v "^domain"`
            const subdomainsOutput = await executeCyberPanelCommand(subdomainsQuery);

            let sites: any[] = [];
            
            // Process main sites
            if (mainOutput.trim()) {
                const mainSites = mainOutput.trim().split('\n')
                    .filter(l => l.includes('|'))
                    .map(line => {
                        const [domain, packageName, adminEmail, state, ssl] = line.split('|').map(s => s.trim());
                        return { 
                            domain, 
                            package: packageName || 'Default', 
                            admin: adminEmail, 
                            state: state === '1' ? 'Active' : 'Inactive', 
                            ssl: ssl === '1' ? 'Enabled' : 'Disabled',
                            type: 'main'
                        };
                    })
                    .filter(s => s.domain);
                sites = sites.concat(mainSites);
            }

            // Process subdomains
            if (subdomainsOutput.trim()) {
                const subdomains = subdomainsOutput.trim().split('\n')
                    .filter(l => l.includes('|'))
                    .map(line => {
                        const [domain, path, ssl, phpSelection, masterDomain] = line.split('|').map(s => s.trim());
                        return { 
                            domain, 
                            package: 'Subdomain', 
                            admin: `subdomain of ${masterDomain}`, 
                            state: 'Active', 
                            ssl: ssl === '1' ? 'Enabled' : 'Disabled',
                            type: 'subdomain',
                            masterDomain,
                            path,
                            phpVersion: phpSelection
                        };
                    })
                    .filter(s => s.domain);
                sites = sites.concat(subdomains);
            }

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
            const [mainSitesOut, subdomainsOut, usersOut, pkgsOut] = await Promise.all([
                executeCyberPanelCommand(`mysql -D cyberpanel -e "SELECT w.domain, p.packageName, w.adminEmail, w.state, w.ssl FROM websiteFunctions_websites w LEFT JOIN packages_package p ON w.package_id = p.id;" | tr '\\t' '|' | grep -v "^domain"`),
                executeCyberPanelCommand(`mysql -D cyberpanel -e "SELECT cd.domain, cd.path, cd.ssl, cd.phpSelection, w.domain as master_domain FROM websiteFunctions_childdomains cd LEFT JOIN websiteFunctions_websites w ON cd.master_id = w.id;" | tr '\\t' '|' | grep -v "^domain"`),
                executeCyberPanelCommand(`mysql -D cyberpanel -e "SELECT userName, email, type FROM loginSystem_administrator;" | tr '\\t' '|' | grep -v "^userName"`),
                executeCyberPanelCommand(`mysql -D cyberpanel -e "SELECT packageName, diskSpace, bandwidth, emailAccounts, dataBases, ftpAccounts, allowedDomains FROM packages_package;" | tr '\\t' '|' | grep -v "^packageName"`),
            ]);

            const parse = (out: string, cols: string[]) =>
                out.trim().split('\n').filter(l => l.includes('|')).map(line => {
                    const parts = line.split('|').map(s => s.trim());
                    return Object.fromEntries(cols.map((c, i) => [c, parts[i] || '']));
                }).filter(r => r[cols[0]]);

            // Parse main sites
            const mainSites = parse(mainSitesOut, ['domain', 'packageName', 'adminEmail', 'state', 'ssl']).map(s => ({
                ...s,
                package: s.packageName || 'Default',
                admin: s.adminEmail,
                state: s.state === '1' ? 'Active' : 'Inactive',
                ssl: s.ssl === '1' ? 'Enabled' : 'Disabled',
                type: 'main'
            }));

            // Parse subdomains
            const subdomains = parse(subdomainsOut, ['domain', 'path', 'ssl', 'phpSelection', 'master_domain']).map(s => ({
                domain: s.domain,
                package: 'Subdomain',
                admin: `subdomain of ${s.master_domain}`,
                state: 'Active',
                ssl: s.ssl === '1' ? 'Enabled' : 'Disabled',
                type: 'subdomain',
                masterDomain: s.master_domain,
                path: s.path,
                phpVersion: s.phpSelection
            }));

            const sites = [...mainSites, ...subdomains];

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
    const { action, domainName, ownerEmail, packageName, phpVersion, adminUser, adminPass, ssl, state } = body;

    try {
        if (action === 'createWebsite') {
            if (!domainName || !ownerEmail || !packageName) {
                return NextResponse.json({ error: 'domainName, ownerEmail e packageName são obrigatórios' }, { status: 400 });
            }
            const clean = (s: string) => s.replace(/[^a-zA-Z0-9._@-]/g, '');
            const php = phpVersion || 'PHP 8.2';
            
            // Create website in CyberPanel
            const cmd = `cyberpanel createWebsite --domainName "${clean(domainName)}" --email "${clean(ownerEmail)}" --packageName "${clean(packageName)}" --owner "${clean(adminUser || 'admin')}" --php "${php}"`;
            const output = await executeCyberPanelCommand(cmd);
            const ok = output.includes('successful') || output.includes('created') || !output.toLowerCase().includes('error');
            
            if (ok) {
                // Also create in MySQL for consistency
                try {
                    await executeCyberPanelCommand(`mysql -D cyberpanel -e "INSERT INTO websiteFunctions_websites (domain, adminEmail, phpSelection, ssl, state, externalApp, config, BackupLock, admin_id, package_id) VALUES ('${clean(domainName)}', '${clean(ownerEmail)}', '${php}', 0, 1, 'OLS', '', 0, 1, 1);"`);
                } catch (mysqlError) {
                    console.error('MySQL insert error:', mysqlError);
                }
            }
            
            return NextResponse.json({ success: ok, message: ok ? 'Website criado no CyberPanel' : 'Erro ao criar website', details: output });
        }

        if (action === 'updateWebsite') {
            if (!domainName) {
                return NextResponse.json({ error: 'domainName é obrigatório' }, { status: 400 });
            }
            const clean = (s: string) => s.replace(/[^a-zA-Z0-9._@-]/g, '');
            let cmd = `cyberpanel modifyWebsite --domainName "${clean(domainName)}"`;
            
            if (ownerEmail) cmd += ` --email "${clean(ownerEmail)}"`;
            if (packageName && packageName !== 'Default') cmd += ` --package "${clean(packageName)}"`;
            if (phpVersion) cmd += ` --php "${clean(phpVersion)}"`;
            if (ssl !== undefined) cmd += ` --ssl ${ssl ? '1' : '0'}`;
            if (state !== undefined) cmd += ` --state ${state ? '1' : '0'}`;
            
            const output = await executeCyberPanelCommand(cmd);
            const ok = output.includes('successful') || output.includes('modified') || !output.toLowerCase().includes('error');
            
            if (ok) {
                // Also update MySQL for consistency
                try {
                    let mysqlUpdates = [];
                    if (ownerEmail) mysqlUpdates.push(`adminEmail = '${clean(ownerEmail)}'`);
                    if (phpVersion) mysqlUpdates.push(`phpSelection = '${clean(phpVersion)}'`);
                    if (ssl !== undefined) mysqlUpdates.push(`ssl = ${ssl ? '1' : '0'}`);
                    if (state !== undefined) mysqlUpdates.push(`state = ${state ? '1' : '0'}`);
                    
                    if (mysqlUpdates.length > 0) {
                        const mysqlCmd = `mysql -D cyberpanel -e "UPDATE websiteFunctions_websites SET ${mysqlUpdates.join(', ')} WHERE domain = '${clean(domainName)}';"`;
                        await executeCyberPanelCommand(mysqlCmd);
                    }
                } catch (mysqlError) {
                    console.error('MySQL update error:', mysqlError);
                }
            }
            
            return NextResponse.json({ success: ok, message: ok ? 'Website atualizado' : 'Erro ao atualizar', details: output });
        }

        if (action === 'addDNSRecord') {
            if (!domainName || !body.name || !body.recordType || !body.value) {
                return NextResponse.json({ error: 'domainName, name, recordType e value são obrigatórios' }, { status: 400 });
            }
            const clean = (s: string) => s.replace(/[^a-zA-Z0-9._-]/g, '');
            let cmd = `cyberpanel addDNSRecord --domainName "${clean(domainName)}" --name "${clean(body.name)}" --recordType "${body.recordType}" --value "${clean(body.value)}"`;
            if (body.priority) cmd += ` --priority ${body.priority}`;
            if (body.ttl) cmd += ` --ttl ${body.ttl}`;
            
            const output = await executeCyberPanelCommand(cmd);
            const ok = output.includes('successful') || output.includes('added') || !output.toLowerCase().includes('error');
            return NextResponse.json({ success: ok, message: ok ? 'Registo DNS adicionado' : 'Erro ao adicionar registo DNS', details: output });
        }

        if (action === 'deleteDNSRecord') {
            if (!domainName || !body.recordID) {
                return NextResponse.json({ error: 'domainName e recordID são obrigatórios' }, { status: 400 });
            }
            const clean = (s: string) => s.replace(/[^a-zA-Z0-9._-]/g, '');
            const cmd = `cyberpanel deleteDNSRecord --domainName "${clean(domainName)}" --recordID "${body.recordID}"`;
            
            const output = await executeCyberPanelCommand(cmd);
            const ok = output.includes('successful') || output.includes('deleted') || !output.toLowerCase().includes('error');
            return NextResponse.json({ success: ok, message: ok ? 'Registo DNS removido' : 'Erro ao remover registo DNS', details: output });
        }

        if (action === 'createSubdomain') {
            if (!domainName || !body.masterDomain || !body.path) {
                return NextResponse.json({ error: 'domainName, masterDomain e path são obrigatórios' }, { status: 400 });
            }
            const clean = (s: string) => s.replace(/[^a-zA-Z0-9._-]/g, '');
            
            // Create subdomain in CyberPanel
            const cmd = `cyberpanel createChildDomain --masterDomain "${clean(body.masterDomain)}" --childDomain "${clean(domainName)}" --path "${clean(body.path)}"`;
            const output = await executeCyberPanelCommand(cmd);
            const ok = output.includes('successful') || output.includes('created') || !output.toLowerCase().includes('error');
            
            if (ok) {
                // Also create in MySQL for consistency
                try {
                    await executeCyberPanelCommand(`mysql -D cyberpanel -e "INSERT INTO websiteFunctions_childdomains (domain, path, ssl, phpSelection, alais, master_id) VALUES ('${clean(domainName)}', '${clean(body.path)}', 0, 'PHP 8.2', 0, (SELECT id FROM websiteFunctions_websites WHERE domain = '${clean(body.masterDomain)}'));"`);
                } catch (mysqlError) {
                    console.error('MySQL insert error:', mysqlError);
                }
            }
            
            return NextResponse.json({ success: ok, message: ok ? 'Subdomínio criado no CyberPanel' : 'Erro ao criar subdomínio', details: output });
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
