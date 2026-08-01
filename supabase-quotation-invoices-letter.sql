-- Acrescenta a letra da marca ao número de factura real, para ficar legível
-- e consistente com o "número prático" da encomenda (mesmo alfabeto:
-- D=Design, W=Web, P=Produções, T=Transporte, E=Eventos, B=Brindes,
-- O=fallback — ver letterForCategoria em src/lib/quotation-numero.ts).
-- Formato passa de "FT 2026/0143" para "FT022026/P0001" (mês com 2 dígitos,
-- sem espaço a seguir a "FT", letra antes da sequência). A sequência
-- continua anual e global (partilhada entre marcas e entre as fases
-- advance/remainder) — não muda, só o texto à volta dela.
--
-- CREATE OR REPLACE é seguro e atómico: não reescreve facturas já emitidas
-- (a função continua a devolver o número existente via v_existing antes de
-- gerar um novo — linhas antigas ficam com o formato antigo para sempre).
CREATE OR REPLACE FUNCTION assign_quotation_invoice_number(
  p_batch_id UUID,
  p_phase TEXT DEFAULT 'advance',
  p_letter TEXT DEFAULT 'O'
)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_existing TEXT;
  v_year INTEGER := EXTRACT(YEAR FROM now())::INTEGER;
  v_month TEXT := LPAD(EXTRACT(MONTH FROM now())::TEXT, 2, '0');
  v_letter TEXT := COALESCE(NULLIF(p_letter, ''), 'O');
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

  v_number := 'FT' || v_month || v_year || '/' || v_letter || LPAD(v_seq::TEXT, 4, '0');

  INSERT INTO quotation_invoices (batch_id, invoice_number, series_year, sequence_number, phase)
  VALUES (p_batch_id, v_number, v_year, v_seq, p_phase);

  RETURN v_number;
END;
$$;
