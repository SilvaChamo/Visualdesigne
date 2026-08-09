-- Campo que decide qual servidor de hospedagem trata cada conta (DirectAdmin
-- ou HestiaCP). Aditivo e seguro: linhas existentes ficam automaticamente
-- 'directadmin' (comportamento actual, sem mudança nenhuma para contas já
-- provisionadas).
ALTER TABLE public.panel_auth_accounts
  ADD COLUMN IF NOT EXISTS provider TEXT NOT NULL DEFAULT 'directadmin';

CREATE INDEX IF NOT EXISTS idx_panel_auth_accounts_provider ON public.panel_auth_accounts (provider);
