-- Supabase schema for Consultoria app
-- Run this in Supabase SQL editor

create extension if not exists "pgcrypto";

create table if not exists profiles (
  id uuid primary key references auth.users on delete cascade,
  role text not null default 'student',
  roles text[] not null default array['student']::text[],
  name text,
  avatar_url text,
  age int,
  weight numeric,
  height numeric,
  goal text,
  experience text,
  bio text,
  profile_complete boolean not null default false,
  onboarding_step text not null default 'pending_verification',
  trainer_code text,
  trainer_id uuid references profiles(id),
  connected_trainer_code text,
  anamnesis jsonb,
  created_at timestamptz not null default now(),
  check (onboarding_step in ('pending_verification', 'profile_setup', 'trainer_connect', 'done')),
  check (
    cardinality(roles) > 0
    and roles <@ array['trainer', 'student']::text[]
  )
);

alter table profiles add column if not exists role text;
alter table profiles add column if not exists roles text[] not null default array['student']::text[];
alter table profiles add column if not exists onboarding_step text not null default 'pending_verification';
alter table profiles add column if not exists profile_complete boolean not null default false;
alter table profiles add column if not exists connected_trainer_code text;
alter table profiles add column if not exists anamnesis jsonb;
alter table profiles add column if not exists trainer_code text;
alter table profiles add column if not exists trainer_id uuid references profiles(id);

update profiles
set roles = array[
  case
    when lower(coalesce(role, '')) in ('treinador', 'trainer') then 'trainer'
    else 'student'
  end
]::text[]
where roles is null or cardinality(roles) = 0;

update profiles
set role = coalesce(role, roles[1], 'student')
where role is null or role = '';

update profiles
set onboarding_step = case
  when onboarding_step in ('pending_verification', 'profile_setup', 'trainer_connect', 'done') then onboarding_step
  when profile_complete is not true then 'profile_setup'
  when coalesce(array_position(roles, 'student'), 0) > 0 and connected_trainer_code is null then 'trainer_connect'
  else 'done'
end;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'profiles_onboarding_step_check'
  ) then
    alter table profiles
      add constraint profiles_onboarding_step_check
      check (onboarding_step in ('pending_verification', 'profile_setup', 'trainer_connect', 'done'));
  end if;
end $$;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'profiles_roles_allowed_check'
  ) then
    alter table profiles
      add constraint profiles_roles_allowed_check
      check (
        cardinality(roles) > 0
        and roles <@ array['trainer', 'student']::text[]
      );
  end if;
end $$;

create table if not exists students (
  id text primary key,
  trainer_id uuid not null default auth.uid() references profiles(id) on delete cascade,
  user_id uuid references auth.users(id) on delete set null,
  name text not null,
  goal text,
  weight numeric,
  kcal numeric,
  status text default 'active',
  status_text text default 'Ativo',
  created_at timestamptz default now()
);

create table if not exists workout_plans (
  id uuid primary key default gen_random_uuid(),
  trainer_id uuid not null default auth.uid() references profiles(id) on delete cascade,
  student_id text not null references students(id) on delete cascade unique,
  blocks jsonb not null default '[]'::jsonb,
  updated_at timestamptz default now()
);

create table if not exists diet_plans (
  id uuid primary key default gen_random_uuid(),
  trainer_id uuid not null default auth.uid() references profiles(id) on delete cascade,
  student_id text not null references students(id) on delete cascade unique,
  meals jsonb not null default '[]'::jsonb,
  updated_at timestamptz default now()
);

create table if not exists workout_history (
  id uuid primary key default gen_random_uuid(),
  trainer_id uuid not null default auth.uid() references profiles(id) on delete cascade,
  student_id text not null references students(id) on delete cascade,
  title text,
  notes text,
  completed_at timestamptz default now()
);

create index if not exists profiles_id_idx on profiles(id);
create unique index if not exists profiles_trainer_code_unique_idx on profiles(trainer_code) where trainer_code is not null;
create index if not exists profiles_connected_trainer_code_idx on profiles(connected_trainer_code) where connected_trainer_code is not null;
create index if not exists students_user_id_idx on students(user_id);
create index if not exists students_trainer_id_idx on students(trainer_id);

alter table profiles enable row level security;
alter table students enable row level security;
alter table workout_plans enable row level security;
alter table diet_plans enable row level security;
alter table workout_history enable row level security;

drop policy if exists "profiles_select_own" on profiles;
drop policy if exists "profiles_insert_own" on profiles;
drop policy if exists "profiles_update_own" on profiles;
drop policy if exists "profiles_select_by_trainer_code" on profiles;

create policy "profiles_select_own" on profiles
  for select
  using (id = auth.uid());

create policy "profiles_insert_own" on profiles
  for insert
  with check (id = auth.uid());

create policy "profiles_update_own" on profiles
  for update
  using (id = auth.uid())
  with check (id = auth.uid());

drop policy if exists "students_trainer_all" on students;
drop policy if exists "students_student_read" on students;
drop policy if exists "students_student_read_own" on students;
drop policy if exists "students_student_update_own" on students;

create policy "students_trainer_all" on students
  for all
  using (trainer_id = auth.uid())
  with check (trainer_id = auth.uid());

create policy "students_student_read_own" on students
  for select
  using (user_id = auth.uid());

create policy "students_student_update_own" on students
  for update
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

drop policy if exists "workout_plans_trainer_all" on workout_plans;
drop policy if exists "workout_plans_student_read" on workout_plans;

create policy "workout_plans_trainer_all" on workout_plans
  for all
  using (trainer_id = auth.uid())
  with check (trainer_id = auth.uid());

create policy "workout_plans_student_read" on workout_plans
  for select
  using (
    exists (
      select 1
      from students s
      where s.id = workout_plans.student_id
        and s.user_id = auth.uid()
    )
  );

drop policy if exists "diet_plans_trainer_all" on diet_plans;
drop policy if exists "diet_plans_student_read" on diet_plans;

create policy "diet_plans_trainer_all" on diet_plans
  for all
  using (trainer_id = auth.uid())
  with check (trainer_id = auth.uid());

create policy "diet_plans_student_read" on diet_plans
  for select
  using (
    exists (
      select 1
      from students s
      where s.id = diet_plans.student_id
        and s.user_id = auth.uid()
    )
  );

drop policy if exists "workout_history_trainer_all" on workout_history;
drop policy if exists "workout_history_student_all" on workout_history;

create policy "workout_history_trainer_all" on workout_history
  for all
  using (trainer_id = auth.uid())
  with check (trainer_id = auth.uid());

create policy "workout_history_student_all" on workout_history
  for all
  using (
    exists (
      select 1
      from students s
      where s.id = workout_history.student_id
        and s.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1
      from students s
      where s.id = workout_history.student_id
        and s.user_id = auth.uid()
    )
  );
