-- Método de pagamento escolhido pelo cliente para o remanescente (30%
-- restante, pago na entrega/levantamento) — distinto de metodo_pagamento,
-- que guarda o método do adiantamento (70% inicial). Preenchido por
-- POST /api/cotacoes/[id]/pagamento-remanescente, só quando o estado do
-- item é 'delivered' (Entregue — pronto para levantamento).
ALTER TABLE quotation_requests ADD COLUMN IF NOT EXISTS remanescente_metodo_pagamento VARCHAR(20);
