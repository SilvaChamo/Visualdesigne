-- Histórico de mudanças de estado de uma encomenda (quotation_requests).
-- Cada linha regista quem mudou o estado e porquê. Alimentado por:
--   - PATCH /api/admin/cotacoes (changed_by='admin')
--   - POST /api/cotacoes/[id]/cancelar (changed_by='client')
CREATE TABLE IF NOT EXISTS quotation_status_history (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  quotation_id UUID NOT NULL REFERENCES quotation_requests(id) ON DELETE CASCADE,
  status VARCHAR(20) NOT NULL,
  note TEXT,
  changed_by VARCHAR(10) NOT NULL CHECK (changed_by IN ('client', 'admin', 'system')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_quotation_status_history_quotation_id
  ON quotation_status_history(quotation_id);

ALTER TABLE quotation_status_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY quotation_status_history_own ON quotation_status_history
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM quotation_requests qr
      WHERE qr.id = quotation_id AND qr.user_id = auth.uid()
    )
  );

CREATE POLICY quotation_status_history_admin ON quotation_status_history
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- Escrita feita apenas pelo servidor (service role), nunca directamente pelo browser.
