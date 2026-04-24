-- Verificação operacional do sync realtime (app_trainers / app_students / app_foods)
-- Execute este arquivo no SQL Editor do Supabase.

-- 1) Tabelas esperadas
select
  to_regclass('public.app_trainers') as app_trainers_table,
  to_regclass('public.app_students') as app_students_table,
  to_regclass('public.app_foods') as app_foods_table,
  to_regclass('public.app_food_portions') as app_food_portions_table;

-- 2) RLS habilitado
select
  tablename,
  rowsecurity
from pg_tables
where schemaname = 'public'
  and tablename in ('app_trainers', 'app_students', 'app_foods', 'app_food_portions')
order by tablename;

-- 3) Policies aplicadas
select
  tablename,
  policyname,
  cmd
from pg_policies
where schemaname = 'public'
  and tablename in ('app_trainers', 'app_students', 'app_foods', 'app_food_portions')
order by tablename, policyname;

-- 4) Reparar owner_id faltante em app_trainers com base no profiles.trainer_code
update public.app_trainers t
set owner_id = p.id
from public.profiles p
where t.owner_id is null
  and p.trainer_code = t.code;

-- 5) Diagnóstico de ownership para o usuário autenticado atual
select
  t.code,
  t.owner_id,
  (t.owner_id = auth.uid()) as owned_by_me
from public.app_trainers t
order by t.code;

-- 6) Diagnóstico de linhas em app_students
-- expected_owner = se o trainer_code pertence ao auth.uid
-- expected_student = se data.userId = auth.uid
select
  s.id,
  s.trainer_code,
  coalesce(s.data ->> 'userId', '') as data_user_id,
  exists (
    select 1
    from public.app_trainers t
    where t.code = s.trainer_code
      and t.owner_id = auth.uid()
  ) as expected_owner_access,
  (coalesce(s.data ->> 'userId', '') = auth.uid()::text) as expected_student_access,
  s.updated_at
from public.app_students s
order by s.updated_at desc
limit 200;
