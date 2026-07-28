/**
 * Garante a tabela de registo de sites Next.js no Supabase — não é um espelho do
 * DirectAdmin, é um registo próprio do painel (um site Next.js pode estar alojado
 * no nosso Hetzner ou em qualquer outro sítio, ex.: Vercel).
 */

import { createClient } from '@supabase/supabase-js'

const MIGRATION_SQL = `
CREATE TABLE IF NOT EXISTS public.panel_nextjs_sites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  domain TEXT NOT NULL UNIQUE,
  name TEXT,
  hosting_note TEXT,
  site_url TEXT,
  admin_url TEXT,
  pm2_process_name TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.panel_nextjs_sites ADD COLUMN IF NOT EXISTS site_url TEXT;
CREATE INDEX IF NOT EXISTS idx_panel_nextjs_sites_domain ON public.panel_nextjs_sites (domain);
ALTER TABLE public.panel_nextjs_sites ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all on panel_nextjs_sites" ON public.panel_nextjs_sites;
CREATE POLICY "Allow all on panel_nextjs_sites" ON public.panel_nextjs_sites FOR ALL USING (true) WITH CHECK (true);
`

let schemaReady = false

function adminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) return null
  return createClient(url, key)
}

export async function ensurePanelNextjsSitesSchema(): Promise<boolean> {
  if (schemaReady) return true
  const admin = adminClient()
  if (!admin) return false

  try {
    const { error } = await admin.rpc('exec_sql', { sql: MIGRATION_SQL })
    if (!error) {
      schemaReady = true
      return true
    }
  } catch {
    /* RPC pode não existir */
  }

  const { error: probe } = await admin.from('panel_nextjs_sites').select('id').limit(1)
  if (!probe) {
    schemaReady = true
    return true
  }

  console.warn('[panel-nextjs-sites-schema] Execute scripts/migrate-panel-nextjs-sites.sql no Supabase.')
  return false
}
