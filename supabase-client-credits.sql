-- ============================================
-- SALDO DE CRÉDITO DO CLIENTE
-- ============================================
-- Espelha o padrão já usado em reseller_credits, mas para clientes normais
-- (não revendedores). Guarda o saldo actual por cliente + um histórico de
-- movimentos (para se poder explicar de onde veio cada valor). Nada aqui
-- concede crédito automaticamente — isso é decidido caso a caso (reembolso
-- convertido em crédito, ajuste manual, etc.) através da tabela de
-- movimentos; o saldo em client_credits é sempre a soma desses movimentos.

CREATE TABLE IF NOT EXISTS client_credits (
    user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    saldo_mt NUMERIC(12,2) NOT NULL DEFAULT 0,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS client_credit_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    valor_mt NUMERIC(12,2) NOT NULL, -- positivo = crédito concedido, negativo = usado/deduzido
    motivo TEXT NOT NULL,
    created_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_client_credit_transactions_user ON client_credit_transactions(user_id);

-- Mantém client_credits.saldo_mt sempre igual à soma dos movimentos.
CREATE OR REPLACE FUNCTION apply_client_credit_transaction()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO client_credits (user_id, saldo_mt, updated_at)
    VALUES (NEW.user_id, NEW.valor_mt, NOW())
    ON CONFLICT (user_id) DO UPDATE
    SET saldo_mt = client_credits.saldo_mt + NEW.valor_mt,
        updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trigger_apply_client_credit_transaction ON client_credit_transactions;
CREATE TRIGGER trigger_apply_client_credit_transaction
    AFTER INSERT ON client_credit_transactions
    FOR EACH ROW EXECUTE FUNCTION apply_client_credit_transaction();

ALTER TABLE client_credits ENABLE ROW LEVEL SECURITY;
ALTER TABLE client_credit_transactions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own credit balance" ON client_credits;
CREATE POLICY "Users can view their own credit balance"
    ON client_credits FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can view their own credit history" ON client_credit_transactions;
CREATE POLICY "Users can view their own credit history"
    ON client_credit_transactions FOR SELECT USING (auth.uid() = user_id);

COMMENT ON TABLE client_credits IS 'Saldo de crédito actual de cada cliente (soma de client_credit_transactions)';
COMMENT ON TABLE client_credit_transactions IS 'Histórico de créditos concedidos/usados por cliente, com motivo';
