-- =====================================================================
-- Verificação de segurança (só leitura). Rode depois dos outros arquivos.
-- Esperado:
--   1. todas as tabelas com rls_ligado = true
--   2. nenhuma política para o papel "anon" (visitante sem login)
--   3. bucket "anexos" com publico = false
--   4. membros: só as pessoas da equipe
-- =====================================================================

-- 1. RLS nas tabelas
select c.relname as tabela, c.relrowsecurity as rls_ligado
from pg_class c
join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public' and c.relkind = 'r'
order by 1;

-- 2. Políticas que alcançam visitantes sem login (deve voltar vazio)
select schemaname, tablename, policyname, roles
from pg_policies
where (schemaname = 'public' or (schemaname = 'storage' and tablename = 'objects'))
  and ('anon' = any (roles) or 'public' = any (roles));

-- 3. Bucket de fotos e vídeos
select id, public as publico, file_size_limit from storage.buckets where id = 'anexos';

-- 4. Quem tem acesso
select m.nome, m.papel, u.email
from public.membros m
join auth.users u on u.id = m.user_id
order by m.criado_em;
