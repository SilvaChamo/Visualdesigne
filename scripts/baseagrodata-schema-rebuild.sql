-- ============================================================================
-- Reconstrução completa do schema do baseagrodata.com num schema Postgres
-- dedicado ("baseagrodata"), dentro do mesmo Supabase self-hosted do painel
-- VisualDesign — nunca no "public" (colisões reais confirmadas com profiles,
-- notifications, email_campaigns, newsletter_subscribers).
-- ============================================================================

CREATE SCHEMA IF NOT EXISTS baseagrodata;
GRANT USAGE ON SCHEMA baseagrodata TO anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA baseagrodata GRANT ALL ON TABLES TO anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA baseagrodata GRANT ALL ON SEQUENCES TO anon, authenticated, service_role;

SET search_path TO baseagrodata, public;

-- ============================================================================
-- 1) Tabelas com estrutura exacta (recuperadas de lib/database.types.ts,
--    gerado automaticamente pelo Supabase antes de o projecto ser apagado)
-- ============================================================================

CREATE TABLE IF NOT EXISTS agricultural_stats (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    category text NOT NULL,
    label text NOT NULL,
    province text NOT NULL,
    value numeric NOT NULL,
    variation numeric,
    year text,
    created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS articles (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    title text NOT NULL,
    subtitle text,
    content text,
    type text,
    slug text,
    date text,
    image_url text,
    source text,
    source_url text,
    shared_on_facebook_at timestamptz,
    shared_on_linkedin_at timestamptz,
    deleted_at timestamptz,
    created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS companies (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id uuid REFERENCES auth.users(id),
    name text,
    slug text,
    activity text,
    address text,
    banner_url text,
    billing_period text,
    category text,
    contact text,
    description text,
    district text,
    email text,
    geo_location text,
    image_url text,
    is_featured boolean DEFAULT false,
    is_verified boolean DEFAULT false,
    location text,
    logo_url text,
    mission text,
    vision text,
    values text,
    nuit text,
    plan text,
    product_limit integer,
    products jsonb,
    province text,
    registration_type text,
    services text,
    type text DEFAULT 'Privada',
    value_chain text,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS dashboard_indicators (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    title text NOT NULL,
    value text NOT NULL,
    location text NOT NULL,
    slug text NOT NULL,
    trend text,
    created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS integrations (
    provider text PRIMARY KEY,
    credentials jsonb NOT NULL DEFAULT '{}'::jsonb,
    is_active boolean NOT NULL DEFAULT false,
    updated_at timestamptz DEFAULT now(),
    created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS forum_categories (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    name text NOT NULL,
    slug text UNIQUE NOT NULL,
    description text,
    icon text,
    created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS forum_topics (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    category_id uuid REFERENCES forum_categories(id) ON DELETE CASCADE,
    user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
    title text NOT NULL,
    content text NOT NULL,
    views_count integer DEFAULT 0,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS forum_comments (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    topic_id uuid REFERENCES forum_topics(id) ON DELETE CASCADE,
    user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
    content text NOT NULL,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS presentations (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    title text NOT NULL,
    description text,
    slides jsonb NOT NULL DEFAULT '[]'::jsonb,
    status text DEFAULT 'active',
    user_id uuid REFERENCES auth.users(id),
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_presentations_status ON presentations(status);

CREATE TABLE IF NOT EXISTS profiles (
    id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email text NOT NULL,
    full_name text,
    phone text,
    district text,
    province text,
    user_type text,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

-- ============================================================================
-- 2) Tabelas com SQL original (dos 25 ficheiros do repositório), com as
--    colunas extra confirmadas pelo código actual
-- ============================================================================

CREATE TABLE IF NOT EXISTS contacts (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id uuid REFERENCES companies(id) ON DELETE SET NULL,
    name text,
    role text,
    email text,
    phone text,
    phone_secondary text,
    whatsapp text,
    source text DEFAULT 'manual',
    notes text,
    is_verified boolean DEFAULT false,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS contacts_company_id_idx ON contacts(company_id);
CREATE INDEX IF NOT EXISTS contacts_email_idx ON contacts(email);

CREATE TABLE IF NOT EXISTS quotations (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    sender_name text NOT NULL,
    sender_email text NOT NULL,
    sender_phone text,
    message text NOT NULL,
    product_id uuid,
    company_id uuid REFERENCES companies(id) ON DELETE CASCADE,
    details jsonb DEFAULT '{}'::jsonb,
    status text DEFAULT 'pending',
    created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS services (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    title text NOT NULL,
    description text,
    full_description text,
    sub_services jsonb DEFAULT '[]'::jsonb,
    features text[],
    icon text,
    slug text UNIQUE NOT NULL,
    category text NOT NULL DEFAULT 'Geral',
    is_active boolean DEFAULT true,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS podcasts (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    title text NOT NULL,
    description text,
    video_url text NOT NULL,
    thumbnail_url text,
    duration text,
    specialist_name text,
    specialist_role text,
    category text,
    published_at timestamptz DEFAULT now(),
    is_featured boolean DEFAULT false,
    is_active boolean DEFAULT true,
    created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS deleted_presentations (
    id uuid PRIMARY KEY,
    title text NOT NULL,
    description text,
    slides jsonb NOT NULL DEFAULT '[]'::jsonb,
    user_id uuid REFERENCES auth.users(id),
    original_created_at timestamptz,
    deleted_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS email_campaigns (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    subject text NOT NULL,
    content text,
    sender_email text,
    target_audiences text[] DEFAULT '{}',
    recipient_count integer DEFAULT 0,
    status text DEFAULT 'enviada' CHECK (status IN ('rascunho', 'agendada', 'enviando', 'enviada', 'falhada')),
    scheduled_at timestamptz,
    sent_at timestamptz DEFAULT now(),
    created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS email_campaign_logs (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    campaign_id uuid REFERENCES email_campaigns(id) ON DELETE CASCADE,
    email text NOT NULL,
    status text DEFAULT 'enviado' CHECK (status IN ('enviado', 'falhado', 'bounce')),
    error text,
    created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS newsletter_subscribers (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    email text UNIQUE NOT NULL,
    status text DEFAULT 'active' CHECK (status IN ('active', 'unsubscribed')),
    created_at timestamptz DEFAULT now()
);

-- ============================================================================
-- 3) Tabelas reconstruídas a partir do uso real no código (sem SQL original)
-- ============================================================================

CREATE TABLE IF NOT EXISTS professionals (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id uuid REFERENCES auth.users(id),
    name text NOT NULL,
    role text,
    category text,
    location text,
    province text,
    district text,
    email text,
    phone text,
    whatsapp text,
    linkedin text,
    facebook text,
    instagram text,
    bio text,
    specialties text,
    academic_level text,
    profession text,
    photo_url text,
    status text DEFAULT 'pending',
    rating numeric DEFAULT 5.0,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS products (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    company_id uuid REFERENCES companies(id),
    user_id uuid REFERENCES auth.users(id),
    name text NOT NULL,
    category text,
    price numeric,
    description text,
    image_url text,
    available boolean DEFAULT true,
    status text DEFAULT 'active',
    created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS properties (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    company_id uuid REFERENCES companies(id),
    title text NOT NULL,
    type text,
    location text,
    price numeric,
    size text,
    status text DEFAULT 'active',
    ownership_type text,
    description text,
    image_url text,
    deleted_at timestamptz,
    created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS leads (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id uuid REFERENCES auth.users(id),
    sender_name text NOT NULL,
    sender_email text NOT NULL,
    sender_phone text,
    subject text,
    message text NOT NULL,
    source_type text,
    source_id uuid,
    status text DEFAULT 'new',
    read boolean DEFAULT false,
    created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS market_prices (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    product text NOT NULL,
    category text,
    unit text,
    price numeric NOT NULL,
    prev_price numeric,
    location text,
    status text DEFAULT 'active',
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz
);

CREATE TABLE IF NOT EXISTS messages (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    subject text NOT NULL,
    content text NOT NULL,
    sender_email text,
    target_roles text[],
    created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS notifications (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id uuid REFERENCES auth.users(id) NOT NULL,
    message_id uuid REFERENCES messages(id) ON DELETE CASCADE,
    read boolean DEFAULT false,
    created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS page_views (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    target_type text NOT NULL,
    target_id uuid NOT NULL,
    user_id uuid REFERENCES auth.users(id),
    created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS site_settings (
    key text PRIMARY KEY,
    value jsonb,
    "group" text DEFAULT 'general',
    updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS support_tickets (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id uuid REFERENCES auth.users(id) NOT NULL,
    user_email text,
    subject text,
    message text NOT NULL,
    status text DEFAULT 'pending',
    created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS trainings (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    title text NOT NULL,
    category text,
    description text,
    date text,
    duration text,
    location text,
    venue text,
    price text,
    spots_total integer DEFAULT 20,
    spots_available integer DEFAULT 20,
    instructor jsonb DEFAULT '{}'::jsonb,
    topics text[],
    requirements text[],
    includes text[],
    status text DEFAULT 'active',
    deleted_at timestamptz,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz
);

CREATE TABLE IF NOT EXISTS enrollments (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    training_id uuid REFERENCES trainings(id),
    training_title text,
    full_name text NOT NULL,
    email text NOT NULL,
    phone text NOT NULL,
    company text,
    notes text,
    created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS info_categories (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    title text NOT NULL,
    description text,
    href text NOT NULL DEFAULT '/servicos/',
    icon_name text DEFAULT 'Grid2X2',
    bg_color text DEFAULT 'bg-emerald-50',
    text_color text DEFAULT 'text-emerald-500',
    created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS contact_messages (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    name text NOT NULL,
    email text,
    message text NOT NULL,
    created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS podcast_categories (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    name text NOT NULL,
    slug text NOT NULL,
    description text,
    is_active boolean DEFAULT true,
    created_at timestamptz DEFAULT now()
);

-- ============================================================================
-- 4) RLS — activar em todas, com políticas pragmáticas por categoria
-- ============================================================================

DO $$
DECLARE
    t text;
BEGIN
    FOR t IN
        SELECT tablename FROM pg_tables WHERE schemaname = 'baseagrodata'
    LOOP
        EXECUTE format('ALTER TABLE baseagrodata.%I ENABLE ROW LEVEL SECURITY', t);
    END LOOP;
END $$;

-- Leitura pública (conteúdo editorial / público do site)
DO $$
DECLARE
    t text;
BEGIN
    FOREACH t IN ARRAY ARRAY[
        'agricultural_stats','articles','companies','dashboard_indicators',
        'forum_categories','forum_topics','forum_comments','services','podcasts',
        'podcast_categories','professionals','products','properties',
        'market_prices','trainings','info_categories','site_settings',
        'contacts','quotations'
    ]
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS "Leitura publica" ON baseagrodata.%I', t);
        EXECUTE format('CREATE POLICY "Leitura publica" ON baseagrodata.%I FOR SELECT USING (true)', t);
    END LOOP;
END $$;

-- Escrita apenas via service_role (painel admin usa sempre o cliente admin/service-role)
DO $$
DECLARE
    t text;
BEGIN
    FOREACH t IN ARRAY ARRAY[
        'agricultural_stats','articles','dashboard_indicators','forum_categories',
        'services','podcasts','podcast_categories','professionals','products',
        'properties','market_prices','trainings','info_categories','site_settings',
        'contacts','messages','integrations'
    ]
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS "Escrita admin (service role)" ON baseagrodata.%I', t);
        EXECUTE format('CREATE POLICY "Escrita admin (service role)" ON baseagrodata.%I FOR ALL TO service_role USING (true) WITH CHECK (true)', t);
    END LOOP;
END $$;

-- Formulários públicos — qualquer visitante pode inserir (sem sessão)
DO $$
DECLARE
    t text;
BEGIN
    FOREACH t IN ARRAY ARRAY[
        'leads','contact_messages','enrollments','page_views',
        'newsletter_subscribers','quotations','professionals'
    ]
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS "Insercao publica" ON baseagrodata.%I', t);
        EXECUTE format('CREATE POLICY "Insercao publica" ON baseagrodata.%I FOR INSERT WITH CHECK (true)', t);
    END LOOP;
END $$;

-- Dono do registo (empresa/produto/apresentação/perfil)
DROP POLICY IF EXISTS "Dono pode gerir" ON companies;
CREATE POLICY "Dono pode gerir" ON companies FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Dono pode gerir" ON presentations;
CREATE POLICY "Dono pode gerir" ON presentations FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Dono pode ver" ON deleted_presentations;
CREATE POLICY "Dono pode ver" ON deleted_presentations FOR ALL USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Dono pode gerir o proprio perfil" ON profiles;
CREATE POLICY "Dono pode gerir o proprio perfil" ON profiles FOR ALL USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "Dono pode ver os seus pedidos" ON leads;
CREATE POLICY "Dono pode ver os seus pedidos" ON leads FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Dono pode gerir os seus tickets" ON support_tickets;
CREATE POLICY "Dono pode gerir os seus tickets" ON support_tickets FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Dono pode gerir as suas notificacoes" ON notifications;
CREATE POLICY "Dono pode gerir as suas notificacoes" ON notifications FOR ALL USING (auth.uid() = user_id);

-- Fórum: participação autenticada, gestão do próprio conteúdo
DROP POLICY IF EXISTS "Autenticados criam topicos" ON forum_topics;
CREATE POLICY "Autenticados criam topicos" ON forum_topics FOR INSERT WITH CHECK (auth.role() = 'authenticated');
DROP POLICY IF EXISTS "Dono gere o seu topico" ON forum_topics;
CREATE POLICY "Dono gere o seu topico" ON forum_topics FOR UPDATE USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Dono apaga o seu topico" ON forum_topics;
CREATE POLICY "Dono apaga o seu topico" ON forum_topics FOR DELETE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Autenticados leem comentarios" ON forum_comments;
CREATE POLICY "Autenticados leem comentarios" ON forum_comments FOR SELECT USING (auth.role() = 'authenticated');
DROP POLICY IF EXISTS "Autenticados criam comentarios" ON forum_comments;
CREATE POLICY "Autenticados criam comentarios" ON forum_comments FOR INSERT WITH CHECK (auth.role() = 'authenticated');
DROP POLICY IF EXISTS "Dono gere o seu comentario" ON forum_comments;
CREATE POLICY "Dono gere o seu comentario" ON forum_comments FOR UPDATE USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Dono apaga o seu comentario" ON forum_comments;
CREATE POLICY "Dono apaga o seu comentario" ON forum_comments FOR DELETE USING (auth.uid() = user_id);

-- Integrations: só admin (service_role já coberto acima, nada de leitura pública aqui)

-- Newsletter/email marketing: já tem leitura/escrita cobertas pelo service_role acima;
-- falta permitir a própria inscrição pública ver o status (opcional, não crítico agora).

-- ============================================================================
-- 5) Dados iniciais (seed) que existiam no código
-- ============================================================================

INSERT INTO forum_categories (name, slug, description, icon) VALUES
('Tecnologia Agrícola', 'tecnologia-agricola', 'Discussão sobre novas tecnologias e inovações no campo.', 'Cpu'),
('Mercado e Preços', 'mercado-precos', 'Debates sobre tendências de mercado e flutuação de preços.', 'TrendingUp'),
('Gestão de Fazendas', 'gestao-fazendas', 'Melhores práticas para gestão e produtividade.', 'Layout'),
('Sustentabilidade', 'sustentabilidade', 'Práticas agrícolas sustentáveis e meio ambiente.', 'Leaf')
ON CONFLICT (slug) DO NOTHING;

INSERT INTO services (title, description, slug, category, icon) VALUES
('Sistemas de Rega', 'Soluções eficientes de irrigação', 'sistemas-de-rega', 'Infraestrutura', 'Droplets'),
('Maquinaria Agrícola', 'Tratores e equipamentos de ponta', 'maquinaria-agricola', 'Infraestrutura', 'Tractor'),
('Sementes e Fertilizantes', 'Insumos de alta qualidade', 'sementes-e-fertilizantes', 'Insumos', 'Sprout'),
('Consultoria Agronómica', 'Apoio técnico especializado', 'consultoria-agronomica', 'Serviços', 'ClipboardList')
ON CONFLICT (slug) DO NOTHING;

-- Nota: os dados de empresas (register_companies.sql/update_companies.sql) e as
-- restantes actualizações de conteúdo (logos, descrições) NÃO foram replicados —
-- são conteúdo do site (não estrutura), o utilizador vai preferir recriá-los ou
-- decidir se ainda fazem sentido, em vez de repor texto de meses atrás às cegas.
