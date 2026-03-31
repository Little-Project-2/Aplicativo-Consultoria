-- Supabase schema for Consultoria (dev mode)
-- IMPORTANTE: estas policies permitem acesso amplo via anon para testes.

create extension if not exists pgcrypto;

-- Utility function to keep updated_at fresh
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- Trainers
create table if not exists public.trainers (
  code text primary key,
  name text not null,
  consultoria_name text,
  services text default 'treino',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

drop trigger if exists set_updated_at_trainers on public.trainers;
create trigger set_updated_at_trainers
before update on public.trainers
for each row execute function public.set_updated_at();

-- Students (stores full student JSON in data)
create table if not exists public.students (
  id text primary key,
  trainer_code text references public.trainers(code) on delete set null,
  auth_user_id text,
  data jsonb not null default '{}'::jsonb,
  updated_at timestamptz default now()
);

create index if not exists students_auth_user_id_idx on public.students(auth_user_id);

drop trigger if exists set_updated_at_students on public.students;
create trigger set_updated_at_students
before update on public.students
for each row execute function public.set_updated_at();

-- Workout history (each finalized workout)
create table if not exists public.workout_history (
  id uuid primary key default gen_random_uuid(),
  student_id text not null,
  trainer_code text,
  data jsonb not null default '{}'::jsonb,
  created_at timestamptz default now()
);

-- Trainer settings
create table if not exists public.trainer_settings (
  trainer_code text primary key,
  data jsonb not null default '{}'::jsonb,
  updated_at timestamptz default now()
);

drop trigger if exists set_updated_at_trainer_settings on public.trainer_settings;
create trigger set_updated_at_trainer_settings
before update on public.trainer_settings
for each row execute function public.set_updated_at();

-- Trainer notifications (chat/dúvidas)
create table if not exists public.trainer_notifications (
  id uuid primary key default gen_random_uuid(),
  trainer_code text not null,
  data jsonb not null default '{}'::jsonb,
  created_at timestamptz default now()
);

-- Messages (chat)
create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  sender_id text not null,
  receiver_id text not null,
  trainer_code text,
  content text,
  data jsonb default '{}'::jsonb,
  created_at timestamptz default now(),
  read boolean default false
);

-- Exercise catalog
create table if not exists public.exercise_catalog (
  id bigserial primary key,
  name text not null,
  group_name text,
  movement text,
  media_url text,
  trainer_code text,
  created_at timestamptz default now()
);

-- Workouts (optional normalized plan storage)
create table if not exists public.workouts (
  id uuid primary key default gen_random_uuid(),
  student_id text not null,
  trainer_code text,
  title text,
  exercises jsonb not null default '[]'::jsonb,
  updated_at timestamptz default now()
);

drop trigger if exists set_updated_at_workouts on public.workouts;
create trigger set_updated_at_workouts
before update on public.workouts
for each row execute function public.set_updated_at();

-- Diets (optional normalized plan storage)
create table if not exists public.diets (
  id uuid primary key default gen_random_uuid(),
  student_id text not null,
  trainer_code text,
  meals jsonb not null default '[]'::jsonb,
  updated_at timestamptz default now()
);

drop trigger if exists set_updated_at_diets on public.diets;
create trigger set_updated_at_diets
before update on public.diets
for each row execute function public.set_updated_at();

-- Personal records (optional normalized PR storage)
create table if not exists public.personal_records (
  student_id text not null,
  exercise text not null,
  max_weight numeric default 0,
  max_volume numeric default 0,
  max_reps integer default 0,
  max_one_rm numeric default 0,
  updated_at timestamptz default now(),
  primary key (student_id, exercise)
);

drop trigger if exists set_updated_at_personal_records on public.personal_records;
create trigger set_updated_at_personal_records
before update on public.personal_records
for each row execute function public.set_updated_at();

-- Profiles (for future Auth integration)
create table if not exists public.profiles (
  id uuid primary key,
  role text not null,
  name text,
  age integer,
  weight numeric,
  height numeric,
  goal text,
  status text default 'ativo',
  trainer_id uuid,
  avatar_url text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

drop trigger if exists set_updated_at_profiles on public.profiles;
create trigger set_updated_at_profiles
before update on public.profiles
for each row execute function public.set_updated_at();

-- Storage bucket (public for dev)
insert into storage.buckets (id, name, public)
values ('avatars_e_midias', 'avatars_e_midias', true)
on conflict (id) do nothing;

-- RLS: allow all (dev only)
alter table public.trainers enable row level security;
alter table public.students enable row level security;
alter table public.workout_history enable row level security;
alter table public.trainer_settings enable row level security;
alter table public.trainer_notifications enable row level security;
alter table public.messages enable row level security;
alter table public.exercise_catalog enable row level security;
alter table public.workouts enable row level security;
alter table public.diets enable row level security;
alter table public.personal_records enable row level security;
alter table public.profiles enable row level security;

create policy "allow_all_trainers" on public.trainers for all using (true) with check (true);
create policy "allow_all_students" on public.students for all using (true) with check (true);
create policy "allow_all_workout_history" on public.workout_history for all using (true) with check (true);
create policy "allow_all_trainer_settings" on public.trainer_settings for all using (true) with check (true);
create policy "allow_all_trainer_notifications" on public.trainer_notifications for all using (true) with check (true);
create policy "allow_all_messages" on public.messages for all using (true) with check (true);
create policy "allow_all_exercise_catalog" on public.exercise_catalog for all using (true) with check (true);
create policy "allow_all_workouts" on public.workouts for all using (true) with check (true);
create policy "allow_all_diets" on public.diets for all using (true) with check (true);
create policy "allow_all_personal_records" on public.personal_records for all using (true) with check (true);
create policy "allow_all_profiles" on public.profiles for all using (true) with check (true);

-- Storage policies (public read/write for dev)
create policy "allow_all_storage_objects"
on storage.objects for all
using (true) with check (true);
