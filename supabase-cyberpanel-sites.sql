-- Tabela para sincronizar sites do CyberPanel com Supabase
CREATE TABLE IF NOT EXISTS cyberpanel_sites (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  domain TEXT UNIQUE NOT NULL,
  admin_email TEXT,
  package TEXT,
  owner TEXT,
  status TEXT DEFAULT 'Active',
  disk_usage TEXT,
  bandwidth_usage TEXT,
  synced_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Trigger para updated_at
CREATE TRIGGER update_cyberpanel_sites_updated_at BEFORE UPDATE ON cyberpanel_sites
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Índices
CREATE INDEX idx_cyberpanel_sites_domain ON cyberpanel_sites(domain);
CREATE INDEX idx_cyberpanel_sites_status ON cyberpanel_sites(status);

-- RLS
ALTER TABLE cyberpanel_sites ENABLE ROW LEVEL SECURITY;

-- Permitir leitura e escrita para todos (admin panel usa anon key)
CREATE POLICY "Allow all operations on cyberpanel_sites" ON cyberpanel_sites
  FOR ALL USING (true) WITH CHECK (true);
