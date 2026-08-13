-- Cria as 14 tabelas que existiam na origem (Supabase Cloud, resumido em
-- 2026-08-10) mas nunca foram criadas no schema self-hosted "basededados"
-- durante o rebuild de 2026-08-09 (feito "por arqueologia de código", sem
-- acesso aos dados reais). Estrutura extraída da definição OpenAPI real da
-- origem. Ordem respeita dependências (roles/capabilities antes de quem as
-- referencia). Idempotente (IF NOT EXISTS em tudo).

CREATE TABLE IF NOT EXISTS basededados.roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name character varying(50),
  label character varying(100),
  description text,
  is_system boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS basededados.capabilities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name character varying(100),
  label character varying(200),
  description text,
  group_name character varying(100),
  icon character varying(50),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS basededados.role_redirects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  role_id uuid REFERENCES basededados.roles(id),
  after_login_path character varying(255) DEFAULT '/admin/dashboard',
  after_logout_path character varying(255) DEFAULT '/',
  description text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS basededados.role_capabilities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  role_id uuid REFERENCES basededados.roles(id),
  capability_id uuid REFERENCES basededados.capabilities(id),
  granted boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS basededados.role_menu_visibility (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  role_id uuid REFERENCES basededados.roles(id),
  menu_item character varying(100),
  is_visible boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS basededados.news (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title character varying(255),
  summary text,
  content text,
  category character varying(100),
  image_url text,
  date timestamptz DEFAULT now(),
  views integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  site_id character varying(50) DEFAULT 'baseagrodata',
  slug character varying(255),
  status text DEFAULT 'Published'
);

CREATE TABLE IF NOT EXISTS basededados.baseagrodata_news (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title character varying(255),
  summary text,
  content text,
  category character varying(100),
  image_url text,
  date timestamptz,
  views integer,
  created_at timestamptz,
  site_id character varying(50),
  slug character varying(255),
  visible_in_baseagrodata boolean
);

CREATE TABLE IF NOT EXISTS basededados.entrecampos_news (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title character varying(255),
  summary text,
  content text,
  category character varying(100),
  image_url text,
  date timestamptz,
  views integer,
  created_at timestamptz,
  site_id character varying(50),
  slug character varying(255),
  visible_in_entrecampos boolean
);

CREATE TABLE IF NOT EXISTS basededados.plant_collection (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid,
  name text,
  scientific_name text,
  custom_name text,
  confidence numeric,
  properties jsonb,
  benefits jsonb,
  history text,
  origin text,
  soil_type text,
  medicinal_uses jsonb,
  recipes jsonb,
  image_url text,
  diagnosis jsonb,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS basededados.category_site_mapping (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  category character varying(100),
  site_id character varying(50),
  is_visible boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS basededados.video_ads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_name text,
  phone text,
  address text,
  video_link text,
  embed_url text,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS basededados.plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text,
  description text,
  price text,
  is_public boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS basededados.stores (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text,
  description text,
  category text,
  location text,
  province text,
  status text DEFAULT 'Aberto',
  image_url text,
  logo_url text,
  contact_phone text,
  contact_email text,
  website text,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS basededados.produtos (
  id bigserial PRIMARY KEY,
  nome text,
  preco numeric
);

NOTIFY pgrst, 'reload schema';
