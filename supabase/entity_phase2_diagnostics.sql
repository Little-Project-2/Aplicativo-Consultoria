-- Phase 2 diagnostics helper
-- Run manually in Supabase SQL editor for quick health check.

select
  now() as checked_at,
  (select count(*) from public.student_connections where status = 'pending') as pending_connections,
  (select count(*) from public.diet_logs) as diet_log_rows,
  (select count(*) from public.workout_sessions) as workout_sessions_rows,
  (select count(*) from public.workout_sets) as workout_sets_rows;

select
  schemaname,
  tablename,
  rowsecurity
from pg_tables
where schemaname = 'public'
  and tablename in ('student_profiles', 'diet_logs', 'workout_sessions', 'workout_sets', 'student_connections')
order by tablename;

select
  tablename,
  policyname,
  permissive,
  roles,
  cmd
from pg_policies
where schemaname = 'public'
  and tablename in ('student_profiles', 'diet_logs', 'workout_sessions', 'workout_sets', 'student_connections')
order by tablename, policyname;
