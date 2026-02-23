---
description: Deploy ou atualizar o site VisualDesign no servidor de produção
---

## Estado Atual ✅
- [x] Servidor configurado: `109.199.104.22` (Ubuntu 24.04, CyberPanel + OpenLiteSpeed + PM2)
- [x] Site acessível em `http://visualdesign.ao` (via /etc/hosts no Mac)
- [x] LiteSpeed proxy configurado: porta 80 → porta 3002
- [x] PM2 a gerir o processo com nome `visualdesign`
- [x] DNS registado: A record `visualdesign.ao` → `109.199.104.22` (a propagar)
- [x] Sincronização CyberPanel via MySQL direto (`/api/cyberpanel-db`)
- [x] i18n PT/EN completo (site público + dashboard admin)
- [x] Login: logo dentro do formulário, tamanho aumentado
- [ ] SSL Let's Encrypt — aguardar propagação DNS para emitir

## Pré-requisitos
- Chave SSH em `/Users/macbook/.ssh/visualdesign_cyberpanel_key`
- Servidor: `109.199.104.22` (Ubuntu 24.04, CyberPanel + LiteSpeed + PM2)
- Site em `/home/visualdesign.ao/public_html`
- Next.js app na porta `3002`, gerido pelo PM2 com nome `visualdesign`
- `.env.local` no servidor com `CYBERPANEL_USE_LOCAL_EXEC=true`

## Deploy completo (primeira vez ou reset)

// turbo
1. Corre o script automático:
```bash
bash /Users/macbook/Desktop/APP/visualdesign/deploy/instalar-no-servidor.sh
```

## Atualização rápida (após alterações no código) ← USA ESTE

// turbo
2. Envia apenas o código novo e reconstrói:
```bash
rsync -avz --exclude node_modules --exclude .next --exclude .git --exclude "*.env*" \
  -e "ssh -i /Users/macbook/.ssh/visualdesign_cyberpanel_key" \
  /Users/macbook/Desktop/APP/visualdesign/ \
  root@109.199.104.22:/home/visualdesign.ao/public_html/ && \
ssh -i /Users/macbook/.ssh/visualdesign_cyberpanel_key root@109.199.104.22 \
  "cd /home/visualdesign.ao/public_html && npm run build && pm2 restart visualdesign && echo DONE"
```

## Verificar estado do site no servidor

// turbo
3. Verifica PM2 e acesso:
```bash
ssh -i /Users/macbook/.ssh/visualdesign_cyberpanel_key root@109.199.104.22 \
  "pm2 list && curl -s -o /dev/null -w '%{http_code}' http://127.0.0.1:3002"
```

## GitHub Actions — Futuro (CI/CD)
Para deploy automático com GitHub Actions, precisa de:
- Token com scope `workflow` (o atual não tem)
- Configurar secrets no repositório

**Por enquanto, use deploy manual (abaixo).** Quando tiver token com scope `workflow`, pode criar `.github/workflows/deploy.yml`.

---

## Emitir SSL (após DNS propagar)
4. No CyberPanel `https://109.199.104.22:8090`:
```
Websites → List Websites → Manage (visualdesign.ao) → SSL → Issue SSL
```
Depois atualizar vhost.conf para redirecionar HTTP → HTTPS.

## Acesso
- Site público: `http://visualdesign.ao`
- Painel admin: `http://visualdesign.ao/admin` (login: `silva.chamo@gmail.com` / `0001`)
- CyberPanel: `https://109.199.104.22:8090`
- GitHub: `https://github.com/SilvaChamo/Visualdesigne`
