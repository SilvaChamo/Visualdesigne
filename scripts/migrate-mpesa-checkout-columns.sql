-- Colunas para a integração automática M-Pesa Sandbox (C2B Single Stage) no
-- checkout do carrinho. Aditivo — não afecta nenhuma sessão de checkout
-- existente (Stripe ou M-Pesa manual continuam a funcionar exactamente como
-- antes).
ALTER TABLE checkout_sessions
  ADD COLUMN IF NOT EXISTS mpesa_third_party_reference TEXT,
  ADD COLUMN IF NOT EXISTS mpesa_transaction_id TEXT,
  ADD COLUMN IF NOT EXISTS mpesa_conversation_id TEXT,
  ADD COLUMN IF NOT EXISTS mpesa_last_response TEXT;

CREATE INDEX IF NOT EXISTS idx_checkout_sessions_mpesa_reference ON checkout_sessions(mpesa_third_party_reference);
