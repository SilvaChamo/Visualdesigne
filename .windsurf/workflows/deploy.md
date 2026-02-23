---
description: Deploy ou atualizar o site VisualDesign no servidor de produção
---

## Pré-requisitos
- Chave SSH em `/Users/macbook/.ssh/visualdesign_cyberpanel_key`
- Servidor: `109.199.104.22` (Ubuntu 24.04, CyberPanel + LiteSpeed + PM2)
- Site em `/home/visualdesign.ao/public_html`
- Next.js app na porta `3002`, gerido pelo PM2 com nome `visualdesign`

## Deploy completo (primeira vez ou reset)

// turbo
1. Corre o script automático:
```bash
bash /Users/macbook/Desktop/APP/visualdesign/deploy/instalar-no-servidor.sh
```

## Atualização rápida (após alterações no código)

// turbo
2. Envia apenas o código novo e reconstrói:
```bash
rsync -avz --exclude node_modules --exclude .next --exclude .git --exclude "*.env*" \
  -e "ssh -i /Users/macbook/.ssh/visualdesign_cyberpanel_key" \
  /Users/macbook/Desktop/APP/visualdesign/ \
  root@109.199.104.22:/home/visualdesign.ao/public_html/ && \
ssh -i /Users/macbook/.ssh/visualdesign_cyberpanel_key root@109.199.104.22 \
  "cd /home/visualdesign.ao/public_html && npm run build && pm2 restart visualdesign"
```

## Verificar estado do site no servidor

// turbo
3. Verifica PM2 e acesso:
```bash
ssh -i /Users/macbook/.ssh/visualdesign_cyberpanel_key root@109.199.104.22 \
  "pm2 list && curl -s -o /dev/null -w '%{http_code}' http://127.0.0.1:3002"
```

## Acesso
- Site público: `http://visualdesign.ao` (DNS pode demorar a propagar)
- Painel admin: `http://visualdesign.ao/admin`
- Credenciais admin: `silva.chamo@gmail.com` / `0001`
- CyberPanel: `https://109.199.104.22:8090`
