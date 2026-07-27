-- Contabilidade mensal — só guarda o que ninguém consegue calcular sozinho
-- (custos de produção, digitados à mão pela equipa) e a percentagem de IVA
-- usada nesse mês. A receita e o lucro NUNCA são guardados aqui: são sempre
-- calculados na hora a partir de quotation_requests + quotation_status_history
-- (ver /api/admin/contabilidade), para nunca desincronizar dos dados reais.
CREATE TABLE IF NOT EXISTS monthly_accounting (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  month DATE NOT NULL UNIQUE, -- sempre o dia 1 do mês (ex.: 2026-07-01)
  custos_producao_mt NUMERIC(12,2) NOT NULL DEFAULT 0,
  iva_percent NUMERIC(5,2) NOT NULL DEFAULT 16,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE monthly_accounting ENABLE ROW LEVEL SECURITY;

CREATE POLICY monthly_accounting_admin ON monthly_accounting
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE user_id = auth.uid() AND role = 'admin')
  );

-- Escrita feita apenas pelo servidor (service role) via API do painel admin.
