---
description: Guardar código no GitHub (push)
---

## Remote configurado
- Repositório: `https://github.com/SilvaChamo/Visualdesigne.git`
- Branch principal: `main`

## Guardar alterações no GitHub

// turbo
1. Adiciona todos os ficheiros alterados:
```bash
git add -A
```

// turbo
2. Cria um commit com descrição:
```bash
git commit -m "Descrição das alterações"
```

// turbo
3. Envia para o GitHub:
```bash
git push origin main
```

## Comando único (add + commit + push)
```bash
git add -A && git commit -m "Atualização do painel VisualDesign" && git push origin main
```

## Ver estado atual
```bash
git status && git log --oneline -5
```

## Notas
- O ficheiro `.env.local` está no `.gitignore` e NÃO é enviado para o GitHub (segurança)
- O ficheiro `deploy/env.production.template` tem as variáveis de ambiente para o servidor (sem passwords sensíveis)
- Após push, corre o workflow `/deploy` para atualizar o servidor
