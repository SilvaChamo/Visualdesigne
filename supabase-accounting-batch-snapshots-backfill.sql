-- Backfill/re-sync de accounting_batch_snapshots — apanha qualquer encomenda já
-- 'done' que ainda não tenha snapshot gravado. Seguro para correr sempre que
-- precisares (idempotente, ON CONFLICT (batch_id) DO NOTHING) — útil sobretudo
-- enquanto o código novo (saveAccountingSnapshot em /api/admin/cotacoes) ainda
-- não estiver publicado em produção: encomendas marcadas "Entregue" pelo
-- código antigo (já em produção) não geram snapshot sozinhas, por isso a
-- Contabilidade não as mostra até correr isto.

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
    MAX(COALESCE(qr.delivered_at, ida.done_at, qr.updated_at, qr.created_at)) AS done_at
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
),
batch_advance_invoice AS (
  SELECT batch_id, invoice_number FROM quotation_invoices WHERE phase = 'advance'
),
batch_remainder_invoice AS (
  SELECT batch_id, invoice_number FROM quotation_invoices WHERE phase = 'remainder'
)
INSERT INTO accounting_batch_snapshots (
  batch_id, primary_item_id, numero, advance_invoice_number, remainder_invoice_number, empresa, nif, resumo,
  receita_mt, custos_producao_mt, iva_percent, iva_mt, lucro_mt, done_at
)
SELECT
  bt.batch_id,
  bt.primary_item_id,
  UPPER(SPLIT_PART(bt.batch_id::text, '-', 1)) AS numero,
  bai.invoice_number,
  bri.invoice_number,
  bt.empresa,
  bt.nif,
  CASE WHEN bt.item_count = 1 THEN bt.first_categoria_label || ' — ' || bt.first_produto ELSE bt.item_count || ' serviços' END AS resumo,
  bt.receita_mt,
  COALESCE(be.custos_producao_mt, 0),
  16 AS iva_percent,
  (bt.receita_mt - COALESCE(be.custos_producao_mt, 0)) * 16 / 100 AS iva_mt,
  bt.receita_mt - COALESCE(be.custos_producao_mt, 0) - ((bt.receita_mt - COALESCE(be.custos_producao_mt, 0)) * 16 / 100) AS lucro_mt,
  bda.done_at
FROM batch_totals bt
JOIN batch_done_at bda ON bda.batch_id = bt.batch_id
LEFT JOIN batch_expenses be ON be.batch_id = bt.batch_id
LEFT JOIN batch_advance_invoice bai ON bai.batch_id = bt.batch_id
LEFT JOIN batch_remainder_invoice bri ON bri.batch_id = bt.batch_id
ON CONFLICT (batch_id) DO NOTHING;
