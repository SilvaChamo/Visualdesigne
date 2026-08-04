-- Update Email Marketing Schema to match Baseagrodata advanced features

-- 1. Update email_campaigns for baseagrodata features
ALTER TABLE email_campaigns ADD COLUMN IF NOT EXISTS target_audiences JSONB DEFAULT '[]'::jsonb;
ALTER TABLE email_campaigns ADD COLUMN IF NOT EXISTS sender_email TEXT;
ALTER TABLE email_campaigns ADD COLUMN IF NOT EXISTS attachments TEXT[] DEFAULT '{}'::text[];

-- 2. Create messages table (for internal logging and notification reference)
CREATE TABLE IF NOT EXISTS messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    subject TEXT NOT NULL,
    content TEXT NOT NULL,
    sender_email TEXT,
    target_roles TEXT[],
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Tabela "notifications" — NÃO recriar aqui.
-- A definição oficial (a que a aplicação usa de facto) está em supabase-notifications.sql.
-- Este ficheiro tinha uma versão antiga e incompatível (sem title/message/category),
-- removida em 2026-08-03 para evitar confusão/risco em setups novos.

-- Enable RLS for new tables
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

-- Admin Policies for messages
CREATE POLICY "Admins can manage messages" ON messages
    FOR ALL USING (auth.jwt() ->> 'email' IN ('admin@visualdesignmoz.com', 'geral@visualdesignmoz.com', 'silva.chamo@gmail.com', 'silva.chamo@visualdesignmoz.com'));
