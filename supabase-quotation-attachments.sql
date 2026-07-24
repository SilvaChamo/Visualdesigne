-- Anexos (ficheiros) trocados entre cliente e equipa, por encomenda
-- (quotation_requests). Alimentado por GET/POST /api/cotacoes/[id]/anexos.
-- Ficheiros guardados no bucket de Storage 'quotation-attachments'
-- (ver src/lib/quotation-attachments-bucket.ts).
CREATE TABLE IF NOT EXISTS quotation_attachments (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  quotation_id UUID NOT NULL REFERENCES quotation_requests(id) ON DELETE CASCADE,
  uploaded_by_role VARCHAR(10) NOT NULL CHECK (uploaded_by_role IN ('client', 'admin')),
  file_name VARCHAR(255) NOT NULL,
  file_url TEXT NOT NULL,
  file_size_bytes INTEGER,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_quotation_attachments_quotation_id
  ON quotation_attachments(quotation_id);

ALTER TABLE quotation_attachments ENABLE ROW LEVEL SECURITY;

CREATE POLICY quotation_attachments_own ON quotation_attachments
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM quotation_requests qr
      WHERE qr.id = quotation_id AND qr.user_id = auth.uid()
    )
  );

CREATE POLICY quotation_attachments_admin ON quotation_attachments
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- Escrita feita apenas pelo servidor (service role), nunca directamente pelo browser.
