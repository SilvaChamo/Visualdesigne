-- Numeração sequencial real de Factura — distinta do "número prático" da
-- encomenda (esse é recalculado ao vivo em src/lib/quotation-numero.ts e
-- pode deslocar-se se uma encomenda for apagada; uma factura emitida NUNCA
-- pode mudar de número). Emitido uma única vez quando uma encomenda passa a
-- status='approved' (ver PATCH /api/admin/cotacoes), via
-- assign_quotation_invoice_number(). Sem certificação AT/SAF-T — isso fica
-- para depois, junto de um contabilista; isto só garante uma série
-- sequencial, sem falhas e imutável, condição mínima para qualquer factura.

-- Contador por ano civil — uma linha por ano, incrementada atomicamente.
CREATE TABLE IF NOT EXISTS quotation_invoice_counters (
  year INTEGER PRIMARY KEY,
  last_sequence INTEGER NOT NULL DEFAULT 0
);

-- Uma factura emitida por encomenda (batch_id). Sem FK/CASCADE para
-- quotation_requests: batch_id nem é chave única lá (agrupa várias linhas),
-- e uma factura já emitida tem de sobreviver mesmo que a encomenda venha a
-- ser apagada mais tarde (ver bloqueio no DELETE /api/admin/cotacoes).
CREATE TABLE IF NOT EXISTS quotation_invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  batch_id UUID NOT NULL UNIQUE,
  invoice_number TEXT NOT NULL UNIQUE,
  series_year INTEGER NOT NULL,
  sequence_number INTEGER NOT NULL,
  issued_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_quotation_invoices_batch_id ON quotation_invoices(batch_id);

ALTER TABLE quotation_invoice_counters ENABLE ROW LEVEL SECURITY;
ALTER TABLE quotation_invoices ENABLE ROW LEVEL SECURITY;

-- Só o servidor (service role) lê/escreve o contador — nunca exposto ao browser.
CREATE POLICY quotation_invoice_counters_admin ON quotation_invoice_counters
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE user_id = auth.uid() AND role = 'admin')
  );

CREATE POLICY quotation_invoices_own ON quotation_invoices
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM quotation_requests qr
      WHERE qr.batch_id = quotation_invoices.batch_id AND qr.user_id = auth.uid()
    )
  );

CREATE POLICY quotation_invoices_admin ON quotation_invoices
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE user_id = auth.uid() AND role = 'admin')
  );

-- Escrita feita apenas pelo servidor (service role) via esta função, nunca
-- directamente pelo browser.

-- Idempotente: se a encomenda já tiver factura emitida, devolve o número
-- existente em vez de criar outro. Incremento atómico do contador do ano
-- corrente (o UPDATE bloqueia a linha normalmente até ao commit, o que já
-- serializa chamadas concorrentes no Postgres).
CREATE OR REPLACE FUNCTION assign_quotation_invoice_number(p_batch_id UUID)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_existing TEXT;
  v_year INTEGER := EXTRACT(YEAR FROM now())::INTEGER;
  v_seq INTEGER;
  v_number TEXT;
BEGIN
  SELECT invoice_number INTO v_existing
  FROM quotation_invoices
  WHERE batch_id = p_batch_id;

  IF v_existing IS NOT NULL THEN
    RETURN v_existing;
  END IF;

  INSERT INTO quotation_invoice_counters (year, last_sequence)
  VALUES (v_year, 0)
  ON CONFLICT (year) DO NOTHING;

  UPDATE quotation_invoice_counters
  SET last_sequence = last_sequence + 1
  WHERE year = v_year
  RETURNING last_sequence INTO v_seq;

  v_number := 'FT ' || v_year || '/' || LPAD(v_seq::TEXT, 4, '0');

  INSERT INTO quotation_invoices (batch_id, invoice_number, series_year, sequence_number)
  VALUES (p_batch_id, v_number, v_year, v_seq);

  RETURN v_number;
END;
$$;
