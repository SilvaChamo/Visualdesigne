-- Registo fixo de contabilidade por encomenda — gravado uma única vez quando a
-- encomenda (todas as linhas do batch) fica 'done' (remanescente pago, entregue).
-- Ao contrário de quotation_requests/quotation_batch_expenses, que continuam a
-- poder mudar depois (ex.: nova despesa lançada, nota corrigida), este registo
-- é uma cópia congelada dos valores nesse momento — a base das abas "Cotações"
-- e "Facturas" da Contabilidade, para nunca perder o histórico mesmo que os
-- dados de origem sejam depois alterados. Gravado por
-- PATCH /api/admin/cotacoes quando o estado agregado do batch passa a 'done'.
CREATE TABLE IF NOT EXISTS accounting_batch_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  batch_id UUID NOT NULL UNIQUE,
  primary_item_id UUID NOT NULL,
  numero TEXT NOT NULL,
  invoice_number TEXT,
  empresa TEXT NOT NULL,
  nif TEXT,
  resumo TEXT NOT NULL DEFAULT '',
  receita_mt NUMERIC(12,2) NOT NULL DEFAULT 0,
  custos_producao_mt NUMERIC(12,2) NOT NULL DEFAULT 0,
  iva_percent NUMERIC(5,2) NOT NULL DEFAULT 16,
  iva_mt NUMERIC(12,2) NOT NULL DEFAULT 0,
  lucro_mt NUMERIC(12,2) NOT NULL DEFAULT 0,
  done_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Sem FK/CASCADE para quotation_requests: batch_id não é chave única lá (agrupa
-- várias linhas), e este registo tem de sobreviver mesmo que a encomenda de
-- origem venha a ser apagada mais tarde.

CREATE INDEX IF NOT EXISTS idx_accounting_batch_snapshots_done_at
  ON accounting_batch_snapshots(done_at DESC);

ALTER TABLE accounting_batch_snapshots ENABLE ROW LEVEL SECURITY;

CREATE POLICY accounting_batch_snapshots_admin ON accounting_batch_snapshots
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE user_id = auth.uid() AND role = 'admin')
  );

-- Escrita feita apenas pelo servidor (service role) via API do painel admin.
