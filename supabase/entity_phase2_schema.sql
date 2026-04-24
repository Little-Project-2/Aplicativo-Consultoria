-- Phase 2 foundation: normalized entities for student diet/workout/connection data.
-- Non-breaking: keeps app_students as compatibility layer while frontend does dual-write.

create table if not exists public.student_profiles (
  student_user_id uuid primary key references auth.users(id) on delete cascade,
  student_local_id text,
  trainer_code text,
  profile_data jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

create table if not exists public.diet_logs (
  id bigserial primary key,
  student_user_id uuid not null references auth.users(id) on delete cascade,
  student_local_id text not null,
  log_date date not null,
  meal_idx int not null,
  item_idx int not null,
  checked boolean not null default false,
  qty text,
  amount numeric,
  unit_key text,
  portion_id uuid,
  portion_label text,
  substitute jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now(),
  unique (student_user_id, log_date, meal_idx, item_idx)
);

alter table public.diet_logs add column if not exists amount numeric;
alter table public.diet_logs add column if not exists unit_key text;
alter table public.diet_logs add column if not exists portion_id uuid;
alter table public.diet_logs add column if not exists portion_label text;
alter table public.diet_logs
  drop constraint if exists diet_logs_unit_key_check;
alter table public.diet_logs
  add constraint diet_logs_unit_key_check
  check (
    unit_key is null
    or unit_key in ('g', 'ml', 'un', 'slice', 'tbsp', 'tsp', 'cup', 'glass', 'ladle')
  );

create table if not exists public.workout_sessions (
  id text primary key,
  student_user_id uuid not null references auth.users(id) on delete cascade,
  student_local_id text,
  workout_title text,
  started_at timestamptz,
  finished_at timestamptz,
  duration_seconds int not null default 0,
  volume_total numeric not null default 0,
  feedback jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

create table if not exists public.workout_sets (
  id bigserial primary key,
  session_id text not null references public.workout_sessions(id) on delete cascade,
  exercise_index int not null,
  exercise_name text,
  set_index int not null,
  weight numeric,
  reps int,
  rpe numeric,
  execucao int,
  extra jsonb not null default '{}'::jsonb,
  completed_at timestamptz,
  updated_at timestamptz not null default now(),
  unique (session_id, exercise_index, set_index)
);

create table if not exists public.student_connections (
  student_user_id uuid not null references auth.users(id) on delete cascade,
  trainer_code text not null,
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  requested_at timestamptz not null default now(),
  decided_at timestamptz,
  updated_at timestamptz not null default now(),
  primary key (student_user_id, trainer_code)
);

create index if not exists idx_student_profiles_trainer_code on public.student_profiles(trainer_code);
create index if not exists idx_diet_logs_student_date on public.diet_logs(student_user_id, log_date desc);
create index if not exists idx_workout_sessions_student_finished on public.workout_sessions(student_user_id, finished_at desc);
create index if not exists idx_workout_sets_session on public.workout_sets(session_id);
create index if not exists idx_student_connections_trainer_code on public.student_connections(trainer_code);
create index if not exists idx_student_connections_status on public.student_connections(status);

alter table public.student_profiles enable row level security;
alter table public.diet_logs enable row level security;
alter table public.workout_sessions enable row level security;
alter table public.workout_sets enable row level security;
alter table public.student_connections enable row level security;

drop policy if exists student_profiles_select_own on public.student_profiles;
drop policy if exists student_profiles_upsert_own on public.student_profiles;
drop policy if exists student_profiles_select_trainer on public.student_profiles;

create policy student_profiles_select_own on public.student_profiles
  for select using (student_user_id = auth.uid());
create policy student_profiles_upsert_own on public.student_profiles
  for all using (student_user_id = auth.uid())
  with check (student_user_id = auth.uid());
create policy student_profiles_select_trainer on public.student_profiles
  for select using (
    exists (
      select 1
      from public.app_trainers t
      where t.code = student_profiles.trainer_code
        and t.owner_id = auth.uid()
    )
  );

drop policy if exists diet_logs_select_own on public.diet_logs;
drop policy if exists diet_logs_write_own on public.diet_logs;
drop policy if exists diet_logs_select_trainer on public.diet_logs;

create policy diet_logs_select_own on public.diet_logs
  for select using (student_user_id = auth.uid());
create policy diet_logs_write_own on public.diet_logs
  for all using (student_user_id = auth.uid())
  with check (student_user_id = auth.uid());
create policy diet_logs_select_trainer on public.diet_logs
  for select using (
    exists (
      select 1
      from public.student_connections sc
      join public.app_trainers t on t.code = sc.trainer_code
      where sc.student_user_id = diet_logs.student_user_id
        and sc.status in ('pending', 'approved')
        and t.owner_id = auth.uid()
    )
  );

drop policy if exists workout_sessions_select_own on public.workout_sessions;
drop policy if exists workout_sessions_write_own on public.workout_sessions;
drop policy if exists workout_sessions_select_trainer on public.workout_sessions;

create policy workout_sessions_select_own on public.workout_sessions
  for select using (student_user_id = auth.uid());
create policy workout_sessions_write_own on public.workout_sessions
  for all using (student_user_id = auth.uid())
  with check (student_user_id = auth.uid());
create policy workout_sessions_select_trainer on public.workout_sessions
  for select using (
    exists (
      select 1
      from public.student_connections sc
      join public.app_trainers t on t.code = sc.trainer_code
      where sc.student_user_id = workout_sessions.student_user_id
        and sc.status in ('pending', 'approved')
        and t.owner_id = auth.uid()
    )
  );

drop policy if exists workout_sets_select_own on public.workout_sets;
drop policy if exists workout_sets_write_own on public.workout_sets;
drop policy if exists workout_sets_select_trainer on public.workout_sets;

create policy workout_sets_select_own on public.workout_sets
  for select using (
    exists (
      select 1
      from public.workout_sessions ws
      where ws.id = workout_sets.session_id
        and ws.student_user_id = auth.uid()
    )
  );

create policy workout_sets_write_own on public.workout_sets
  for all using (
    exists (
      select 1
      from public.workout_sessions ws
      where ws.id = workout_sets.session_id
        and ws.student_user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1
      from public.workout_sessions ws
      where ws.id = workout_sets.session_id
        and ws.student_user_id = auth.uid()
    )
  );

create policy workout_sets_select_trainer on public.workout_sets
  for select using (
    exists (
      select 1
      from public.workout_sessions ws
      join public.student_connections sc on sc.student_user_id = ws.student_user_id
      join public.app_trainers t on t.code = sc.trainer_code
      where ws.id = workout_sets.session_id
        and sc.status in ('pending', 'approved')
        and t.owner_id = auth.uid()
    )
  );

drop policy if exists student_connections_select_own on public.student_connections;
drop policy if exists student_connections_insert_own on public.student_connections;
drop policy if exists student_connections_update_own on public.student_connections;
drop policy if exists student_connections_select_trainer on public.student_connections;
drop policy if exists student_connections_update_trainer on public.student_connections;

create policy student_connections_select_own on public.student_connections
  for select using (student_user_id = auth.uid());
create policy student_connections_insert_own on public.student_connections
  for insert with check (student_user_id = auth.uid());
create policy student_connections_update_own on public.student_connections
  for update using (student_user_id = auth.uid())
  with check (student_user_id = auth.uid());
create policy student_connections_select_trainer on public.student_connections
  for select using (
    exists (
      select 1
      from public.app_trainers t
      where t.code = student_connections.trainer_code
        and t.owner_id = auth.uid()
    )
  );
create policy student_connections_update_trainer on public.student_connections
  for update using (
    exists (
      select 1
      from public.app_trainers t
      where t.code = student_connections.trainer_code
        and t.owner_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1
      from public.app_trainers t
      where t.code = student_connections.trainer_code
        and t.owner_id = auth.uid()
    )
  );

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'student_connections'
  ) then
    alter publication supabase_realtime add table public.student_connections;
  end if;

  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'diet_logs'
  ) then
    alter publication supabase_realtime add table public.diet_logs;
  end if;

  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'workout_sessions'
  ) then
    alter publication supabase_realtime add table public.workout_sessions;
  end if;

  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'workout_sets'
  ) then
    alter publication supabase_realtime add table public.workout_sets;
  end if;
end $$;
