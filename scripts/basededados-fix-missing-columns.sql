-- Corrige colunas em falta no schema basededados (Supabase self-hosted, Hetzner).
-- O schema foi reconstruído "por arqueologia de código" em 2026-08-09 (o
-- Supabase Cloud original do basededadosagro.com estava crido como apagado —
-- afinal só estava pausado, reactivado pelo utilizador em 2026-08-10). Ao
-- copiar os dados reais de volta, várias tabelas revelaram-se incompletas
-- face à estrutura real. Aditivo e idempotente (IF NOT EXISTS em tudo).
--
-- Também remove as 4+4 linhas de exemplo em forum_categories/services
-- (mesma timestamp exacta 2026-08-09T19:47:35, geradas pelo script de
-- reconstrução original) para os dados reais entrarem sem conflito de slug.

ALTER TABLE basededados.info_categories ADD COLUMN IF NOT EXISTS is_dark boolean DEFAULT false;

ALTER TABLE basededados.companies ADD COLUMN IF NOT EXISTS representative_name text;
ALTER TABLE basededados.companies ADD COLUMN IF NOT EXISTS website text;
ALTER TABLE basededados.companies ADD COLUMN IF NOT EXISTS secondary_contact text;
ALTER TABLE basededados.companies ADD COLUMN IF NOT EXISTS portfolio_url text;
ALTER TABLE basededados.companies ADD COLUMN IF NOT EXISTS sub_category text;
ALTER TABLE basededados.companies ADD COLUMN IF NOT EXISTS size text;
ALTER TABLE basededados.companies ADD COLUMN IF NOT EXISTS payment_method text;
ALTER TABLE basededados.companies ADD COLUMN IF NOT EXISTS is_public boolean DEFAULT true;
ALTER TABLE basededados.companies ADD COLUMN IF NOT EXISTS payment_phone text;
ALTER TABLE basededados.companies ADD COLUMN IF NOT EXISTS is_active boolean DEFAULT true;

ALTER TABLE basededados.professionals ADD COLUMN IF NOT EXISTS image_url text;

ALTER TABLE basededados.profiles ADD COLUMN IF NOT EXISTS role text DEFAULT 'user';
ALTER TABLE basededados.profiles ADD COLUMN IF NOT EXISTS plan text DEFAULT 'Visitante';
ALTER TABLE basededados.profiles ADD COLUMN IF NOT EXISTS avatar_url text;
ALTER TABLE basededados.profiles ADD COLUMN IF NOT EXISTS bio text;
ALTER TABLE basededados.profiles ADD COLUMN IF NOT EXISTS website text;
ALTER TABLE basededados.profiles ADD COLUMN IF NOT EXISTS sms_notifications boolean DEFAULT false;
ALTER TABLE basededados.profiles ADD COLUMN IF NOT EXISTS address text;
ALTER TABLE basededados.profiles ADD COLUMN IF NOT EXISTS facebook_url text;
ALTER TABLE basededados.profiles ADD COLUMN IF NOT EXISTS instagram_url text;
ALTER TABLE basededados.profiles ADD COLUMN IF NOT EXISTS linkedin_url text;
ALTER TABLE basededados.profiles ADD COLUMN IF NOT EXISTS website_url text;
ALTER TABLE basededados.profiles ADD COLUMN IF NOT EXISTS keywords text[];

ALTER TABLE basededados.products ADD COLUMN IF NOT EXISTS is_available boolean DEFAULT true;
ALTER TABLE basededados.products ADD COLUMN IF NOT EXISTS deleted_at timestamptz;

ALTER TABLE basededados.properties ADD COLUMN IF NOT EXISTS name text;

ALTER TABLE basededados.presentations ADD COLUMN IF NOT EXISTS slug text;

ALTER TABLE basededados.articles ADD COLUMN IF NOT EXISTS status text DEFAULT 'active';

ALTER TABLE basededados.trainings ADD COLUMN IF NOT EXISTS spots_filled integer DEFAULT 0;
ALTER TABLE basededados.trainings ADD COLUMN IF NOT EXISTS image_url text;

ALTER TABLE basededados.market_prices ADD COLUMN IF NOT EXISTS deleted_at timestamptz;

ALTER TABLE basededados.page_views ADD COLUMN IF NOT EXISTS viewer_id uuid;

-- integrations nunca teve chave primária no schema reconstruído.
ALTER TABLE basededados.integrations ADD COLUMN IF NOT EXISTS id uuid PRIMARY KEY DEFAULT gen_random_uuid();

-- Linhas de exemplo do rebuild original — substituídas pelos dados reais a seguir.
DELETE FROM basededados.forum_categories WHERE created_at = '2026-08-09T19:47:35.35289+00:00';
DELETE FROM basededados.services WHERE created_at = '2026-08-09T19:47:35.354547+00:00';

NOTIFY pgrst, 'reload schema';
