# Auditoria do painel (admin/revendedor/cliente) — achados e plano de correção

Documento de handoff para outra sessão/agente continuar. Gerado depois de uma auditoria
completa ao menu lateral do painel (4 investigações em paralelo + verificação manual),
motivada por um bug real: a página de DNS Central mostrava registos da conta VisualDesign
dentro do painel de um cliente.

**Estado actual (actualizado nesta sessão):** todos os itens P0 (P0-1..P0-5) e quase todos os
P1 (P1-1..P1-4, P1-6) estão corrigidos, verificados (`tsc --noEmit` limpo) e **commitados e
publicados em `main`** (push feito, commits `96d1753`..`36b06f9`). **P1-5 ficou deliberadamente
por fazer** — ver secção 2. P2/P3 não foram tocados (não urgentes).

**P0-6 (novo, encontrado depois do push inicial) — fuga de cache na impersonação de
revendedor.** O utilizador reportou que ao impersonar a conta "Osher" no painel admin, os dados
apresentados apareciam misturados com os da própria conta admin. Causa: nenhum dos 6 pontos de
entrar/sair de "impersonar revendedor" (`ClientesDaSection.tsx`, `HostingSections.tsx`,
`revendedor/page.tsx`) chamava `clearAllPanelClientCaches()` antes de navegar — a mesma
causa-raiz do bug original de DNS (commit `3bc1d23`), mas nunca aplicada à impersonação
(`window.location.href`/`<a href>` não limpam sessionStorage/localStorage). Corrigido: os 6
pontos passaram a limpar as caches antes de navegar. Commit `21ac2dc`, **commitado localmente,
push ainda NÃO pedido/feito** — confirmar com o utilizador antes de publicar.

**Aviso:** durante esta sessão confirmou-se, por diffs inesperados em `AdminSidebar.tsx` e
`panel-ui.ts` (ajustes cosméticos de hover, não feitos por esta sessão), que **outra sessão
esteve a editar este mesmo working tree em paralelo**, tal como já tinha acontecido antes. Uma
próxima sessão deve verificar `git status`/`git diff` antes de assumir que o working tree está
limpo, e nunca usar `git add -A`.

---

## 1. JÁ CORRIGIDO E COMMITADO LOCALMENTE (sem push)

Não repetir este trabalho.

### Sessões anteriores (commitado + push para `main`)
1. **Unificação de preços de hospedagem** — `src/lib/hosting-plans.ts`. Commit `4747ef6`.
2. **Lentidão ao abrir "Pacotes"** — `PackagesSection` deixou de forçar `fullSync`. Commit `e370b19`.
3. **Campos "ilimitado" a zerar depois de sincronizar** — 3 sítios corrigidos. Commit `d8d9a7d`.
4. **Lentidão nas contas de revendedores** — chamadas ao vivo só quando o espelho está stale. Commit `8e7f20f`.
5. **Fuga de cache entre contas no logout** (causa raiz do bug do DNS) — `clearAllPanelClientCaches()`
   criada e chamada em todos os pontos de logout. Commit `3bc1d23`. (Lacunas desta correcção
   fechadas agora em P0-5, ver abaixo.)

### Esta sessão (commitado localmente, `git push` ainda NÃO feito)
6. **P0-1 — RCE não autenticado em `/api/git-deploy`.** `POST()` passou a exigir
   `requireAdminOrReseller()` + `role==='admin'` (igual ao `GET()`). `isSafeDomain()` aplicado
   em `deploySite`, `getDeployStatus` e também `getGitLog` (mesmo padrão de injecção, não
   estava no plano original mas foi corrigido por consistência). `unlock`/`auth-code` em
   `registrar/domain/manage/route.ts` (já vinha pronto de antes desta sessão) incluído no mesmo
   commit. Menu "Git Integration" removido do painel de revendedor (`revendedor/page.tsx`).
   Commit `96d1753`.
7. **P0-2..P0-5 — fugas de dados entre contas.** Commit `b5c337c`:
   - P0-2: `db-manager/route.ts` — `resolveOwner()` deixou de aceitar `owner` explícito do
     pedido; deriva sempre do `domain` autenticado (mesmo padrão do `backup-manager`). O
     frontend (`DatabasesManagerSection.tsx`) continua a enviar `owner` mas é ignorado —
     deliberadamente não tocado, ver nota no ficheiro.
   - P0-3: `listMirrorPackages()` em `panel-mirror-read.ts` — para scope não-admin, filtra
     agora aos pacotes já atribuídos a algum site do próprio revendedor (via `prefetchedSites`
     ou auto-fetch de `listMirrorWebsites` quando não vier). `revendedor/contas/route.ts`
     actualizado para passar `sites` já obtidos, evitando fetch duplicado. Limitação conhecida
     mantida: pacote recém-criado sem site atribuído ainda não aparece (documentado no código).
   - P0-4: `email-dns-brevo/route.ts` — `{all:true}` agora admin-only; acção de domínio único
     usa novo `canAccessDomain()` (mesmo padrão de `panel-dns/route.ts`).
   - P0-5: `panel-session-cache-clear.ts` — passa a varrer também `localStorage` (não só
     `sessionStorage`) e prefixos `vd-` (hífen) e `webmail_`.
