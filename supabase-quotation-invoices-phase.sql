-- Duas facturas por encomenda em vez de uma: uma emitida no adiantamento
-- (70%, como já acontecia), outra no remanescente (30%, quando a encomenda
-- fica paga na totalidade). `phase` distingue as duas; UNIQUE passa a ser
-- por (batch_id, phase) em vez de só batch_id. Linhas já existentes ficam
-- como 'advance' (é exactamente o que já eram — a factura emitida na
-- aprovação).
ALTER TABLE quotation_invoices
  ADD COLUMN IF NOT EXISTS phase TEXT NOT NULL DEFAULT 'advance' CHECK (phase IN ('advance', 'remainder'));

ALTER TABLE quotation_invoices
  DROP CONSTRAINT IF EXISTS quotation_invoices_batch_id_key;

ALTER TABLE quotation_invoices
  ADD CONSTRAINT quotation_invoices_batch_id_phase_key UNIQUE (batch_id, phase);

-- Mesma função, agora parametrizada por fase — continua idempotente (uma
-- chamada repetida para a mesma encomenda+fase devolve sempre o mesmo
-- número) e a usar o mesmo contador anual partilhado entre as duas fases
-- (é a mesma série de facturas da empresa, só que agora com duas entradas
-- possíveis por encomenda).
CREATE OR REPLACE FUNCTION assign_quotation_invoice_number(p_batch_id UUID, p_phase TEXT DEFAULT 'advance')
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
  WHERE batch_id = p_batch_id AND phase = p_phase;

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

  INSERT INTO quotation_invoices (batch_id, invoice_number, series_year, sequence_number, phase)
  VALUES (p_batch_id, v_number, v_year, v_seq, p_phase);

  RETURN v_number;
END;
$$;
