# Configurar Secrets para o deploy no Hetzner

Este repositório usa GitHub Actions para fazer deploy automático no servidor Hetzner quando há push para a branch `main`.

## Onde adicionar os secrets

1. Abra o repositório no GitHub.
2. Clique em `Settings` (Configurações).
3. No menu lateral, vá em `Secrets and variables` > `Actions`.
4. Clique em `New repository secret`.

## Quais secrets adicionar

Adicione os seguintes secrets:

- `HETZNER_HOST`
  - Valor: `37.27.17.25`
- `HETZNER_PORT`
  - Valor: `2234`
- `HETZNER_USER`
  - Valor: `root`
- `HETZNER_SSH_KEY`
  - Valor: o conteúdo da chave privada SSH que tem acesso ao servidor.
  - Exemplo: todo o texto de `/Users/imac/.ssh/claude_hetzner`.

> O secret `HETZNER_SSH_KEY` deve ser a chave privada inteira, com `-----BEGIN OPENSSH PRIVATE KEY-----` e `-----END OPENSSH PRIVATE KEY-----`.

## Após adicionar

Depois de criar os secrets, qualquer push para `main` irá acionar o workflow:

- `.github/workflows/deploy-hetzner.yml`

O workflow fará:

1. checkout do código
2. instalação de dependências
3. build do projeto
4. deploy no Hetzner via SSH
5. restart do PM2

## Observação

- Se precisares, posso também criar uma versão resumida disto no `README.md` principal.
