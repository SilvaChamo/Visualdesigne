-- Fecho de exercício anual — equivalente ao "Fecho do Exercício"/Balancete de
-- Encerramento do Primavera. Uma vez fechado um ano, os totais ficam
-- congelados aqui (não se recalculam mais a partir dos dados vivos, ao
-- contrário do Balanço mensal). O fecho é sempre um acto deliberado do admin
-- (botão "Fechar ano"), nunca automático — dá tempo para rever/corrigir os
-- 12 meses antes de trancar. Serve de base interna para levar ao
-- contabilista; não substitui certificação fiscal (SAF-T, IRPC, etc.).
CREATE TABLE IF NOT EXISTS accounting_year_closings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  year INTEGER NOT NULL UNIQUE,
  receita_mt NUMERIC(14,2) NOT NULL DEFAULT 0,
  custos_producao_mt NUMERIC(14,2) NOT NULL DEFAULT 0,
  iva_percent NUMERIC(5,2) NOT NULL DEFAULT 16,
  iva_mt NUMERIC(14,2) NOT NULL DEFAULT 0,
  lucro_mt NUMERIC(14,2) NOT NULL DEFAULT 0,
  closed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  closed_by TEXT
);

ALTER TABLE accounting_year_closings ENABLE ROW LEVEL SECURITY;

CREATE POLICY accounting_year_closings_admin ON accounting_year_closings
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE user_id = auth.uid() AND role = 'admin')
  );

-- Escrita feita apenas pelo servidor (service role) via API do painel admin.
