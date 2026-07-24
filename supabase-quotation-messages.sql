-- Mensagens (chat) entre cliente e equipa VisualDesign, por encomenda
-- (quotation_requests). Alimentado por GET/POST /api/cotacoes/[id]/mensagens.
CREATE TABLE IF NOT EXISTS quotation_messages (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  quotation_id UUID NOT NULL REFERENCES quotation_requests(id) ON DELETE CASCADE,
  sender_role VARCHAR(10) NOT NULL CHECK (sender_role IN ('client', 'admin')),
  sender_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  message TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_quotation_messages_quotation_id
  ON quotation_messages(quotation_id);

ALTER TABLE quotation_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY quotation_messages_own ON quotation_messages
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM quotation_requests qr
      WHERE qr.id = quotation_id AND qr.user_id = auth.uid()
    )
  );

CREATE POLICY quotation_messages_admin ON quotation_messages
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- Escrita feita apenas pelo servidor (service role), nunca directamente pelo browser.
