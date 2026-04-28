-- Auth + Profile setup (idempotent)
-- Execute no SQL Editor do Supabase

create extension if not exists "pgcrypto";

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  role text not null default 'student',
  roles text[] not null default array['student']::text[],
  name text,
  avatar_url text,
  trainer_code text,
  connected_trainer_code text,
  anamnesis jsonb,
  profile_complete boolean not null default false,
  onboarding_step text not null default 'pending_verification',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.profiles add column if not exists role text not null default 'student';
alter table public.profiles add column if not exists roles text[] not null default array['student']::text[];
alter table public.profiles add column if not exists name text;
alter table public.profiles add column if not exists avatar_url text;
alter table public.profiles add column if not exists trainer_code text;
alter table public.profiles add column if not exists connected_trainer_code text;
alter table public.profiles add column if not exists anamnesis jsonb;
alter table public.profiles add column if not exists profile_complete boolean not null default false;
alter table public.profiles add column if not exists onboarding_step text not null default 'pending_verification';
alter table public.profiles add column if not exists created_at timestamptz not null default now();
alter table public.profiles add column if not exists updated_at timestamptz not null default now();

update public.profiles
set roles = array[
  case
    when lower(coalesce(role, '')) in ('trainer', 'treinador') then 'trainer'
    else 'student'
  end
]::text[]
where roles is null or cardinality(roles) = 0;

update public.profiles
set role = coalesce(role, roles[1], 'student')
where role is null or btrim(role) = '';

update public.profiles
set onboarding_step = case
  when onboarding_step in ('pending_verification', 'profile_setup', 'trainer_connect', 'done') then onboarding_step
  when profile_complete is not true then 'profile_setup'
  when coalesce(array_position(roles, 'student'), 0) > 0 and connected_trainer_code is null then 'trainer_connect'
  else 'done'
end;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'profiles_roles_allowed_check'
      and conrelid = 'public.profiles'::regclass
  ) then
    alter table public.profiles
      add constraint profiles_roles_allowed_check
      check (
        cardinality(roles) > 0
        and roles <@ array['trainer', 'student']::text[]
      );
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'profiles_onboarding_step_check'
      and conrelid = 'public.profiles'::regclass
  ) then
    alter table public.profiles
      add constraint profiles_onboarding_step_check
      check (onboarding_step in ('pending_verification', 'profile_setup', 'trainer_connect', 'done'));
  end if;
end $$;

create unique index if not exists profiles_trainer_code_unique_idx
  on public.profiles(trainer_code)
  where trainer_code is not null;

create index if not exists profiles_connected_trainer_code_idx
  on public.profiles(connected_trainer_code)
  where connected_trainer_code is not null;

create or replace function public.set_profiles_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_profiles_updated_at on public.profiles;
create trigger trg_profiles_updated_at
before update on public.profiles
for each row
execute function public.set_profiles_updated_at();

create or replace function public.generate_unique_trainer_code()
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_code text;
begin
  loop
    v_code := lpad((floor(random() * 100000)::int)::text, 5, '0');
    exit when v_code <> '00000'
      and not exists (select 1 from public.profiles where trainer_code = v_code);
  end loop;
  return v_code;
end;
$$;

revoke all on function public.generate_unique_trainer_code() from public;
revoke all on function public.generate_unique_trainer_code() from anon;
revoke all on function public.generate_unique_trainer_code() from authenticated;

create or replace function public.handle_auth_user_created()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_roles text[];
  v_role text;
  v_name text;
  v_trainer_code text;
begin
  select coalesce(
    array_agg(lower(v)) filter (where lower(v) in ('student', 'trainer')),
    array[]::text[]
  )
  into v_roles
  from jsonb_array_elements_text(coalesce(new.raw_user_meta_data -> 'roles', '[]'::jsonb)) as t(v);

  v_role := lower(coalesce(new.raw_user_meta_data ->> 'role', ''));
  if cardinality(v_roles) = 0 then
    if v_role in ('student', 'trainer') then
      v_roles := array[v_role];
    else
      v_roles := array['student'];
    end if;
  end if;

  v_name := nullif(btrim(coalesce(new.raw_user_meta_data ->> 'name', '')), '');
  v_trainer_code := case
    when array_position(v_roles, 'trainer') is not null then public.generate_unique_trainer_code()
    else null
  end;

  insert into public.profiles (
    id,
    role,
    roles,
    name,
    trainer_code,
    profile_complete,
    onboarding_step
  ) values (
    new.id,
    v_roles[1],
    v_roles,
    v_name,
    v_trainer_code,
    false,
    'pending_verification'
  )
  on conflict (id) do update
  set
    role = excluded.role,
    roles = excluded.roles,
    name = coalesce(public.profiles.name, excluded.name),
    trainer_code = coalesce(public.profiles.trainer_code, excluded.trainer_code),
    updated_at = now();

  return new;
end;
$$;

revoke all on function public.handle_auth_user_created() from public;
revoke all on function public.handle_auth_user_created() from anon;
revoke all on function public.handle_auth_user_created() from authenticated;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row
execute function public.handle_auth_user_created();

alter table public.profiles enable row level security;

revoke all on public.profiles from anon;
grant select, insert, update on public.profiles to authenticated;

drop policy if exists profiles_select_own on public.profiles;
drop policy if exists profiles_insert_own on public.profiles;
drop policy if exists profiles_update_own on public.profiles;

create policy profiles_select_own
on public.profiles
for select
to authenticated
using (id = auth.uid());

create policy profiles_insert_own
on public.profiles
for insert
to authenticated
with check (id = auth.uid());

create policy profiles_update_own
on public.profiles
for update
to authenticated
using (id = auth.uid())
with check (id = auth.uid());
