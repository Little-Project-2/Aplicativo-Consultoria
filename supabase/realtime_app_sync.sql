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

create table if not exists public.app_foods (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  brand text,
  base_qty numeric not null default 100,
  base_unit text not null default 'g',
  kcal numeric not null default 0,
  protein numeric not null default 0,
  carb numeric not null default 0,
  fat numeric not null default 0,
  created_by text,
  source text not null default 'manual',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

do $$
begin
  if not exists (select 1 from public.app_foods where lower(name) = 'arroz cozido') then
    insert into public.app_foods(name, base_qty, base_unit, kcal, protein, carb, fat, source)
    values ('Arroz cozido', 100, 'g', 130, 2.7, 28, 0.3, 'manual');
  end if;
  if not exists (select 1 from public.app_foods where lower(name) = 'feijao cozido') then
    insert into public.app_foods(name, base_qty, base_unit, kcal, protein, carb, fat, source)
    values ('Feijao cozido', 100, 'g', 76, 4.8, 13.6, 0.5, 'manual');
  end if;
  if not exists (select 1 from public.app_foods where lower(name) = 'frango grelhado') then
    insert into public.app_foods(name, base_qty, base_unit, kcal, protein, carb, fat, source)
    values ('Frango grelhado', 100, 'g', 165, 31, 0, 3.6, 'manual');
  end if;
  if not exists (select 1 from public.app_foods where lower(name) = 'ovo cozido') then
    insert into public.app_foods(name, base_qty, base_unit, kcal, protein, carb, fat, source)
    values ('Ovo cozido', 100, 'g', 155, 13, 1.1, 11, 'manual');
  end if;
  if not exists (select 1 from public.app_foods where lower(name) = 'aveia em flocos') then
    insert into public.app_foods(name, base_qty, base_unit, kcal, protein, carb, fat, source)
    values ('Aveia em flocos', 100, 'g', 389, 16.9, 66.3, 6.9, 'manual');
  end if;
end $$;

create index if not exists app_students_trainer_code_idx on public.app_students(trainer_code);
create index if not exists app_students_updated_at_idx on public.app_students(updated_at desc);
create index if not exists app_foods_name_idx on public.app_foods(name);
create index if not exists app_foods_source_idx on public.app_foods(source);
create index if not exists app_foods_created_at_idx on public.app_foods(created_at desc);

alter table public.app_trainers enable row level security;
alter table public.app_students enable row level security;
alter table public.app_foods enable row level security;

drop policy if exists app_trainers_select_all on public.app_trainers;
drop policy if exists app_trainers_insert_all on public.app_trainers;
drop policy if exists app_trainers_update_all on public.app_trainers;
drop policy if exists app_students_select_all on public.app_students;
drop policy if exists app_students_insert_all on public.app_students;
drop policy if exists app_students_update_all on public.app_students;
drop policy if exists app_students_delete_all on public.app_students;
drop policy if exists app_foods_select_all on public.app_foods;
drop policy if exists app_foods_insert_all on public.app_foods;
drop policy if exists app_foods_update_all on public.app_foods;

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

create policy app_foods_select_all on public.app_foods
  for select using (true);
create policy app_foods_insert_all on public.app_foods
  for insert with check (true);
create policy app_foods_update_all on public.app_foods
  for update using (true) with check (true);

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

  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'app_foods'
  ) then
    alter publication supabase_realtime add table public.app_foods;
  end if;
end $$;
