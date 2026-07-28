-- Registo de sites Next.js no painel (não é espelho do DirectAdmin — pode incluir
-- sites alojados no Hetzner ou noutro fornecedor qualquer, ex. Vercel).
CREATE TABLE IF NOT EXISTS public.panel_nextjs_sites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  domain TEXT NOT NULL UNIQUE,
  name TEXT,
  hosting_note TEXT,
  admin_url TEXT,
  pm2_process_name TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_panel_nextjs_sites_domain ON public.panel_nextjs_sites (domain);

ALTER TABLE public.panel_nextjs_sites ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all on panel_nextjs_sites" ON public.panel_nextjs_sites;
CREATE POLICY "Allow all on panel_nextjs_sites" ON public.panel_nextjs_sites FOR ALL USING (true) WITH CHECK (true);