8. **P1-1..P1-4 — IDOR em renewals/cotações/newsletter.** Commit `c922b49`:
   - P1-1: `/api/renewals` GET — `userId` do query só é aceite quando `role==='admin'`.
   - P1-2: `/api/admin/cotacoes` GET+PATCH — restringido a `role==='admin'`.
   - P1-3: fallback "sem contactos no domínio → busca todos" removido em
     `MailMarketingSection.tsx` (`fetchSubs` E também no fluxo de ENVIO de campanha, que tinha
     o mesmo padrão + um bypass `allowedDomains.size===0 → permitir tudo`, não estava no plano
     original mas é a mesma vulnerabilidade). **Réplica encontrada e corrigida também em
     `src/app/cliente/page.tsx`** (painel de cliente tem a sua própria cópia deste componente
     com o mesmo bug no fluxo de envio — mais grave por ser client-facing). O fallback da
     listagem de contactos em `cliente/page.tsx` não precisou de correcção — já filtrava
     correctamente depois do fallback.
   - P1-4: `adminRemoverCampanha`/`adminRemoverSubscritor` em `mailmarketing.ts` passaram a
     verificar posse (`sender_email`/`metadata.domain` do registo == chamador) antes de apagar.
     Assinatura das funções mudou (agora exigem `ownerEmail`/`dominio`) — todos os call-sites
     actualizados, incluindo os duplicados em `cliente/page.tsx` (4 pontos: delete individual,
     delete em lote, delete de campanha individual, delete de campanhas seleccionadas em lote).
   - **Nota:** `src/lib/clientes-api.ts` tem uma TERCEIRA implementação de
     `removerSubscritor`/`removerCampanha` (client-side, chave anon, depende de RLS), usada
     pela UI legada em `src/app/dashboard/mensagens/*`. Não foi tocada — já estava marcada como
     P3/dívida técnica no plano original ("não avaliado em detalhe"). Continua por avaliar.
9. **P1-6 — portefólio de domínios exposto.** `registrar/account/domains/route.ts` GET
   restringido a `role==='admin'` (opção (a) do plano, recomendada por omissão). Confirmado que
   o separador "Domínios registados" já não era alcançável pelo menu do revendedor (nenhum
   `MenuItem` aponta para `domains-registados`) — sem regressão visível. Commit `427878a`.

---

## 2. P1-5 — DELIBERADAMENTE NÃO FEITO, decisão pendente do utilizador

### "manager" tratado como "admin" em `requireAdminOrReseller`
**Ficheiro:** `src/lib/panel-api-auth.ts`, linha 52:
```ts
if (effectiveRole === 'admin' || effectiveRole === 'manager' || ADMIN_EMAILS.has(email)) {
  return { user: { id: user.id, email, role: 'admin' } };  // 'manager' vira 'admin'
}
```
**Confirmado nesta sessão (não só suspeita):** isto propaga-se a `resolvePanelDaContext()`
(`src/lib/panel-api-context.ts`), que para `role==='admin'` chama
`getDirectAdminAPIForAuth(auth.user)` com `mirrorScope: { role: 'admin' }` — ou seja, contas
"manager" recebem literalmente credenciais DirectAdmin admin/root, sem qualquer scoping, em
~30 rotas que usam `requireAdminOrReseller` (`api/da`, `api/db-manager`, `api/backup-manager`,
`api/directadmin-access`, `api/server-exec`, `api/registrar/*`, `api/dns-sync`, etc.).

**Por que não foi corrigido nesta sessão:** `resolvePanelDaContext()` só sabe tratar `'admin'`
e `'reseller'` — não tem NENHUM caminho escopado para `'manager'`. Só
`requirePanelBootstrapAccess()` (usada em `/api/panel/bootstrap`) já trata `'manager'`
correctamente, isolando-o aos próprios sites via `listMirrorWebsitesForClientUser(userId,
email)`.

