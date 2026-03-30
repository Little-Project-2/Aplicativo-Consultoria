-- Supabase schema for Consultoria app
-- Run this in Supabase SQL editor

create extension if not exists "pgcrypto";

create table if not exists profiles (
  id uuid primary key references auth.users on delete cascade,
  role text not null default 'trainer',
  name text,
  avatar_url text,
  age int,
  weight numeric,
  height numeric,
  goal text,
  experience text,
  bio text,
  profile_complete boolean default false,
  trainer_code text,
  trainer_id uuid references profiles(id),
  connected_trainer_code text,
  created_at timestamptz default now()
);

create table if not exists students (
  id uuid primary key default gen_random_uuid(),
  trainer_id uuid not null default auth.uid() references profiles(id) on delete cascade,
  user_id uuid references auth.users,
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
  student_id uuid not null references students(id) on delete cascade unique,
  blocks jsonb not null default '[]'::jsonb,
  updated_at timestamptz default now()
);

create table if not exists diet_plans (
  id uuid primary key default gen_random_uuid(),
  trainer_id uuid not null default auth.uid() references profiles(id) on delete cascade,
  student_id uuid not null references students(id) on delete cascade unique,
  meals jsonb not null default '[]'::jsonb,
  updated_at timestamptz default now()
);

create table if not exists workout_history (
  id uuid primary key default gen_random_uuid(),
  trainer_id uuid not null default auth.uid() references profiles(id) on delete cascade,
  student_id uuid not null references students(id) on delete cascade,
  title text,
  notes text,
  completed_at timestamptz default now()
);

create index if not exists profiles_trainer_code_idx on profiles(trainer_code);
create index if not exists students_user_id_idx on students(user_id);

alter table profiles enable row level security;
alter table students enable row level security;
alter table workout_plans enable row level security;
alter table diet_plans enable row level security;
alter table workout_history enable row level security;

create policy "profiles_select_own" on profiles
  for select using (id = auth.uid());
create policy "profiles_insert_own" on profiles
  for insert with check (id = auth.uid());
create policy "profiles_update_own" on profiles
  for update using (id = auth.uid());

create policy "profiles_select_by_trainer_code" on profiles
  for select using (trainer_code is not null);

create policy "students_trainer_all" on students
  for all using (trainer_id = auth.uid()) with check (trainer_id = auth.uid());

create policy "students_student_read" on students
  for select using (user_id = auth.uid());

create policy "workout_plans_trainer_all" on workout_plans
  for all using (trainer_id = auth.uid()) with check (trainer_id = auth.uid());

create policy "workout_plans_student_read" on workout_plans
  for select using (
    exists (
      select 1 from students s
      where s.id = workout_plans.student_id and s.user_id = auth.uid()
    )
  );

create policy "diet_plans_trainer_all" on diet_plans
  for all using (trainer_id = auth.uid()) with check (trainer_id = auth.uid());

create policy "diet_plans_student_read" on diet_plans
  for select using (
    exists (
      select 1 from students s
      where s.id = diet_plans.student_id and s.user_id = auth.uid()
    )
  );

create policy "workout_history_trainer_all" on workout_history
  for all using (trainer_id = auth.uid()) with check (trainer_id = auth.uid());

create policy "workout_history_student_all" on workout_history
  for all using (
    exists (
      select 1 from students s
      where s.id = workout_history.student_id and s.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from students s
      where s.id = workout_history.student_id and s.user_id = auth.uid()
    )
  );
