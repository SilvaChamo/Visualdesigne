-- Anexos directamente numa mensagem do chat da encomenda (quotation_messages)
-- — para Layouts e Anexos deixarem de ser abas separadas e passarem a viver
-- na mesma conversa. Uma mensagem pode ter só texto, só ficheiro, ou ambos
-- (texto = legenda do ficheiro).
ALTER TABLE quotation_messages
  ADD COLUMN IF NOT EXISTS attachment_url TEXT,
  ADD COLUMN IF NOT EXISTS attachment_name VARCHAR(255),
  ADD COLUMN IF NOT EXISTS attachment_type VARCHAR(20); -- 'image' | 'pdf'

-- Mensagem passa a poder ir vazia quando só tem anexo (antes era sempre obrigatória).
ALTER TABLE quotation_messages
  ALTER COLUMN message DROP NOT NULL;
