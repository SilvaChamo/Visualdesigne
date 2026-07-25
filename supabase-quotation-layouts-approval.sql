-- Aprovação de layouts pelo cliente, por fase (quotation_layouts).
-- 'pending' até o cliente decidir; 'approved' avança a produção; 'rejected'
-- exige client_feedback (o que corrigir) para a equipa enviar nova fase.
ALTER TABLE quotation_layouts
  ADD COLUMN IF NOT EXISTS status VARCHAR(20) NOT NULL DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS client_feedback TEXT,
  ADD COLUMN IF NOT EXISTS reviewed_at TIMESTAMP WITH TIME ZONE;
