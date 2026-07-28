-- Timestamp exacto em que o item passou a 'done' (Entregue) — usado para a
-- regra "fica visível em Entregues durante 7 dias, depois só no Histórico da
-- equipa". Não usar updated_at para isto: é tocado por outras acções (ex.:
-- alterar o prazo de entrega em lote) e não reflecte apenas a entrega.
-- Preenchido por PATCH /api/admin/cotacoes, só quando status passa a 'done'.
ALTER TABLE quotation_requests ADD COLUMN IF NOT EXISTS delivered_at TIMESTAMP WITH TIME ZONE;
