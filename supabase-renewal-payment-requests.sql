-- Execute no SQL Editor do Supabase (https://supabase.visualdesignmoz.com -> SQL Editor)
--
-- Activa o botão "Pagar Factura" nas renovações de domínio/hospedagem —
-- mesmo modelo do carregamento de saldo do revendedor: M-Pesa/Transferência
-- manuais com comprovativo, ou Cartão automático via Stripe. Ao confirmar,
-- a data de expiração do domínio/hospedagem avança automaticamente 1 ano.

BEGIN;

CREATE TABLE IF NOT EXISTS renewal_payment_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    renewal_type TEXT NOT NULL CHECK (renewal_type IN ('domain', 'hosting')),
    renewal_id UUID NOT NULL,
    service_name TEXT NOT NULL,
    valor_mt NUMERIC(12,2) NOT NULL,
    metodo_pagamento TEXT NOT NULL, -- 'mpesa' | 'transferencia' | 'stripe'
    status TEXT NOT NULL DEFAULT 'pending', -- 'pending' | 'confirmed' | 'rejected'
    comprovativo_url TEXT,
    rejection_reason TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    confirmed_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_renewal_payment_requests_user_id ON renewal_payment_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_renewal_payment_requests_status ON renewal_payment_requests(status);
CREATE INDEX IF NOT EXISTS idx_renewal_payment_requests_renewal ON renewal_payment_requests(renewal_type, renewal_id);

ALTER TABLE renewal_payment_requests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Service role manages renewal payment requests" ON renewal_payment_requests;
CREATE POLICY "Service role manages renewal payment requests" ON renewal_payment_requests
    FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');

COMMIT;
