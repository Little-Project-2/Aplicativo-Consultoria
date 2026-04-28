-- Verificações rápidas da base de autenticação
-- Execute no SQL Editor do Supabase após rodar auth_login_setup.sql

-- 1) Trigger de criação de perfil a partir de auth.users
select
  tgname as trigger_name,
  tgenabled as enabled
from pg_trigger
where tgname = 'on_auth_user_created';

-- 2) Policies de RLS da tabela profiles
select
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
from pg_policies
where schemaname = 'public'
  and tablename = 'profiles'
order by policyname;

-- 3) RLS habilitada?
select
  relname as table_name,
  relrowsecurity as rls_enabled
from pg_class
where oid = 'public.profiles'::regclass;

-- 4) Privilégios esperados (anon deve ser false para select)
select
  has_table_privilege('anon', 'public.profiles', 'select') as anon_can_select,
  has_table_privilege('authenticated', 'public.profiles', 'select') as authenticated_can_select,
  has_table_privilege('authenticated', 'public.profiles', 'insert') as authenticated_can_insert,
  has_table_privilege('authenticated', 'public.profiles', 'update') as authenticated_can_update;

