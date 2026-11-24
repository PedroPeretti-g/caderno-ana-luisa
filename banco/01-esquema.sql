-- =====================================================================
-- Caderno Ana Luisa Peretti: banco de dados (Supabase / PostgreSQL 15+)
--
-- Como usar (projeto Supabase NOVO, só para este caderno):
--   1. No Supabase, abra o projeto e vá em SQL Editor > New query.
--   2. Cole este arquivo inteiro e clique em Run.
--   3. Depois rode o 02-membros.sql (cadastra quem pode entrar) e, por
--      último, o 03-verificar-seguranca.sql.
--   4. Rode uma única vez.
--
-- Regra de ouro: só entra quem está na tabela "membros" (a equipe do
-- escritório). Quem não está nela não lê nem grava nada, mesmo que consiga
-- criar uma conta ou chame a API diretamente.
-- =====================================================================


-- 1. MEMBROS (equipe autorizada) ---------------------------------------
-- papel: 'editor' lê e grava; 'leitura' só lê.
create table public.membros (
  user_id   uuid primary key references auth.users (id) on delete cascade,
  nome      text not null default '' check (char_length(nome) <= 120),
  papel     text not null default 'editor' check (papel in ('editor', 'leitura')),
  criado_em timestamptz not null default now()
);

alter table public.membros enable row level security;

-- Cada pessoa só enxerga a própria linha. Ninguém grava por aqui: o
-- cadastro de membros é feito pelo painel (SQL Editor), nunca pelo app.
create policy membros_ler_proprio on public.membros
  for select to authenticated
  using (user_id = (select auth.uid()));


-- 2. FUNÇÃO DE PERMISSÃO ----------------------------------------------
create function public.eh_membro(exigir_edicao boolean default false)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.membros m
    where m.user_id = (select auth.uid())
      and (not exigir_edicao or m.papel = 'editor')
  );
$$;

revoke execute on function public.eh_membro(boolean) from public, anon;
grant execute on function public.eh_membro(boolean) to authenticated;


-- 3. DOCUMENTOS (ordens de serviço, projetos e metadados) --------------
-- O app guarda cada ordem e cada projeto como um documento JSON.
-- colecao: 'ordens' | 'projetos' | 'meta'
create table public.docs (
  colecao        text  not null check (colecao in ('ordens', 'projetos', 'meta')),
  id             text  not null check (char_length(id) between 1 and 80),
  dados          jsonb not null check (pg_column_size(dados) < 1000000),
  atualizado_em  timestamptz not null default now(),
  atualizado_por uuid default auth.uid() references auth.users (id) on delete set null,
  primary key (colecao, id)
);

alter table public.docs enable row level security;

create policy docs_ler on public.docs
  for select to authenticated
  using (public.eh_membro());

create policy docs_inserir on public.docs
  for insert to authenticated
  with check (public.eh_membro(true));

create policy docs_atualizar on public.docs
  for update to authenticated
  using (public.eh_membro(true))
  with check (public.eh_membro(true));

create policy docs_apagar on public.docs
  for delete to authenticated
  using (public.eh_membro(true));

create function public.docs_marcar_alteracao()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.atualizado_em := now();
  new.atualizado_por := auth.uid();
  return new;
end;
$$;

create trigger docs_antes_de_gravar
  before insert or update on public.docs
  for each row execute function public.docs_marcar_alteracao();

-- Atualização em tempo real entre aparelhos (a RLS vale também aqui).
alter publication supabase_realtime add table public.docs;


-- 4. FOTOS E VÍDEOS (armazenamento privado) ---------------------------
-- Bucket privado: nada é público, o app usa links temporários.
-- Limite de 50 MB por arquivo (teto do plano gratuito do Supabase).
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'anexos', 'anexos', false, 52428800,
  array['image/jpeg', 'video/mp4', 'video/quicktime', 'video/webm', 'video/3gpp', 'video/x-m4v']
)
on conflict (id) do update
  set public = false,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

create policy anexos_ler on storage.objects
  for select to authenticated
  using (bucket_id = 'anexos' and public.eh_membro());

create policy anexos_enviar on storage.objects
  for insert to authenticated
  with check (bucket_id = 'anexos' and public.eh_membro(true));

create policy anexos_apagar on storage.objects
  for delete to authenticated
  using (bucket_id = 'anexos' and public.eh_membro(true));
