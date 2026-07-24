-- Suporte a cancelamento de encomendas pelo próprio cliente (quotation_requests).
-- 'cancelled' já existe como valor de status usado pela app; falta o campo
-- para guardar o motivo indicado pelo cliente ao cancelar.
ALTER TABLE quotation_requests
  ADD COLUMN IF NOT EXISTS cancellation_reason TEXT;
