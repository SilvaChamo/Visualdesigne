-- Backfill de accounting_batch_snapshots — corre isto UMA VEZ, depois de criar a
-- tabela (supabase-accounting-batch-snapshots.sql) e antes/depois de publicar a
-- versão optimizada de GET /api/admin/contabilidade.
--
-- Contexto: a Contabilidade passou a somar a receita mensal directamente de
-- accounting_batch_snapshots em vez de recalcular a cada carregamento a partir de
-- quotation_requests + quotation_status_history (tabelas que crescem com TODAS as
-- encomendas, de sempre, e tornavam o carregamento lento). O snapshot só é gravado
-- automaticamente daqui para a frente, no momento em que uma encomenda passa a
-- 'done' (ver saveAccountingSnapshot em /api/admin/cotacoes). Encomendas que já
-- estavam 'done' ANTES desta alteração não têm snapshot nenhum — sem este
-- backfill, a receita de todos os meses anteriores desaparecia da Contabilidade.
--
-- Idempotente: usa ON CONFLICT (batch_id) DO NOTHING, seguro para correr mais do
-- que uma vez (não duplica nem sobrescreve snapshots já existentes).

WITH batch_status AS (
  SELECT
    batch_id,
    COUNT(*) FILTER (WHERE status <> 'cancelled') AS active_count,
    COUNT(*) FILTER (WHERE status = 'done') AS done_count
  FROM quotation_requests
  GROUP BY batch_id
),
done_batches AS (
  SELECT batch_id FROM batch_status WHERE active_count > 0 AND active_count = done_count
),
batch_totals AS (
  SELECT
    qr.batch_id,
    (ARRAY_AGG(qr.id ORDER BY qr.id))[1] AS primary_item_id,
    (ARRAY_AGG(qr.empresa ORDER BY qr.id))[1] AS empresa,
    (ARRAY_AGG(qr.nif ORDER BY qr.id))[1] AS nif,
    (ARRAY_AGG(qr.categoria_label ORDER BY qr.id))[1] AS first_categoria_label,
    (ARRAY_AGG(qr.produto ORDER BY qr.id))[1] AS first_produto,
    COUNT(*) AS item_count,
    SUM(CASE WHEN qr.sob_consulta THEN 0 ELSE qr.total_mt END) AS receita_mt
  FROM quotation_requests qr
  WHERE qr.batch_id IN (SELECT batch_id FROM done_batches)
  GROUP BY qr.batch_id
),
item_done_at AS (
  SELECT quotation_id, MAX(created_at) AS done_at
  FROM quotation_status_history
  WHERE status = 'done'
  GROUP BY quotation_id
),
batch_done_at AS (
  SELECT
    qr.batch_id,
    MAX(COALESCE(ida.done_at, qr.updated_at, qr.created_at)) AS done_at
  FROM quotation_requests qr
  LEFT JOIN item_done_at ida ON ida.quotation_id = qr.id
  WHERE qr.batch_id IN (SELECT batch_id FROM done_batches)
  GROUP BY qr.batch_id
),
batch_expenses AS (
  SELECT batch_id, COALESCE(SUM(valor_mt), 0) AS custos_producao_mt
  FROM quotation_batch_expenses
  WHERE batch_id IN (SELECT batch_id FROM done_batches)
  GROUP BY batch_id
)
INSERT INTO accounting_batch_snapshots (
  batch_id, primary_item_id, numero, invoice_number, empresa, nif, resumo,
  receita_mt, custos_producao_mt, iva_percent, iva_mt, lucro_mt, done_at
)
SELECT
  bt.batch_id,
  bt.primary_item_id,
  UPPER(SPLIT_PART(bt.batch_id::text, '-', 1)) AS numero,
  qi.invoice_number,
  bt.empresa,
  bt.nif,
  CASE WHEN bt.item_count = 1 THEN bt.first_categoria_label || ' — ' || bt.first_produto ELSE bt.item_count || ' serviços' END AS resumo,
  bt.receita_mt,
  COALESCE(be.custos_producao_mt, 0),
  COALESCE(ma.iva_percent, 16) AS iva_percent,
  bt.receita_mt * COALESCE(ma.iva_percent, 16) / 100 AS iva_mt,
  bt.receita_mt - COALESCE(be.custos_producao_mt, 0) - (bt.receita_mt * COALESCE(ma.iva_percent, 16) / 100) AS lucro_mt,
  bda.done_at
FROM batch_totals bt
JOIN batch_done_at bda ON bda.batch_id = bt.batch_id
LEFT JOIN quotation_invoices qi ON qi.batch_id = bt.batch_id
LEFT JOIN batch_expenses be ON be.batch_id = bt.batch_id
LEFT JOIN monthly_accounting ma
  ON ma.month = date_trunc('month', bda.done_at AT TIME ZONE 'UTC')::date
ON CONFLICT (batch_id) DO NOTHING;
