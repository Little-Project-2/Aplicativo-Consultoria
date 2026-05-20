-- Bucket e politicas para midia de perfil do treinador (avatar/capa)
-- Idempotente: pode ser executado varias vezes no SQL Editor.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'trainer-media',
  'trainer-media',
  false,
  10485760,
  array[
    'image/jpeg',
    'image/png',
    'image/webp',
    'image/heic',
    'image/heif'
  ]
)
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists trainer_media_storage_select_owner on storage.objects;
drop policy if exists trainer_media_storage_insert_owner on storage.objects;
drop policy if exists trainer_media_storage_update_owner on storage.objects;
drop policy if exists trainer_media_storage_delete_owner on storage.objects;

create policy trainer_media_storage_select_owner
  on storage.objects
  for select
  using (
    bucket_id = 'trainer-media'
    and auth.role() = 'authenticated'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy trainer_media_storage_insert_owner
  on storage.objects
  for insert
  with check (
    bucket_id = 'trainer-media'
    and auth.role() = 'authenticated'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy trainer_media_storage_update_owner
  on storage.objects
  for update
  using (
    bucket_id = 'trainer-media'
    and auth.role() = 'authenticated'
    and (storage.foldername(name))[1] = auth.uid()::text
  )
  with check (
    bucket_id = 'trainer-media'
    and auth.role() = 'authenticated'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy trainer_media_storage_delete_owner
  on storage.objects
  for delete
  using (
    bucket_id = 'trainer-media'
    and auth.role() = 'authenticated'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
