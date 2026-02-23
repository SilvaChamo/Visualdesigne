# VisualDesign Admin Panel — Notas do Projeto

## Stack
- **Framework**: Next.js 15 (App Router, TypeScript)
- **UI**: TailwindCSS, Lucide icons, shadcn/ui
- **Base de dados**: Supabase (PostgreSQL)
- **Hosting**: CyberPanel + OpenLiteSpeed + PM2 no VPS Contabo
- **Servidor**: `109.199.104.22` (Ubuntu 24.04)
- **Domínio**: `visualdesign.ao`

---

## Acesso ao Servidor
```
SSH: ssh -i /Users/macbook/.ssh/visualdesign_cyberpanel_key root@109.199.104.22
CyberPanel: https://109.199.104.22:8090
Site: http://visualdesign.ao
Admin: http://visualdesign.ao/admin
```
Credenciais admin painel: `silva.chamo@gmail.com` / `0001`

---

## Arquitectura de Integração CyberPanel

### Modo de operação (CYBERPANEL_USE_LOCAL_EXEC=true)
O app corre no mesmo servidor que o CyberPanel. Todas as operações usam `child_process.exec` diretamente — sem SSH externo, sem API REST necessária.

### Ficheiro utilitário central
`src/lib/cyberpanel-exec.ts` — `executeCyberPanelCommand(cmd)`:
- Se `CYBERPANEL_USE_LOCAL_EXEC=true` → usa `child_process.exec`
- Se SSH configurado → usa `ssh2`
- Se nada configurado → retorna `''` (graceful fallback)

### Rotas API
| Rota | Função |
|------|--------|
| `/api/cyberpanel-proxy` | Proxy genérico para REST API do CyberPanel |
| `/api/cyberpanel-db` | **Leitura direta MySQL** — websites, users, packages (GET) + createWebsite/deleteWebsite (POST) |
| `/api/cyberpanel-packages` | CRUD pacotes via CLI/MySQL |
| `/api/cyberpanel-email` | CRUD emails via CLI |
| `/api/cyberpanel-dns` | CRUD registos DNS via MySQL pdns |
| `/api/cyberpanel-wp` | Instalar WordPress via CLI/WP-CLI |

### Fluxo de dados (loadCyberPanelData em page.tsx)
1. **Primário**: `/api/cyberpanel-db?type=all` (MySQL direto)
2. **Fallback**: REST API proxy (`/api/cyberpanel-proxy`)
3. **Fallback 2**: Supabase
4. **Fallback 3**: localStorage

---

## Configuração do Servidor

### Ficheiro .env.local no servidor
`/home/visualdesign.ao/public_html/.env.local`:
```
NEXT_PUBLIC_SUPABASE_URL=https://gwankhxcbkrtgxopbxwd.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY=sb_publishable_NkNwKuVE-AyGgyxKB6zpmQ_b-HdjWOA
CYBERPANEL_URL=https://localhost:8090/api
CYBERPANEL_PASS=Vgz5Zat4uMyFt2tb
CYBERPANEL_USER=admin
CYBERPANEL_IP=127.0.0.1
CYBERPANEL_SSH_USER=root
CYBERPANEL_USE_LOCAL_EXEC=true
```

### LiteSpeed vhost proxy
`/usr/local/lsws/conf/vhosts/visualdesign.ao/vhost.conf`:
```
docRoot /home/visualdesign.ao/public_html/
rewrite { enable 1; rules RewriteRule ^(.*)$ http://127.0.0.1:3002/$1 [P,L] }
```

### PM2
```bash
pm2 list              # ver estado
pm2 restart visualdesign  # reiniciar
pm2 logs visualdesign     # ver logs
```

---

## Deploy / Atualização
Ver workflow `/deploy` ou corre:
```bash
bash /Users/macbook/Desktop/APP/visualdesign/deploy/instalar-no-servidor.sh
```

Atualização rápida (só código):
```bash
rsync -avz --exclude node_modules --exclude .next --exclude .git --exclude "*.env*" \
  -e "ssh -i /Users/macbook/.ssh/visualdesign_cyberpanel_key" \
  /Users/macbook/Desktop/APP/visualdesign/ \
  root@109.199.104.22:/home/visualdesign.ao/public_html/ && \
ssh -i /Users/macbook/.ssh/visualdesign_cyberpanel_key root@109.199.104.22 \
  "cd /home/visualdesign.ao/public_html && npm run build && pm2 restart visualdesign"
```

---

## GitHub
```
Remote: https://github.com/SilvaChamo/Visualdesigne.git
Branch: main
Push: git add -A && git commit -m "..." && git push origin main
```

---

## Tarefas Pendentes
- [ ] SSL Let's Encrypt para `visualdesign.ao` (aguardar propagação DNS)
- [ ] Testar sincronização completa CyberPanel ↔ painel admin após deploy
- [ ] Verificar criação de sites no CyberPanel via `/api/cyberpanel-db`
- [ ] Testar listas de pacotes, domínios, utilizadores no painel admin

## Tabelas Supabase necessárias
Ver ficheiros `.sql` na raiz do projeto:
- `supabase-setup-completo.sql` — setup completo
- `supabase-cyberpanel-users.sql` — tabela de utilizadores
- `supabase-cyberpanel-sites.sql` — tabela de sites
