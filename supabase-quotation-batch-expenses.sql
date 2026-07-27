-- Despesas de produção de uma encomenda (materiais, mão-de-obra, etc.), lançadas
-- à mão pela equipa dentro do card da encomenda — uma linha por material/gasto.
-- O total por encomenda alimenta directamente "Custos de produção" na
-- Contabilidade mensal (ver /api/admin/contabilidade), agrupado pelo mês em que
-- a encomenda ficou "Entregue" — não há um valor mensal guardado à parte.
CREATE TABLE IF NOT EXISTS quotation_batch_expenses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  batch_id UUID NOT NULL,
  descricao VARCHAR(255) NOT NULL DEFAULT '',
  valor_mt NUMERIC(12,2) NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_quotation_batch_expenses_batch_id
  ON quotation_batch_expenses(batch_id);

ALTER TABLE quotation_batch_expenses ENABLE ROW LEVEL SECURITY;

CREATE POLICY quotation_batch_expenses_admin ON quotation_batch_expenses
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE user_id = auth.uid() AND role = 'admin')
  );

-- Escrita feita apenas pelo servidor (service role) via API do painel admin.
