-- Marca permanente de que um item nasceu "Sob Consulta" — ao contrário de
-- sob_consulta, que passa a false assim que a equipa define o valor final
-- (ver PATCH /api/admin/cotacoes), esta coluna nunca muda depois de criada.
-- É o que permite ao painel admin continuar a mostrar o lápis de reeditar o
-- valor mesmo depois de precificado: a equipa só pode reeditar preços de
-- itens que nasceram "Sob Consulta" (negociados caso a caso), nunca o preço
-- de um item de catálogo com valor fixo — ela não tem esse direito.
ALTER TABLE quotation_requests ADD COLUMN IF NOT EXISTS sob_consulta_original BOOLEAN NOT NULL DEFAULT FALSE;

-- Backfill: itens ainda por precificar (sob_consulta = true) são, por
-- definição, "Sob Consulta" desde a origem.
UPDATE quotation_requests SET sob_consulta_original = TRUE WHERE sob_consulta = TRUE AND sob_consulta_original = FALSE;
