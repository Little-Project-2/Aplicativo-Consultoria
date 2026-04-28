-- Student profile media gallery + storage policies
-- Safe to run multiple times (idempotent)

create table if not exists public.student_media_gallery (
  id uuid primary key default gen_random_uuid(),
  student_user_id uuid not null references auth.users(id) on delete cascade,
  trainer_code text,
  media_type text not null check (media_type in ('image', 'video')),
  storage_path text not null unique,
  caption text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.student_media_gallery
  add column if not exists trainer_code text;
alter table public.student_media_gallery
  add column if not exists caption text;
alter table public.student_media_gallery
  add column if not exists created_at timestamptz not null default now();
alter table public.student_media_gallery
  add column if not exists updated_at timestamptz not null default now();

alter table public.student_media_gallery
  drop constraint if exists student_media_gallery_media_type_check;
alter table public.student_media_gallery
  add constraint student_media_gallery_media_type_check
  check (media_type in ('image', 'video'));

create index if not exists idx_student_media_gallery_student on public.student_media_gallery(student_user_id, created_at desc);
create index if not exists idx_student_media_gallery_trainer on public.student_media_gallery(trainer_code, created_at desc);
create unique index if not exists idx_student_media_gallery_storage_path on public.student_media_gallery(storage_path);

alter table public.student_media_gallery enable row level security;

grant select, insert, update, delete on public.student_media_gallery to authenticated;

drop policy if exists student_media_gallery_select_own on public.student_media_gallery;
drop policy if exists student_media_gallery_insert_own on public.student_media_gallery;
drop policy if exists student_media_gallery_update_own on public.student_media_gallery;
drop policy if exists student_media_gallery_delete_own on public.student_media_gallery;
drop policy if exists student_media_gallery_select_trainer on public.student_media_gallery;

create policy student_media_gallery_select_own
  on public.student_media_gallery
  for select
  using (student_user_id = auth.uid());

create policy student_media_gallery_insert_own
  on public.student_media_gallery
  for insert
  with check (student_user_id = auth.uid());

create policy student_media_gallery_update_own
  on public.student_media_gallery
  for update
  using (student_user_id = auth.uid())
  with check (student_user_id = auth.uid());

create policy student_media_gallery_delete_own
  on public.student_media_gallery
  for delete
  using (student_user_id = auth.uid());

create policy student_media_gallery_select_trainer
  on public.student_media_gallery
  for select
  using (
    exists (
      select 1
      from public.student_connections sc
      join public.app_trainers t on t.code = sc.trainer_code
      where sc.student_user_id = student_media_gallery.student_user_id
        and sc.trainer_code = student_media_gallery.trainer_code
        and sc.status in ('pending', 'approved')
        and t.owner_id = auth.uid()
    )
  );

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'student-media',
  'student-media',
  false,
  31457280,
  array[
    'image/jpeg',
    'image/png',
    'image/webp',
    'image/heic',
    'image/heif',
    'video/mp4',
    'video/quicktime',
    'video/webm'
  ]
)
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists student_media_storage_select_own on storage.objects;
drop policy if exists student_media_storage_insert_own on storage.objects;
drop policy if exists student_media_storage_update_own on storage.objects;
drop policy if exists student_media_storage_delete_own on storage.objects;
drop policy if exists student_media_storage_select_trainer on storage.objects;

create policy student_media_storage_select_own
  on storage.objects
  for select
  using (
    bucket_id = 'student-media'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy student_media_storage_insert_own
  on storage.objects
  for insert
  with check (
    bucket_id = 'student-media'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy student_media_storage_update_own
  on storage.objects
  for update
  using (
    bucket_id = 'student-media'
    and (storage.foldername(name))[1] = auth.uid()::text
  )
  with check (
    bucket_id = 'student-media'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy student_media_storage_delete_own
  on storage.objects
  for delete
  using (
    bucket_id = 'student-media'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy student_media_storage_select_trainer
  on storage.objects
  for select
  using (
    bucket_id = 'student-media'
    and exists (
      select 1
      from public.student_media_gallery smg
      join public.student_connections sc on sc.student_user_id = smg.student_user_id and sc.trainer_code = smg.trainer_code
      join public.app_trainers t on t.code = sc.trainer_code
      where smg.storage_path = name
        and sc.status in ('pending', 'approved')
        and t.owner_id = auth.uid()
    )
  );

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'student_media_gallery'
  ) then
    alter publication supabase_realtime add table public.student_media_gallery;
  end if;
end $$;