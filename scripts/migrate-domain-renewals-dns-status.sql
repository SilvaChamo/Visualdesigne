-- #9 (briefing correções checkout/domínios): marca se a configuração de DNS
-- (zona Cloudflare + nameservers) de um domínio comprado ficou concluída,
-- separado de `status` (que continua a dizer só se o domínio é nosso).
-- Executar UMA VEZ no Supabase SQL Editor.

ALTER TABLE public.domain_renewals
  ADD COLUMN IF NOT EXISTS dns_status TEXT;

-- Domínios já existentes sem este campo: assume-se que já estavam
-- configurados (não há forma de saber retroactivamente sem correr a
-- automação outra vez), evita mostrar "a aguardar configuração" para
-- domínios antigos que sempre funcionaram.
UPDATE public.domain_renewals SET dns_status = 'ok' WHERE dns_status IS NULL;
