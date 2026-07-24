-- Agrupa as linhas de quotation_requests submetidas juntas (mesma cotação
-- do cliente) numa "encomenda" só. Cada linha continua a ser um serviço
-- individual (com o seu próprio preço/estado), mas partilha o mesmo
-- batch_id com as restantes linhas da mesma submissão — usado para mostrar
-- a fatura consolidada, agregar o estado da encomenda e não perder
-- mensagens/anexos/histórico presos a uma linha "errada" dentro do grupo.
ALTER TABLE quotation_requests ADD COLUMN IF NOT EXISTS batch_id UUID;

-- Backfill: linhas da mesma submissão partilham o mesmo user_id + created_at
-- exacto (inseridas numa única instrução INSERT, todas com o mesmo
-- timestamp de transacção). Atribui um batch_id novo por grupo.
WITH groups AS (
  SELECT DISTINCT user_id, created_at, uuid_generate_v4() AS new_batch_id
  FROM quotation_requests
  WHERE batch_id IS NULL
)
UPDATE quotation_requests qr
SET batch_id = g.new_batch_id
FROM groups g
WHERE qr.user_id = g.user_id
  AND qr.created_at = g.created_at
  AND qr.batch_id IS NULL;

ALTER TABLE quotation_requests ALTER COLUMN batch_id SET NOT NULL;

CREATE INDEX IF NOT EXISTS idx_quotation_requests_batch_id
  ON quotation_requests(batch_id);
