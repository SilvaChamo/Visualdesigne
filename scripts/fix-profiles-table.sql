-- ============================================================
-- FIX: Tabela profiles - Adicionar colunas em falta (dados WHOIS)
-- Executar no Supabase SQL Editor
-- ============================================================
-- Sem estas colunas, o telefone/morada/cidade/empresa que o cliente
-- preenche em "A Minha Conta" nunca chegam a ser guardados — e o
-- registo de domínios (Dynadot) usa dados de reserva genéricos em vez
-- dos dados reais do cliente.

ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS telefone TEXT,
ADD COLUMN IF NOT EXISTS empresa TEXT,
ADD COLUMN IF NOT EXISTS morada TEXT,
ADD COLUMN IF NOT EXISTS cidade TEXT;

-- Verificar resultado
SELECT column_name, data_type FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'profiles'
ORDER BY ordinal_position;
