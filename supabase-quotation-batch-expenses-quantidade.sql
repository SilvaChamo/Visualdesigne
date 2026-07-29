-- Despesas de produção passam a ter quantidade — valor_mt passa a ser o
-- valor UNITÁRIO (ex.: preço de uma resma de papel), multiplicado pela
-- quantidade para dar o valor total dessa linha. Linhas já existentes
-- assumem quantidade 1 (o valor_mt já gravado continua a ser o total nesse
-- caso, sem precisar de correcção).
ALTER TABLE quotation_batch_expenses
  ADD COLUMN IF NOT EXISTS quantidade NUMERIC(10,2) NOT NULL DEFAULT 1;
