#!/bin/bash

# Trigger GitHub Actions deploy via repository_dispatch webhook
# Usa API token normal (só precisa de repo scope)

set -e

# Configuração
REPO_OWNER="SilvaChamo"
REPO_NAME="Visualdesigne"
EVENT_TYPE="deploy-trigger"

# Ler token do .env.local ou pedir
if [ -f ".env.local" ]; then
  TOKEN=$(grep GITHUB_TOKEN .env.local | cut -d'=' -f2 | tr -d '"' || echo "")
fi

if [ -z "$TOKEN" ]; then
  echo "❌ GITHUB_TOKEN não encontrado em .env.local"
  echo "Adiciona a .env.local: GITHUB_TOKEN=ghp_..."
  exit 1
fi

echo "🚀 Disparando deploy para $REPO_OWNER/$REPO_NAME..."

# Disparar webhook
RESPONSE=$(curl -s -X POST \
  -H "Accept: application/vnd.github.v3+json" \
  -H "Authorization: token $TOKEN" \
  https://api.github.com/repos/$REPO_OWNER/$REPO_NAME/dispatches \
  -d "{\"event_type\":\"$EVENT_TYPE\"}")

if echo "$RESPONSE" | grep -q '"message": "Accepted"'; then
  echo "✅ Deploy disparado com sucesso!"
  echo "📊 Ver progresso em: https://github.com/$REPO_OWNER/$REPO_NAME/actions"
else
  echo "❌ Erro ao disparar deploy:"
  echo "$RESPONSE"
  exit 1
fi
