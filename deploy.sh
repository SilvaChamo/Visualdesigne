#!/bin/bash
echo "Iniciando Deploy da VisualDesign..."
cd /opt/visualdesign-site || exit
git pull origin main
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"
npm install
npm run build
pm2 restart visualdesign-site || pm2 start npm --name "visualdesign-site" -- start -- -p 3003
pm2 save
echo "Deploy Concluído!"
