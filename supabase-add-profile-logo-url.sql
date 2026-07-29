-- Execute no SQL Editor do Supabase (https://supabase.visualdesignmoz.com -> SQL Editor)
--
-- Guarda o logótipo próprio de cada conta (revendedor/cliente/profissional)
-- para usar no cabeçalho dos templates de Mailmarketing em vez do logo da
-- VisualDesign — ver src/app/api/mailmarketing-logo/route.ts.

ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS logo_url TEXT;
