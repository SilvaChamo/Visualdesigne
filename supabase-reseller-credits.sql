-- Execute no SQL Editor do Supabase (https://supabase.visualdesignmoz.com -> SQL Editor)
--
-- Activa o "Adicionar Fundos" no dashboard do revendedor: saldo persistente
-- + pedidos de carregamento por M-Pesa/Transferência, confirmados manualmente
-- pela equipa (mesmo modelo já usado no pagamento das encomendas — não há
-- nenhuma cobrança automática online neste site).

BEGIN;

CREATE TABLE IF NOT EXISTS reseller_credits (
    da_username TEXT PRIMARY KEY,
    saldo_mt NUMERIC(12,2) NOT NULL DEFAULT 0,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS reseller_credit_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    da_username TEXT NOT NULL,
    email TEXT,
    valor_mt NUMERIC(12,2) NOT NULL,
    metodo_pagamento TEXT NOT NULL, -- 'mpesa' | 'transferencia'
    status TEXT NOT NULL DEFAULT 'pending', -- 'pending' | 'confirmed' | 'rejected'
    comprovativo_url TEXT,
    rejection_reason TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    confirmed_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_reseller_credit_requests_da_username
  ON reseller_credit_requests (da_username);
CREATE INDEX IF NOT EXISTS idx_reseller_credit_requests_status
  ON reseller_credit_requests (status);

ALTER TABLE reseller_credits ENABLE ROW LEVEL SECURITY;
ALTER TABLE reseller_credit_requests ENABLE ROW LEVEL SECURITY;

-- Toda a leitura/escrita passa pelas rotas da app (service role) — estas
-- políticas só servem de rede de segurança caso algo tente aceder directo.
DROP POLICY IF EXISTS "Service role manages reseller credits" ON reseller_credits;
CREATE POLICY "Service role manages reseller credits" ON reseller_credits
    FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');

DROP POLICY IF EXISTS "Service role manages reseller credit requests" ON reseller_credit_requests;
CREATE POLICY "Service role manages reseller credit requests" ON reseller_credit_requests
    FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');

COMMIT;
