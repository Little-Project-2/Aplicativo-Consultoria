-- Realtime + persistence schema used by public/script.js
-- Run this script in Supabase SQL editor.

create table if not exists public.app_trainers (
  code text primary key,
  name text not null default 'Treinador',
  consultoria_name text,
  services text default 'treino',
  updated_at timestamptz not null default now()
);

create table if not exists public.app_students (
  id text primary key,
  trainer_code text not null,
  data jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

create index if not exists app_students_trainer_code_idx on public.app_students(trainer_code);
create index if not exists app_students_updated_at_idx on public.app_students(updated_at desc);

alter table public.app_trainers enable row level security;
alter table public.app_students enable row level security;

drop policy if exists app_trainers_select_all on public.app_trainers;
drop policy if exists app_trainers_insert_all on public.app_trainers;
drop policy if exists app_trainers_update_all on public.app_trainers;
drop policy if exists app_students_select_all on public.app_students;
drop policy if exists app_students_insert_all on public.app_students;
drop policy if exists app_students_update_all on public.app_students;
drop policy if exists app_students_delete_all on public.app_students;

-- Prototype policies (anon key access). Restrict later for production auth.
create policy app_trainers_select_all on public.app_trainers
  for select using (true);
create policy app_trainers_insert_all on public.app_trainers
  for insert with check (true);
create policy app_trainers_update_all on public.app_trainers
  for update using (true) with check (true);

create policy app_students_select_all on public.app_students
  for select using (true);
create policy app_students_insert_all on public.app_students
  for insert with check (true);
create policy app_students_update_all on public.app_students
  for update using (true) with check (true);
create policy app_students_delete_all on public.app_students
  for delete using (true);

do $$
begin
  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'app_trainers'
  ) then
    alter publication supabase_realtime add table public.app_trainers;
  end if;

  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'app_students'
  ) then
    alter publication supabase_realtime add table public.app_students;
  end if;
end $$;
