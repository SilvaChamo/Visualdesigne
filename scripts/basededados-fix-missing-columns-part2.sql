-- Continuação de basededados-fix-missing-columns.sql — essa migração parou
-- a meio (ON_ERROR_STOP=1) porque "integrations" já tem chave primária na
-- coluna "provider" (não "id" como na origem); tentar adicionar uma segunda
-- PK é inválido em Postgres. Aqui: adiciona "id" como coluna simples (sem
-- PK, só para os dados reais poderem ser copiados), e repete os dois passos
-- finais que nunca chegaram a correr por causa desse erro.

ALTER TABLE basededados.integrations ADD COLUMN IF NOT EXISTS id uuid DEFAULT gen_random_uuid();

DELETE FROM basededados.forum_categories WHERE created_at = '2026-08-09T19:47:35.35289+00:00';
DELETE FROM basededados.services WHERE created_at = '2026-08-09T19:47:35.354547+00:00';

NOTIFY pgrst, 'reload schema';
