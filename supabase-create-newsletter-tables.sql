-- Execute no SQL Editor do Supabase (https://supabase.visualdesignmoz.com -> SQL Editor)
--
-- As tabelas newsletter_subscribers e email_campaigns nunca chegaram a ser criadas
-- em produção (o ficheiro supabase-email-marketing.sql existia no repo mas nunca foi
-- executado). É por isso que "Adicionar Contacto" no E-mail Marketing falhava sempre
-- com o erro "Could not find the table 'public.newsletter_subscribers' in the schema
-- cache" — e a listagem aparecia sempre vazia porque o código engole esse erro em
-- silêncio (adminListarSubscritores devolve [] em caso de erro).
--
-- Este script cria só as colunas que o código actualmente usa (src/app/actions/mailmarketing.ts).

BEGIN;

CREATE TABLE IF NOT EXISTS newsletter_subscribers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email TEXT NOT NULL,
    full_name TEXT,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Único por (email, painel, domínio) — permite o mesmo email em domínios diferentes,
-- como o código já pressupõe ("pode existir noutros domínios, mas isso é permitido").
CREATE UNIQUE INDEX IF NOT EXISTS idx_subscribers_email_unique_by_scope
  ON newsletter_subscribers (lower(email), (metadata->>'panel'), (metadata->>'domain'));

CREATE INDEX IF NOT EXISTS idx_subscribers_panel
  ON newsletter_subscribers ((metadata->>'panel'));

ALTER TABLE newsletter_subscribers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can manage subscribers" ON newsletter_subscribers;
CREATE POLICY "Admins can manage subscribers" ON newsletter_subscribers
    FOR ALL USING (
        auth.jwt() ->> 'email' IN ('admin@visualdesignmoz.com', 'geral@visualdesignmoz.com', 'silva.chamo@gmail.com', 'silva.chamo@visualdesignmoz.com')
        OR auth.jwt() ->> 'role' = 'service_role'
    );

CREATE TABLE IF NOT EXISTS email_campaigns (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    subject TEXT NOT NULL,
    content TEXT,
    sender_email TEXT,
    recipient_count INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_email_campaigns_sender ON email_campaigns (sender_email);

ALTER TABLE email_campaigns ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can manage campaigns" ON email_campaigns;
CREATE POLICY "Admins can manage campaigns" ON email_campaigns
    FOR ALL USING (
        auth.jwt() ->> 'email' IN ('admin@visualdesignmoz.com', 'geral@visualdesignmoz.com', 'silva.chamo@gmail.com', 'silva.chamo@visualdesignmoz.com')
        OR auth.jwt() ->> 'role' = 'service_role'
    );

COMMIT;

NOTIFY pgrst, 'reload schema';
