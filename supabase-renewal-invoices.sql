-- Numeração sequencial de factura para o ciclo de cobrança de renovações
-- (domínios/hospedagem) — distinta de quotation_invoices (essa é para
-- cotações/encomendas). Uma factura por (service_type, service_id,
-- expiration_date): é atribuída uma única vez, na primeira notificação de
-- renovação processada para esse ciclo (normalmente o lembrete de 60 dias —
-- ver src/app/api/cron/renewal-check/route.ts), e o mesmo número continua a
-- aparecer em todos os lembretes seguintes do mesmo ciclo (45, 30, 15, 7, 3,
-- 1 dia e confirmação). Quando o serviço é renovado e a expiration_date
-- avança, o próximo ciclo gera uma factura nova. Sem certificação AT/SAF-T —
-- só garante uma série sequencial, sem falhas e imutável (mesmo espírito de
-- quotation_invoices, ver supabase-quotation-invoices.sql).

-- Contador por ano civil — uma linha por ano, incrementada atomicamente.
CREATE TABLE IF NOT EXISTS renewal_invoice_counters (
  year INTEGER PRIMARY KEY,
  last_sequence INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS renewal_invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  service_type TEXT NOT NULL CHECK (service_type IN ('domain', 'hosting')),
  service_id UUID NOT NULL,
  user_id UUID,
  expiration_date DATE NOT NULL,
  invoice_number TEXT NOT NULL UNIQUE,
  series_year INTEGER NOT NULL,
  sequence_number INTEGER NOT NULL,
  issued_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE (service_type, service_id, expiration_date)
);

CREATE INDEX IF NOT EXISTS idx_renewal_invoices_user_id ON renewal_invoices(user_id);

ALTER TABLE renewal_invoice_counters ENABLE ROW LEVEL SECURITY;
ALTER TABLE renewal_invoices ENABLE ROW LEVEL SECURITY;

-- Só o servidor (service role) lê/escreve o contador — nunca exposto ao browser.
CREATE POLICY renewal_invoice_counters_admin ON renewal_invoice_counters
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE user_id = auth.uid() AND role = 'admin')
  );

CREATE POLICY renewal_invoices_own ON renewal_invoices
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY renewal_invoices_admin ON renewal_invoices
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE user_id = auth.uid() AND role = 'admin')
  );

-- Escrita feita apenas pelo servidor (service role, cron de renovações) via
-- esta função, nunca directamente pelo browser.

-- Idempotente: se já existir factura para este (service_type, service_id,
-- expiration_date), devolve o número existente em vez de criar outro.
-- Incremento atómico do contador do ano corrente (o UPDATE bloqueia a linha
-- normalmente até ao commit, o que já serializa chamadas concorrentes).
CREATE OR REPLACE FUNCTION assign_renewal_invoice_number(
  p_service_type TEXT,
  p_service_id UUID,
  p_user_id UUID,
  p_expiration_date DATE
)
RETURNS TABLE (invoice_number TEXT, issued_at TIMESTAMP WITH TIME ZONE)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_existing_number TEXT;
  v_existing_issued_at TIMESTAMPTZ;
  v_year INTEGER := EXTRACT(YEAR FROM now())::INTEGER;
  v_month TEXT := LPAD(EXTRACT(MONTH FROM now())::TEXT, 2, '0');
  v_seq INTEGER;
  v_number TEXT;
BEGIN
  SELECT ri.invoice_number, ri.issued_at INTO v_existing_number, v_existing_issued_at
  FROM renewal_invoices ri
  WHERE ri.service_type = p_service_type
    AND ri.service_id = p_service_id
    AND ri.expiration_date = p_expiration_date;

  IF v_existing_number IS NOT NULL THEN
    RETURN QUERY SELECT v_existing_number, v_existing_issued_at;
    RETURN;
  END IF;

  INSERT INTO renewal_invoice_counters (year, last_sequence)
  VALUES (v_year, 0)
  ON CONFLICT (year) DO NOTHING;

  UPDATE renewal_invoice_counters
  SET last_sequence = last_sequence + 1
  WHERE year = v_year
  RETURNING last_sequence INTO v_seq;

  v_number := 'FR' || v_month || v_year || '/' || LPAD(v_seq::TEXT, 4, '0');

  INSERT INTO renewal_invoices (service_type, service_id, user_id, expiration_date, invoice_number, series_year, sequence_number)
  VALUES (p_service_type, p_service_id, p_user_id, p_expiration_date, v_number, v_year, v_seq);

  RETURN QUERY SELECT v_number, now();
END;
$$;
