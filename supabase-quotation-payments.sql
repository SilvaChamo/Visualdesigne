-- Livro de pagamentos — registo real do valor confirmado em cada fase
-- (adiantamento 70% / remanescente 30%), distinto do simples rótulo de
-- método de pagamento já existente em quotation_requests. Alimentado por
-- PATCH /api/admin/cotacoes, no mesmo momento em que se emite o número de
-- Factura (status passa a 'approved' ou 'done'). Sem certificação/SAF-T —
-- isso fica para depois; isto só garante que existe um registo real do
-- dinheiro confirmado, em vez de assumir sempre o valor total da cotação.

CREATE TABLE IF NOT EXISTS quotation_payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  batch_id UUID NOT NULL,
  phase TEXT NOT NULL CHECK (phase IN ('advance', 'remainder')),
  metodo TEXT,
  valor_mt NUMERIC(12,2) NOT NULL,
  confirmed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (batch_id, phase)
);

-- Sem FK/CASCADE para quotation_requests: batch_id não é chave única lá
-- (agrupa várias linhas), e um pagamento já confirmado tem de sobreviver
-- mesmo que a encomenda venha a ser apagada mais tarde.

CREATE INDEX IF NOT EXISTS idx_quotation_payments_batch_id ON quotation_payments(batch_id);

ALTER TABLE quotation_payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY quotation_payments_own ON quotation_payments
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM quotation_requests qr
      WHERE qr.batch_id = quotation_payments.batch_id AND qr.user_id = auth.uid()
    )
  );

CREATE POLICY quotation_payments_admin ON quotation_payments
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE user_id = auth.uid() AND role = 'admin')
  );

-- Escrita feita apenas pelo servidor (service role), nunca directamente pelo browser.
