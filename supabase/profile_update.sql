-- Update profiles table for extended profile fields
alter table profiles
  add column if not exists avatar_url text,
  add column if not exists age int,
  add column if not exists weight numeric,
  add column if not exists height numeric,
  add column if not exists goal text,
  add column if not exists experience text,
  add column if not exists bio text,
  add column if not exists profile_complete boolean default false;
