-- Marca um registo de contabilidade como "eliminado" sem o apagar de facto —
-- a encomenda de origem (quotation_requests) já pode ter sido eliminada pelo
-- cliente ou pela equipa nessa altura (ver DELETE /api/cotacoes/[id] e
-- DELETE /api/admin/cotacoes), mas o documento fiscal/histórico financeiro
-- tem de continuar a existir. Uma encomenda eliminada sai do Balanço mensal
-- (WHERE deleted_at IS NULL) e passa a aparecer só na aba "Eliminadas" da
-- Contabilidade. Preenchido automaticamente nas rotas DELETE acima, e também
-- manualmente pela equipa (botão de eliminar em cada linha do Balanço) para
-- regularizar registos antigos cuja encomenda de origem já não existe.
ALTER TABLE accounting_batch_snapshots ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP WITH TIME ZONE;
