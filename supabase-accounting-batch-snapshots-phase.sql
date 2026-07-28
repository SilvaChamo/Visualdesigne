-- Agora há duas facturas por encomenda (adiantamento + remanescente, ver
-- supabase-quotation-invoices-phase.sql) — o registo de contabilidade passa
-- a guardar os dois números em vez de um só `invoice_number`.
ALTER TABLE accounting_batch_snapshots
  ADD COLUMN IF NOT EXISTS advance_invoice_number TEXT,
  ADD COLUMN IF NOT EXISTS remainder_invoice_number TEXT;

UPDATE accounting_batch_snapshots
  SET advance_invoice_number = invoice_number
  WHERE invoice_number IS NOT NULL AND advance_invoice_number IS NULL;

ALTER TABLE accounting_batch_snapshots
  DROP COLUMN IF EXISTS invoice_number;