Isto significa que **simplesmente remover `'manager'` da condição em `panel-api-auth.ts:52`
NÃO É uma correcção segura por si só** — bloquearia managers com 403 em todas essas ~30 rotas,
possivelmente partindo funcionalidade legítima que hoje "funciona" (mesmo que sobre-
-privilegiada). Corrigir a sério exige:
1. Construir um caminho `'manager'` escopado dentro de `resolvePanelDaContext()` (ou equivalente),
   limitado aos sites do próprio manager — usando o mesmo mecanismo do bootstrap como referência.
2. Decidir, rota a rota, quais das ~30 acções fazem sentido para um manager (ex.: PHP/SSL/email
   dos seus próprios sites) e quais devem continuar bloqueadas mesmo com scoping (ex.:
   `server-exec`, `registrar/*` — provavelmente nunca deviam ser acessíveis a "manager").
3. **Testar login real como conta "manager"** depois da alteração — não foi possível nesta
   sessão por falta de credenciais/ambiente de teste.

**Recomendação para a próxima sessão:** perguntar ao utilizador se quer (a) o fix escopado
completo (trabalho maior, mais seguro), ou (b) um bloqueio simples imediato aceitando que
managers ficam sem acesso a essas rotas até o scoping estar pronto. Não aplicar nenhuma das
duas sem confirmação — é o item de maior alcance/risco de toda a auditoria.

---

## 3. P2 / P3 — não urgentes, não tocados nesta sessão

Convenção de severidade: **P2 médio** (lentidão/UX), **P3 baixo** (cosmético).

### P2-1. `moveToReseller` não verifica que a conta pertence ao revendedor de origem
**Ficheiro:** `src/app/api/admin/clientes/route.ts`, acção `moveToReseller` (linhas ~729-746).
Já exige `role==='admin'`, não é explorável por outro revendedor — só protecção contra UI
desactualizada. **Fix:** verificação tipo `assertManagedUser` (já existe em
`revendedor/contas/route.ts:105-109`) antes de `CMD_API_MOVE_USERS`.

### P2-2. Chamada ao vivo desnecessária em `listPackages`
**Ficheiro:** `src/app/api/server-exec/route.ts`, bloco `LIVE_LIST_FALLBACK` (linhas ~212-245).
Mesmo padrão já corrigido em `/api/admin/clientes` (commit `8e7f20f`). **Fix:** gate por
`isMirrorStale`.

### P2-3. Transferir domínio — funcionalidade finge funcionar mas não faz nada
**Ficheiro:** `src/app/dashboard/DomainTransferSection.tsx`. Código EPP nunca é enviado a
nenhum backend; UI mente dizendo "Pedido registado". **Fix curto prazo:** mudar mensagem.
**Fix longo prazo:** implementar endpoint real (fora do âmbito de segurança).

### P2-4. Dropdown "proprietário" em Contas de e-mail sem filtro visível
**Ficheiro:** `src/app/dashboard/HostingSections.tsx:1559` (`EmailManagementSection`). Depende
inteiramente de RLS na tabela `clientes`. **Fix:** confirmar RLS em produção; adicionar filtro
explícito se necessário.

### P3. Itens de baixo risco / cosmético
- `GitDeploySection` guarda `git-deploy-cache` em localStorage, fora da limpeza de logout —
  inofensivo (histórico de commits partilhado).
- Painel do cliente mostra placeholders "Secção não disponível" — código morto inofensivo.
- `src/app/dashboard/mensagens/*` + `src/lib/clientes-api.ts` — implementação antiga/duplicada
  de newsletter, com a sua própria versão (sem verificação de posse) de
  `removerSubscritor`/`removerCampanha`, protegida só por RLS (chave anon). Ainda não avaliada
  em detalhe — candidato natural ao próximo P1 se for reavaliada.

---

## 4. Notas para a próxima sessão

- Todos os commits desta sessão estão **locais, sem push**. Confirmar com o utilizador antes de
  `git push origin main`.
- Antes de qualquer commit novo: `git status` e `git diff --stat`, e nunca `git add -A` — há
  historicamente outra sessão a editar ficheiros de UI (`deploy.sh`, `deploy/deploy-ssh.sh`,
  `deploy/pm2.config.js`, `src/proxy.ts`, `src/app/api/cotacoes/[id]/layouts/route.ts`,
  `src/components/quotations/QuotationLayoutsList.tsx`, `src/components/admin/AdminSidebar.tsx`,
  `src/lib/panel-ui.ts` vistos com alterações não relacionadas durante esta sessão) — só adicionar
  os ficheiros explicitamente tocados pela tarefa em mãos.
- Depois de qualquer alteração: `npx tsc --noEmit -p tsconfig.json` (ignorar erros em
  `.next/dev/types/**` — são artefactos de cache stale, não relacionados com o código-fonte).
