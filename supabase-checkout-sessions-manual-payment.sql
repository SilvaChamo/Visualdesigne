-- Execute no SQL Editor do Supabase (https://supabase.visualdesignmoz.com -> SQL Editor)
--
-- Adiciona M-Pesa/Transferência Bancária como métodos de pagamento no checkout
-- do carrinho (compras novas de domínio/hospedagem/email) — até agora só
-- existia Cartão via Stripe. Mesmo modelo já usado em renewal_payment_requests:
-- método manual fica 'pending' até anexar comprovativo e a equipa confirmar;
-- 'stripe' continua automático via webhook.

BEGIN;

ALTER TABLE checkout_sessions
  ADD COLUMN IF NOT EXISTS metodo_pagamento TEXT NOT NULL DEFAULT 'stripe',
  ADD COLUMN IF NOT EXISTS comprovativo_url TEXT,
  ADD COLUMN IF NOT EXISTS rejection_reason TEXT;

COMMIT;
