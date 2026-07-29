-- Execute no SQL Editor do Supabase (https://supabase.visualdesignmoz.com -> SQL Editor)
--
-- O envio real de campanhas (src/app/api/mailmarketing-send/route.ts) grava um pedido
-- na tabela email_campaigns com colunas que faltavam (content_html, status,
-- target_audiences, total_recipients, successful_sends, failed_sends) — a tabela só
-- tinha as colunas usadas pelo "histórico" (src/app/actions/mailmarketing.ts).
-- Por isso enviar uma campanha falhava sempre com:
--   "Could not find the 'content_html' column of 'email_campaigns' in the schema cache"
--
-- Este script só ADICIONA colunas (ADD COLUMN IF NOT EXISTS) — não apaga nem altera
-- nada existente.

ALTER TABLE email_campaigns
  ADD COLUMN IF NOT EXISTS content_html TEXT,
  ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'draft',
  ADD COLUMN IF NOT EXISTS target_audiences JSONB DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS total_recipients INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS successful_sends INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS failed_sends INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS sent_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_email_campaigns_status ON email_campaigns (status);

NOTIFY pgrst, 'reload schema';
