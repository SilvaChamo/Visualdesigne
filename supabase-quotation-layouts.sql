-- Layouts de design enviados pela equipa ao cliente, por encomenda
-- (quotation_requests). Cada envio fica associado a uma fase numerada
-- automaticamente (1, 2, 3...), com uma descrição escrita pela equipa
-- (ex: "Rascunho inicial", "Revisão de cores"). Só a equipa envia — o
-- cliente só vê e descarrega. Alimentado por GET/POST /api/cotacoes/[id]/layouts.
-- Ficheiros guardados no bucket de Storage 'quotation-layouts'
-- (ver src/lib/quotation-layouts-bucket.ts).
CREATE TABLE IF NOT EXISTS quotation_layouts (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  quotation_id UUID NOT NULL REFERENCES quotation_requests(id) ON DELETE CASCADE,
  fase INTEGER NOT NULL,
  descricao VARCHAR(255) NOT NULL,
  file_name VARCHAR(255) NOT NULL,
  file_url TEXT NOT NULL,
  file_size_bytes INTEGER,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_quotation_layouts_quotation_id
  ON quotation_layouts(quotation_id);

ALTER TABLE quotation_layouts ENABLE ROW LEVEL SECURITY;

CREATE POLICY quotation_layouts_own ON quotation_layouts
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM quotation_requests qr
      WHERE qr.id = quotation_id AND qr.user_id = auth.uid()
    )
  );

CREATE POLICY quotation_layouts_admin ON quotation_layouts
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE user_id = auth.uid() AND role = 'admin')
  );

-- Escrita feita apenas pelo servidor (service role), nunca directamente pelo browser.
