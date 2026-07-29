-- Execute no SQL Editor do Supabase (https://supabase.visualdesignmoz.com -> SQL Editor)
--
-- Até agora, uma "lista" do Mailmarketing só existia enquanto pelo menos um
-- email estivesse marcado com esse nome em newsletter_subscribers.metadata.lists.
-- Isso significava que criar uma lista nova (botão "Criar nova lista") só
-- ficava guardado na memória do browser — ao recarregar a página, ou numa
-- sessão nova, a lista desaparecia se ainda não tivesse nenhum email lá dentro.
--
-- Esta tabela torna a lista um registo persistente e independente dos emails
-- que lá estão (não precisa de "contactos" para existir, só do nome + domínio).

BEGIN;

CREATE TABLE IF NOT EXISTS mailmarketing_lists (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    domain TEXT NOT NULL,
    name TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_mailmarketing_lists_domain_name
  ON mailmarketing_lists (domain, name);

ALTER TABLE mailmarketing_lists ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can manage mailmarketing lists" ON mailmarketing_lists;
CREATE POLICY "Admins can manage mailmarketing lists" ON mailmarketing_lists
    FOR ALL USING (
        auth.jwt() ->> 'email' IN ('admin@visualdesignmoz.com', 'geral@visualdesignmoz.com', 'silva.chamo@gmail.com', 'silva.chamo@visualdesignmoz.com')
        OR auth.jwt() ->> 'role' = 'service_role'
    );

COMMIT;
