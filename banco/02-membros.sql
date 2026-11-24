-- =====================================================================
-- Cadastrar a equipe (rode de novo sempre que entrar alguém)
--
-- Passo a passo:
--   1. No Supabase: Authentication > Users > Add user > Create new user.
--      Informe e-mail e senha e marque "Auto Confirm User".
--      (Ou use "Invite user" para a pessoa criar a própria senha.)
--   2. Troque os e-mails abaixo e rode este arquivo no SQL Editor.
--
-- Importante: em Authentication > Sign In / Providers, desligue
-- "Allow new users to sign up". Assim ninguém de fora consegue nem criar
-- conta. Mesmo se ligar de novo por engano, quem não está em "membros" não
-- vê nada.
-- =====================================================================

insert into public.membros (user_id, nome, papel)
select u.id, v.nome, v.papel
from auth.users u
join (values
  ('EMAIL-DA-ANA@exemplo.com',   'Ana Luisa Peretti', 'editor'),
  ('EMAIL-DA-EQUIPE@exemplo.com', 'Nome da pessoa',    'editor')
) as v (email, nome, papel) on lower(u.email) = lower(v.email)
on conflict (user_id) do update
  set nome = excluded.nome, papel = excluded.papel;

-- Para tirar o acesso de alguém:
--   delete from public.membros
--   where user_id = (select id from auth.users where lower(email) = lower('EMAIL@exemplo.com'));
