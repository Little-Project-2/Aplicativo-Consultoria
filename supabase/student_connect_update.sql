-- Add trainer code + student linkage
alter table profiles
  add column if not exists trainer_code text,
  add column if not exists trainer_id uuid references profiles(id),
  add column if not exists connected_trainer_code text;

alter table students
  add column if not exists user_id uuid references auth.users;

create index if not exists profiles_trainer_code_idx on profiles(trainer_code);
