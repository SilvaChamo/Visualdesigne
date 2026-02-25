import { NextRequest, NextResponse } from 'next/server';
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
      port: 22,
      username: 'root',
      privateKey,
    });
  });
}

export async function POST(req: NextRequest) {
  try {
    const { action, params = {} } = await req.json();
    let data: any = {};

    switch (action) {

      case 'listWebsites': {
        const raw = await execSSH(`/usr/local/CyberPanel/bin/python /usr/local/CyberCP/manage.py shell -c "
from websiteFunctions.models import Websites
sites = list(Websites.objects.values('id','domain','adminEmail','package','state','phpSelection','ssl'))
print(sites)
"`);
        try { 
          // Parse do output do Django shell
          const lines = raw.trim().split('\n');
          const dataLine = lines.find(line => line.startsWith('[') && line.endsWith(']'));
          if (dataLine) {
            data = eval(dataLine); // Avalia a lista Python
          } else {
            data = [];
          }
        } catch { 
          data = []; 
        }
        break;
      }

      case 'listPackages': {
        const raw = await execSSH(`/usr/local/CyberPanel/bin/python /usr/local/CyberCP/manage.py shell -c "
from packages.models import Package
pkgs = list(Package.objects.values())
print(pkgs)
"`);
        try { 
          // Parse do output do Django shell
          const lines = raw.trim().split('\n');
          const dataLine = lines.find(line => line.startsWith('[') && line.endsWith(']'));
          if (dataLine) {
            data = eval(dataLine); // Avalia a lista Python
          } else {
            data = [];
          }
        } catch { 
          data = []; 
        }
        break;
      }

      case 'createPackage': {
        const raw = await execSSH(`/usr/local/CyberPanel/bin/python /usr/local/CyberCP/manage.py shell -c "
from packages.models import Package
from loginSystem.models import Administrator
admin = Administrator.objects.first()
pkg = Package.objects.create(
  admin=admin,
  packageName='${params.packageName}',
  diskSpace='${params.diskSpace}',
  bandwidth='${params.bandwidth}',
  emailAccounts='${params.emailAccounts}',
  dataBases='${params.dataBases}'
)
print({'success': True, 'id': pkg.id})
"`);
        // Parse do output do Django shell
        const match = raw.match(/\{'success': True, 'id': (\d+)\}/);
        if (match) {
          data = { success: true, id: parseInt(match[1]) };
        } else {
          data = { success: false, error: raw };
        }
        break;
      }

      case 'deletePackage': {
        const raw = await execSSH(`/usr/local/CyberPanel/bin/python /usr/local/CyberCP/manage.py shell -c "
from packages.models import Package
deleted, _ = Package.objects.filter(packageName='${params.packageName}').delete()
print({'success': deleted > 0, 'deleted': deleted})
"`);
        // Parse do output do Django shell
        const match = raw.match(/\{'success': (True|False), 'deleted': (\d+)\}/);
        if (match) {
          data = { success: match[1] === 'True', deleted: parseInt(match[2]) };
        } else {
          data = { success: false, error: raw };
        }
        break;
      }

      case 'listUsers': {
        const raw = await execSSH(`/usr/local/CyberPanel/bin/python /usr/local/CyberCP/manage.py shell -c "
from loginSystem.models import Administrator
users = list(Administrator.objects.values('id','userName','email','type','state'))
print(users)
"`);
        try { 
          // Parse do output do Django shell
          const lines = raw.trim().split('\n');
          const dataLine = lines.find(line => line.startsWith('[') && line.endsWith(']'));
          if (dataLine) {
            data = eval(dataLine); // Avalia a lista Python
          } else {
            data = [];
          }
        } catch { 
          data = []; 
        }
        break;
      }

      case 'suspendWebsite': {
        const raw = await execSSH(`python3 -c "
import sys
sys.path.insert(0, '/usr/local/CyberCP')
import django, os
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'CyberCP.settings')
django.setup()
from websiteFunctions.models import Websites
Websites.objects.filter(domain='${params.domain}').update(state='Suspended')
print('ok')
"`);
        data = { success: raw.includes('ok') };
        break;
      }

      case 'unsuspendWebsite': {
        const raw = await execSSH(`python3 -c "
import sys
sys.path.insert(0, '/usr/local/CyberCP')
import django, os
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'CyberCP.settings')
django.setup()
from websiteFunctions.models import Websites
Websites.objects.filter(domain='${params.domain}').update(state='Active')
print('ok')
"`);
        data = { success: raw.includes('ok') };
        break;
      }

      case 'deleteWebsite': {
        const raw = await execSSH(
          `/usr/local/CyberCP/bin/python /usr/local/CyberCP/plogical/websiteManager.py deleteWebsite --domainName ${params.domain} 2>&1` 
        );
        data = { output: raw };
        break;
      }

      case 'createWebsite': {
        const raw = await execSSH(
          `/usr/local/CyberCP/bin/python /usr/local/CyberCP/plogical/websiteManager.py createWebsite ` +
          `--domainName ${params.domain} --ownerEmail ${params.email} --websiteOwner ${params.username} ` +
          `--packageName "${params.packageName}" --websiteEmail ${params.email} --php ${params.php || '8.2'} --ssl 1 --dkim 1 2>&1` 
        );
        data = { output: raw };
        break;
      }

      case 'listEmails': {
        const raw = await execSSH(
          `doveadm user '*@${params.domain}' 2>/dev/null || echo ""` 
        );
        data = { emails: raw.trim().split('\n').filter(Boolean) };
        break;
      }

      case 'createEmail': {
        const raw = await execSSH(
          `python3 /usr/local/CyberCP/plogical/mailUtilities.py createEmail ` +
          `--domainName ${params.domain} --dEmail ${params.email} --dPassword '${params.password}' 2>&1` 
        );
        data = { output: raw };
        break;
      }

      case 'deleteEmail': {
        const raw = await execSSH(
          `python3 /usr/local/CyberCP/plogical/mailUtilities.py deleteEmail ` +
          `--domainName ${params.domain} --email ${params.email} 2>&1` 
        );
        data = { output: raw };
        break;
      }

      case 'listDNS': {
        const raw = await execSSH(
          `cat /etc/named/conf.d/${params.domain}.conf 2>/dev/null || echo ""` 
        );
        data = { zone: raw };
        break;
      }

      case 'serverStats': {
        const raw = await execSSH(
          `echo "CPU:$(top -bn1 | grep 'Cpu(s)' | awk '{print $2}')" && ` +
          `echo "RAM:$(free -m | awk 'NR==2{printf "%s/%s", $3,$2}')" && ` +
          `echo "DISK:$(df -h / | awk 'NR==2{print $3"/"$2}')"` 
        );
        data = Object.fromEntries(
          raw.trim().split('\n').filter(Boolean).map(l => l.split(':'))
        );
        break;
      }

      case 'execCommand': {
        data = { output: await execSSH(params.command) };
        break;
      }

      default:
        return NextResponse.json({ success: false, error: `Acção desconhecida: ${action}` }, { status: 400 });
    }

    return NextResponse.json({ success: true, data });

  } catch (e: any) {
    console.error('[server-exec]', e.message);
    return NextResponse.json({ success: false, error: e.message }, { status: 500 });
  }
}
