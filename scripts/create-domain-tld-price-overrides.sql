-- Tabela de preços de domínio sincronizados a sério com a Dynadot.
-- A lista de preços "de fábrica" continua a existir no código (domain-tld-prices.ts)
-- como ponto de partida e frase de segurança (se a sincronização nunca correr,
-- ou uma extensão nova ainda não tiver sido sincronizada, usa-se esse valor).
-- Esta tabela guarda o valor mais recente veio a sério da Dynadot, por extensão.
create table if not exists domain_tld_price_overrides (
  tld text primary key,
  price_usd numeric not null,
  renew_price_usd numeric not null,
  transfer_price_usd numeric,
  updated_at timestamptz not null default now(),
  source text not null default 'dynadot'
);
