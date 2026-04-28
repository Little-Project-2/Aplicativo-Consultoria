-- Realtime + persistence schema used by public/script.js
-- Run this script in Supabase SQL editor.

create table if not exists public.app_trainers (
  code text primary key,
  owner_id uuid references auth.users(id),
  name text not null default 'Treinador',
  display_name text,
  consultoria_name text,
  services text default 'treino',
  headline text,
  bio text,
  avatar_url text,
  cover_url text,
  specialties jsonb not null default '[]'::jsonb,
  social_links jsonb not null default '{}'::jsonb,
  handle text,
  cta_label text,
  cta_url text,
  theme_preset text not null default 'neon-lime',
  onboarding_complete boolean not null default false,
  updated_at timestamptz not null default now()
);

alter table public.app_trainers
  add column if not exists owner_id uuid references auth.users(id);
alter table public.app_trainers
  add column if not exists display_name text;
alter table public.app_trainers
  add column if not exists headline text;
alter table public.app_trainers
  add column if not exists bio text;
alter table public.app_trainers
  add column if not exists avatar_url text;
alter table public.app_trainers
  add column if not exists cover_url text;
alter table public.app_trainers
  add column if not exists specialties jsonb not null default '[]'::jsonb;
alter table public.app_trainers
  add column if not exists social_links jsonb not null default '{}'::jsonb;
alter table public.app_trainers
  add column if not exists handle text;
alter table public.app_trainers
  add column if not exists cta_label text;
alter table public.app_trainers
  add column if not exists cta_url text;
alter table public.app_trainers
  add column if not exists theme_preset text not null default 'neon-lime';
alter table public.app_trainers
  add column if not exists onboarding_complete boolean not null default false;

update public.app_trainers t
set owner_id = p.id
from public.profiles p
where t.owner_id is null
  and p.trainer_code = t.code;

with dedupe_owner as (
  select
    code,
    owner_id,
    row_number() over (
      partition by owner_id
      order by updated_at desc nulls last, code asc
    ) as rn
  from public.app_trainers
  where owner_id is not null
)
update public.app_trainers t
set owner_id = null
from dedupe_owner d
where t.code = d.code
  and d.rn > 1;

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
  family_key text,
  variant_key text,
  variant_label text,
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

create table if not exists public.app_food_portions (
  id uuid primary key default gen_random_uuid(),
  food_id uuid not null references public.app_foods(id) on delete cascade,
  label text not null,
  amount numeric not null default 1,
  unit_key text not null,
  base_qty_equivalent numeric not null,
  is_default boolean not null default false,
  sort_order int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint app_food_portions_unit_key_check
    check (unit_key in ('g', 'ml', 'l', 'un', 'slice', 'tbsp', 'tsp', 'cup', 'glass', 'ladle')),
  constraint app_food_portions_amount_check check (amount > 0),
  constraint app_food_portions_base_qty_equivalent_check check (base_qty_equivalent > 0)
);

alter table public.app_foods add column if not exists family_key text;
alter table public.app_foods add column if not exists variant_key text;
alter table public.app_foods add column if not exists variant_label text;

do $$
begin
  if exists (
    select 1 from pg_constraint
    where conname = 'app_food_portions_unit_key_check'
      and conrelid = 'public.app_food_portions'::regclass
  ) then
    alter table public.app_food_portions
      drop constraint app_food_portions_unit_key_check;
  end if;
  alter table public.app_food_portions
    add constraint app_food_portions_unit_key_check
      check (unit_key in ('g', 'ml', 'l', 'un', 'slice', 'tbsp', 'tsp', 'cup', 'glass', 'ladle'));
end $$;

with food_seed(name, brand, base_qty, base_unit, kcal, protein, carb, fat, source) as (
    values
    ('Frango grelhado', null, 100, 'g', 165, 31, 0, 3.6, 'manual'),
    ('Frango desfiado', null, 100, 'g', 159, 30, 0, 3.1, 'manual'),
    ('Frango cozido', null, 100, 'g', 151, 28.6, 0, 3.0, 'manual'),
    ('Peito de peru', null, 100, 'g', 104, 17, 2, 1.2, 'manual'),
    ('Patinho moido', null, 100, 'g', 219, 26, 0, 11, 'manual'),
    ('Acem moido', null, 100, 'g', 250, 24, 0, 16, 'manual'),
    ('Contra-file grelhado', null, 100, 'g', 239, 26, 0, 14, 'manual'),
    ('Alcatra grelhada', null, 100, 'g', 220, 28, 0, 10, 'manual'),
    ('Musculo bovino cozido', null, 100, 'g', 212, 29, 0, 9, 'manual'),
    ('Lombo suino assado', null, 100, 'g', 242, 27, 0, 14, 'manual'),
    ('Pernil suino assado', null, 100, 'g', 234, 26, 0, 13, 'manual'),
    ('File de tilapia', null, 100, 'g', 129, 26, 0, 2.7, 'manual'),
    ('Sardinha grelhada', null, 100, 'g', 208, 24, 0, 12, 'manual'),
    ('Atum em agua', null, 100, 'g', 116, 26, 0, 1, 'manual'),
    ('Salmao grelhado', null, 100, 'g', 208, 25, 0, 13, 'manual'),
    ('Pescada assada', null, 100, 'g', 120, 24, 0, 2.2, 'manual'),
    ('Camarao cozido', null, 100, 'g', 99, 24, 0.2, 0.3, 'manual'),
    ('Ovo cozido', null, 100, 'g', 155, 13, 1.1, 11, 'manual'),
    ('Clara de ovo', null, 100, 'g', 52, 11, 0.7, 0.2, 'manual'),
    ('Omelete simples', null, 100, 'g', 154, 10, 2, 11, 'manual'),
    ('Queijo cottage', null, 100, 'g', 98, 11, 3.4, 4.3, 'manual'),
    ('Queijo minas frescal', null, 100, 'g', 264, 17, 3.2, 20, 'manual'),
    ('Iogurte grego natural', null, 100, 'g', 97, 9, 4, 5, 'manual'),
    ('Iogurte natural desnatado', null, 100, 'g', 41, 3.8, 5.6, 0.1, 'manual'),
    ('Tofu firme', null, 100, 'g', 76, 8, 1.9, 4.8, 'manual'),
    ('Tempeh', null, 100, 'g', 193, 20, 9, 11, 'manual'),
    ('Seitan', null, 100, 'g', 121, 25, 4, 1.9, 'manual'),
    ('Carne seca dessalgada', null, 100, 'g', 250, 32, 0, 13, 'manual'),
    ('Presunto magro', null, 100, 'g', 120, 18, 2, 4, 'manual'),
    ('Mortadela de frango', null, 100, 'g', 170, 14, 2, 12, 'manual'),
    ('Linguica de frango', null, 100, 'g', 247, 17, 2, 19, 'manual'),
    ('Bacalhau cozido', null, 100, 'g', 105, 23, 0, 0.9, 'manual'),
    ('Carne moida magra', null, 100, 'g', 176, 27, 0, 7, 'manual'),
    ('Hamburguer caseiro bovino', null, 100, 'g', 235, 20, 4, 15, 'manual'),
    ('Frango empanado assado', null, 100, 'g', 210, 20, 12, 10, 'manual'),
    ('Arroz branco cozido', null, 100, 'g', 130, 2.7, 28, 0.3, 'manual'),
    ('Arroz integral cozido', null, 100, 'g', 124, 2.6, 25.8, 1, 'manual'),
    ('Arroz parboilizado cozido', null, 100, 'g', 123, 2.9, 26, 0.4, 'manual'),
    ('Arroz 7 graos cozido', null, 100, 'g', 119, 3, 24, 1.5, 'manual'),
    ('Feijao carioca cozido', null, 100, 'g', 76, 4.8, 13.6, 0.5, 'manual'),
    ('Feijao preto cozido', null, 100, 'g', 77, 4.5, 14, 0.5, 'manual'),
    ('Feijao fradinho cozido', null, 100, 'g', 83, 5, 14, 0.6, 'manual'),
    ('Lentilha cozida', null, 100, 'g', 116, 9, 20, 0.4, 'manual'),
    ('Grao de bico cozido', null, 100, 'g', 164, 8.9, 27, 2.6, 'manual'),
    ('Ervilha cozida', null, 100, 'g', 84, 5.4, 15, 0.4, 'manual'),
    ('Macarrao cozido', null, 100, 'g', 157, 5.8, 30.9, 0.9, 'manual'),
    ('Macarrao integral cozido', null, 100, 'g', 149, 5.5, 28.5, 1.1, 'manual'),
    ('Batata inglesa cozida', null, 100, 'g', 86, 1.9, 20, 0.1, 'manual'),
    ('Batata doce cozida', null, 100, 'g', 77, 0.6, 18.4, 0.1, 'manual'),
    ('Batata baroa cozida', null, 100, 'g', 80, 1, 18.2, 0.1, 'manual'),
    ('Mandioca cozida', null, 100, 'g', 125, 0.6, 30.1, 0.3, 'manual'),
    ('Inhame cozido', null, 100, 'g', 97, 2, 23, 0.2, 'manual'),
    ('Mandioquinha cozida', null, 100, 'g', 80, 1, 18, 0.1, 'manual'),
    ('Abobora cabotia cozida', null, 100, 'g', 48, 1.4, 11, 0.1, 'manual'),
    ('Aveia em flocos', null, 100, 'g', 389, 16.9, 66.3, 6.9, 'manual'),
    ('Granola tradicional', null, 100, 'g', 420, 10, 64, 14, 'manual'),
    ('Pao frances', null, 100, 'g', 300, 8, 58, 3.1, 'manual'),
    ('Pao integral', null, 100, 'g', 247, 13, 41, 4.2, 'manual'),
    ('Tapioca hidratada', null, 100, 'g', 330, 0.2, 82, 0, 'manual'),
    ('Cuscuz de milho cozido', null, 100, 'g', 112, 2.4, 25, 0.7, 'manual'),
    ('Farofa pronta', null, 100, 'g', 421, 2.7, 73, 14, 'manual'),
    ('Farinha de aveia', null, 100, 'g', 404, 14, 66, 9, 'manual'),
    ('Farinha de mandioca', null, 100, 'g', 365, 1.6, 89, 0.3, 'manual'),
    ('Quinoa cozida', null, 100, 'g', 120, 4.4, 21.3, 1.9, 'manual'),
    ('Amaranto cozido', null, 100, 'g', 102, 3.8, 19, 1.6, 'manual'),
    ('Milho cozido', null, 100, 'g', 98, 3.4, 21, 1.5, 'manual'),
    ('Pipoca sem oleo', null, 100, 'g', 387, 13, 78, 4.5, 'manual'),
    ('Banana passa', null, 100, 'g', 290, 3.9, 75, 0.4, 'manual'),
    ('Mel', null, 100, 'g', 304, 0.3, 82, 0, 'manual'),
    ('Rapadura', null, 100, 'g', 356, 0.5, 88, 0.1, 'manual'),
    ('Banana prata', null, 100, 'g', 98, 1.3, 26, 0.1, 'manual'),
    ('Banana nanica', null, 100, 'g', 92, 1.2, 23.9, 0.2, 'manual'),
    ('Banana da terra', null, 100, 'g', 122, 1.4, 31.9, 0.2, 'manual'),
    ('Maca', null, 100, 'g', 52, 0.3, 14, 0.2, 'manual'),
    ('Pera', null, 100, 'g', 58, 0.4, 15, 0.1, 'manual'),
    ('Laranja pera', null, 100, 'g', 47, 0.9, 11.8, 0.1, 'manual'),
    ('Laranja lima', null, 100, 'g', 46, 0.8, 11.5, 0.1, 'manual'),
    ('Tangerina', null, 100, 'g', 53, 0.8, 13.3, 0.3, 'manual'),
    ('Uva', null, 100, 'g', 69, 0.7, 18, 0.2, 'manual'),
    ('Abacaxi', null, 100, 'g', 50, 0.5, 13, 0.1, 'manual'),
    ('Mamao formosa', null, 100, 'g', 45, 0.7, 11.3, 0.1, 'manual'),
    ('Mamao papaia', null, 100, 'g', 43, 0.5, 10.8, 0.3, 'manual'),
    ('Manga', null, 100, 'g', 60, 0.8, 15, 0.4, 'manual'),
    ('Melancia', null, 100, 'g', 30, 0.6, 7.6, 0.2, 'manual'),
    ('Melao', null, 100, 'g', 34, 0.8, 8.2, 0.2, 'manual'),
    ('Kiwi', null, 100, 'g', 61, 1.1, 15, 0.5, 'manual'),
    ('Morango', null, 100, 'g', 32, 0.7, 7.7, 0.3, 'manual'),
    ('Amora', null, 100, 'g', 43, 1.4, 9.6, 0.5, 'manual'),
    ('Mirtilo', null, 100, 'g', 57, 0.7, 14.5, 0.3, 'manual'),
    ('Cereja', null, 100, 'g', 50, 1, 12, 0.3, 'manual'),
    ('Abacate', null, 100, 'g', 160, 2, 8.5, 14.7, 'manual'),
    ('Coco seco', null, 100, 'g', 354, 3.3, 15, 33.5, 'manual'),
    ('Coco verde polpa', null, 100, 'g', 192, 2.4, 7.2, 18, 'manual'),
    ('Acerola', null, 100, 'g', 33, 0.9, 8, 0.2, 'manual'),
    ('Goiaba', null, 100, 'g', 68, 2.6, 14.3, 1, 'manual'),
    ('Caqui', null, 100, 'g', 70, 0.6, 18, 0.2, 'manual'),
    ('Figo', null, 100, 'g', 74, 0.8, 19, 0.3, 'manual'),
    ('Ameixa', null, 100, 'g', 46, 0.7, 11.4, 0.3, 'manual'),
    ('Pessego', null, 100, 'g', 39, 0.9, 10, 0.3, 'manual'),
    ('Nectarina', null, 100, 'g', 44, 1.1, 11, 0.3, 'manual'),
    ('Maracuja', null, 100, 'g', 68, 2.2, 13, 2.1, 'manual'),
    ('Jabuticaba', null, 100, 'g', 58, 0.6, 15, 0.1, 'manual'),
    ('Caju', null, 100, 'g', 43, 0.8, 10.3, 0.2, 'manual'),
    ('Fruta do conde', null, 100, 'g', 94, 2.1, 23.6, 0.6, 'manual'),
    ('Pitaya', null, 100, 'g', 50, 1.1, 11, 0.4, 'manual'),
    ('Brocolis cozido', null, 100, 'g', 35, 2.4, 7.2, 0.4, 'manual'),
    ('Couve-flor cozida', null, 100, 'g', 25, 1.9, 5, 0.3, 'manual'),
    ('Couve manteiga refogada', null, 100, 'g', 90, 2.7, 8.7, 5.4, 'manual'),
    ('Espinafre cozido', null, 100, 'g', 23, 2.9, 3.8, 0.4, 'manual'),
    ('Alface americana', null, 100, 'g', 14, 0.9, 2.9, 0.1, 'manual'),
    ('Rucula', null, 100, 'g', 25, 2.6, 3.7, 0.7, 'manual'),
    ('Agriao', null, 100, 'g', 23, 2.3, 3.4, 0.1, 'manual'),
    ('Repolho cru', null, 100, 'g', 25, 1.3, 5.8, 0.1, 'manual'),
    ('Repolho roxo cru', null, 100, 'g', 31, 1.4, 7.4, 0.2, 'manual'),
    ('Cenoura cozida', null, 100, 'g', 35, 0.8, 8.2, 0.2, 'manual'),
    ('Beterraba cozida', null, 100, 'g', 44, 1.7, 10, 0.2, 'manual'),
    ('Abobrinha cozida', null, 100, 'g', 17, 1.2, 3.1, 0.3, 'manual'),
    ('Berinjela cozida', null, 100, 'g', 35, 0.8, 8.7, 0.2, 'manual'),
    ('Pepino cru', null, 100, 'g', 15, 0.7, 3.6, 0.1, 'manual'),
    ('Tomate cru', null, 100, 'g', 18, 0.9, 3.9, 0.2, 'manual'),
    ('Pimentao verde', null, 100, 'g', 20, 0.9, 4.6, 0.2, 'manual'),
    ('Pimentao vermelho', null, 100, 'g', 31, 1, 6, 0.3, 'manual'),
    ('Cebola crua', null, 100, 'g', 40, 1.1, 9.3, 0.1, 'manual'),
    ('Alho cru', null, 100, 'g', 149, 6.4, 33, 0.5, 'manual'),
    ('Vagem cozida', null, 100, 'g', 35, 1.9, 7.9, 0.1, 'manual'),
    ('Quiabo cozido', null, 100, 'g', 33, 1.9, 7.5, 0.2, 'manual'),
    ('Chuchu cozido', null, 100, 'g', 19, 0.4, 4.8, 0.1, 'manual'),
    ('Palmito pupunha', null, 100, 'g', 36, 2.5, 6.6, 0.4, 'manual'),
    ('Aspargo cozido', null, 100, 'g', 22, 2.4, 4.1, 0.2, 'manual'),
    ('Ervilha torta', null, 100, 'g', 42, 2.8, 7.6, 0.2, 'manual'),
    ('Nabo cozido', null, 100, 'g', 22, 0.7, 5.1, 0.1, 'manual'),
    ('Rabanete', null, 100, 'g', 16, 0.7, 3.4, 0.1, 'manual'),
    ('Couve de bruxelas', null, 100, 'g', 43, 3.4, 9, 0.3, 'manual'),
    ('Alho poro', null, 100, 'g', 61, 1.5, 14, 0.3, 'manual'),
    ('Salsao', null, 100, 'g', 16, 0.7, 3, 0.2, 'manual'),
    ('Cogumelo champignon', null, 100, 'g', 22, 3.1, 3.3, 0.3, 'manual'),
    ('Shimeji', null, 100, 'g', 34, 2.5, 5.2, 0.2, 'manual'),
    ('Shiitake', null, 100, 'g', 34, 2.2, 6.8, 0.5, 'manual'),
    ('Seleta de legumes', null, 100, 'g', 65, 2.2, 12, 0.6, 'manual'),
    ('Vinagrete', null, 100, 'g', 45, 1, 8, 1.7, 'manual'),
    ('Leite integral', null, 100, 'ml', 61, 3.2, 4.8, 3.3, 'manual'),
    ('Leite desnatado', null, 100, 'ml', 34, 3.4, 5, 0.1, 'manual'),
    ('Bebida vegetal de aveia', null, 100, 'ml', 45, 1, 7, 1.5, 'manual'),
    ('Bebida vegetal de amendoa', null, 100, 'ml', 17, 0.6, 0.3, 1.1, 'manual'),
    ('Iogurte proteico', null, 100, 'g', 65, 10, 4, 1.5, 'manual'),
    ('Queijo mucarela', null, 100, 'g', 280, 22, 3, 21, 'manual'),
    ('Queijo parmesao', null, 100, 'g', 392, 35, 3.2, 26, 'manual'),
    ('Ricota', null, 100, 'g', 174, 11.3, 3, 13, 'manual'),
    ('Requeijao light', null, 100, 'g', 192, 9.7, 6, 14, 'manual'),
    ('Cream cheese light', null, 100, 'g', 145, 8, 6, 10, 'manual'),
    ('Manteiga', null, 100, 'g', 717, 0.9, 0.1, 81, 'manual'),
    ('Margarina', null, 100, 'g', 717, 0.2, 0.7, 81, 'manual'),
    ('Azeite de oliva', null, 100, 'g', 884, 0, 0, 100, 'manual'),
    ('Oleo de coco', null, 100, 'g', 862, 0, 0, 100, 'manual'),
    ('Oleo de soja', null, 100, 'g', 884, 0, 0, 100, 'manual'),
    ('Maionese tradicional', null, 100, 'g', 680, 1, 1, 75, 'manual'),
    ('Pasta de amendoim integral', null, 100, 'g', 588, 25, 20, 50, 'manual'),
    ('Amendoim torrado', null, 100, 'g', 567, 25.8, 16, 49, 'manual'),
    ('Castanha de caju', null, 100, 'g', 553, 18, 30, 44, 'manual'),
    ('Castanha do para', null, 100, 'g', 656, 14, 12, 66, 'manual'),
    ('Nozes', null, 100, 'g', 654, 15, 14, 65, 'manual'),
    ('Amendoa', null, 100, 'g', 579, 21, 22, 50, 'manual'),
    ('Pistache', null, 100, 'g', 560, 20, 28, 45, 'manual'),
    ('Semente de chia', null, 100, 'g', 486, 17, 42, 31, 'manual'),
    ('Semente de linhaca', null, 100, 'g', 534, 18, 29, 42, 'manual'),
    ('Cafe sem acucar', null, 100, 'ml', 2, 0.3, 0, 0, 'manual'),
    ('Cha verde sem acucar', null, 100, 'ml', 1, 0, 0.2, 0, 'manual'),
    ('Suco de laranja natural', null, 100, 'ml', 45, 0.7, 10.4, 0.2, 'manual'),
    ('Suco de uva integral', null, 100, 'ml', 60, 0.4, 14.5, 0.1, 'manual'),
    ('Agua de coco', null, 100, 'ml', 19, 0.7, 3.7, 0.2, 'manual'),
    ('Refrigerante zero', null, 100, 'ml', 1, 0, 0, 0, 'manual'),
    ('Chocolate 70%', null, 100, 'g', 598, 8, 46, 43, 'manual'),
    ('Cacau em po 100%', null, 100, 'g', 228, 19, 58, 14, 'manual'),
    ('Achocolatado em po', null, 100, 'g', 380, 5, 84, 3, 'manual'),
    ('Whey protein concentrado', null, 100, 'g', 400, 80, 8, 6, 'manual')
)
insert into public.app_foods(name, brand, base_qty, base_unit, kcal, protein, carb, fat, source)
select fs.name, fs.brand, fs.base_qty, fs.base_unit, fs.kcal, fs.protein, fs.carb, fs.fat, fs.source
from food_seed fs
where not exists (
    select 1
    from public.app_foods af
    where lower(af.name) = lower(fs.name)
      and coalesce(lower(af.brand), '') = coalesce(lower(fs.brand), '')
      and af.base_unit = fs.base_unit
);

-- Famílias e variantes principais (TACO/TBCA) para seleção de tipo no app
with principal_variant_seed(name, brand, family_key, variant_key, variant_label, base_qty, base_unit, kcal, protein, carb, fat, source) as (
  values
    ('Arroz branco cozido', null, 'rice', 'white', 'Branco', 100, 'g', 128, 2.5, 28.1, 0.2, 'baseline'),
    ('Arroz integral cozido', null, 'rice', 'brown', 'Integral', 100, 'g', 124, 2.6, 25.8, 1.0, 'baseline'),
    ('Feijao carioca cozido', null, 'beans', 'carioca', 'Carioca', 100, 'g', 76, 4.8, 13.6, 0.5, 'baseline'),
    ('Feijao preto cozido', null, 'beans', 'black', 'Preto', 100, 'g', 77, 4.5, 14.0, 0.5, 'baseline'),
    ('Leite integral', null, 'milk', 'whole', 'Integral', 100, 'ml', 61, 3.2, 4.7, 3.3, 'baseline'),
    ('Leite semidesnatado', null, 'milk', 'semi', 'Semi', 100, 'ml', 45, 3.2, 4.8, 1.5, 'baseline'),
    ('Leite desnatado', null, 'milk', 'skim', 'Desnatado', 100, 'ml', 34, 3.4, 5.0, 0.1, 'baseline'),
    ('Refrigerante normal', null, 'soda', 'regular', 'Normal', 100, 'ml', 42, 0, 10.6, 0, 'baseline'),
    ('Refrigerante zero', null, 'soda', 'zero', 'Zero', 100, 'ml', 1, 0, 0, 0, 'baseline'),
    ('Agua mineral sem gas', null, 'water', 'still', 'Sem gás', 100, 'ml', 0, 0, 0, 0, 'baseline'),
    ('Agua mineral com gas', null, 'water', 'sparkling', 'Com gás', 100, 'ml', 0, 0, 0, 0, 'baseline'),
    ('Iogurte natural', null, 'yogurt', 'natural', 'Natural', 100, 'g', 61, 3.5, 4.7, 3.3, 'baseline'),
    ('Iogurte grego natural', null, 'yogurt', 'greek', 'Grego', 100, 'g', 97, 9.0, 4.0, 5.0, 'baseline'),
    ('Iogurte natural desnatado', null, 'yogurt', 'skim', 'Desnatado', 100, 'g', 42, 3.8, 5.2, 0.1, 'baseline'),
    ('Pao frances', null, 'bread', 'french', 'Francês', 100, 'g', 300, 8.0, 58.6, 3.1, 'baseline'),
    ('Pao integral', null, 'bread', 'whole', 'Integral', 100, 'g', 253, 9.4, 43.0, 3.4, 'baseline'),
    ('Queijo mucarela', null, 'cheese', 'mozzarella', 'Muçarela', 100, 'g', 300, 22.6, 3.0, 22.0, 'baseline'),
    ('Queijo minas frescal', null, 'cheese', 'minas', 'Minas', 100, 'g', 264, 17.0, 3.2, 20.0, 'baseline'),
    ('Queijo cottage', null, 'cheese', 'cottage', 'Cottage', 100, 'g', 98, 11.0, 3.4, 4.3, 'baseline'),
    ('Suco de laranja natural', null, 'juice', 'natural', 'Natural', 100, 'ml', 45, 0.7, 10.4, 0.2, 'baseline'),
    ('Suco integral de uva', null, 'juice', 'integral', 'Integral', 100, 'ml', 60, 0.4, 14.5, 0.1, 'baseline'),
    ('Suco zero', null, 'juice', 'zero', 'Zero', 100, 'ml', 2, 0, 0, 0, 'baseline'),
    ('Cafe sem acucar', null, 'hot_drink', 'coffee_black', 'Café sem açúcar', 100, 'ml', 2, 0.3, 0, 0, 'baseline'),
    ('Cafe com leite', null, 'hot_drink', 'coffee_milk', 'Café com leite', 100, 'ml', 41, 2.0, 4.0, 1.5, 'baseline'),
    ('Cha sem acucar', null, 'hot_drink', 'tea_unsweetened', 'Chá sem açúcar', 100, 'ml', 1, 0, 0.2, 0, 'baseline')
)
insert into public.app_foods(name, brand, family_key, variant_key, variant_label, base_qty, base_unit, kcal, protein, carb, fat, source)
select p.name, p.brand, p.family_key, p.variant_key, p.variant_label, p.base_qty, p.base_unit, p.kcal, p.protein, p.carb, p.fat, p.source
from principal_variant_seed p
where not exists (
  select 1
  from public.app_foods af
  where lower(af.name) = lower(p.name)
    and coalesce(lower(af.brand), '') = coalesce(lower(p.brand), '')
    and af.base_unit = p.base_unit
);

with principal_variant_seed(name, brand, family_key, variant_key, variant_label, base_qty, base_unit, kcal, protein, carb, fat, source) as (
  values
    ('Arroz branco cozido', null, 'rice', 'white', 'Branco', 100, 'g', 128, 2.5, 28.1, 0.2, 'baseline'),
    ('Arroz integral cozido', null, 'rice', 'brown', 'Integral', 100, 'g', 124, 2.6, 25.8, 1.0, 'baseline'),
    ('Feijao carioca cozido', null, 'beans', 'carioca', 'Carioca', 100, 'g', 76, 4.8, 13.6, 0.5, 'baseline'),
    ('Feijao preto cozido', null, 'beans', 'black', 'Preto', 100, 'g', 77, 4.5, 14.0, 0.5, 'baseline'),
    ('Leite integral', null, 'milk', 'whole', 'Integral', 100, 'ml', 61, 3.2, 4.7, 3.3, 'baseline'),
    ('Leite semidesnatado', null, 'milk', 'semi', 'Semi', 100, 'ml', 45, 3.2, 4.8, 1.5, 'baseline'),
    ('Leite desnatado', null, 'milk', 'skim', 'Desnatado', 100, 'ml', 34, 3.4, 5.0, 0.1, 'baseline'),
    ('Refrigerante normal', null, 'soda', 'regular', 'Normal', 100, 'ml', 42, 0, 10.6, 0, 'baseline'),
    ('Refrigerante zero', null, 'soda', 'zero', 'Zero', 100, 'ml', 1, 0, 0, 0, 'baseline'),
    ('Agua mineral sem gas', null, 'water', 'still', 'Sem gás', 100, 'ml', 0, 0, 0, 0, 'baseline'),
    ('Agua mineral com gas', null, 'water', 'sparkling', 'Com gás', 100, 'ml', 0, 0, 0, 0, 'baseline'),
    ('Iogurte natural', null, 'yogurt', 'natural', 'Natural', 100, 'g', 61, 3.5, 4.7, 3.3, 'baseline'),
    ('Iogurte grego natural', null, 'yogurt', 'greek', 'Grego', 100, 'g', 97, 9.0, 4.0, 5.0, 'baseline'),
    ('Iogurte natural desnatado', null, 'yogurt', 'skim', 'Desnatado', 100, 'g', 42, 3.8, 5.2, 0.1, 'baseline'),
    ('Pao frances', null, 'bread', 'french', 'Francês', 100, 'g', 300, 8.0, 58.6, 3.1, 'baseline'),
    ('Pao integral', null, 'bread', 'whole', 'Integral', 100, 'g', 253, 9.4, 43.0, 3.4, 'baseline'),
    ('Queijo mucarela', null, 'cheese', 'mozzarella', 'Muçarela', 100, 'g', 300, 22.6, 3.0, 22.0, 'baseline'),
    ('Queijo minas frescal', null, 'cheese', 'minas', 'Minas', 100, 'g', 264, 17.0, 3.2, 20.0, 'baseline'),
    ('Queijo cottage', null, 'cheese', 'cottage', 'Cottage', 100, 'g', 98, 11.0, 3.4, 4.3, 'baseline'),
    ('Suco de laranja natural', null, 'juice', 'natural', 'Natural', 100, 'ml', 45, 0.7, 10.4, 0.2, 'baseline'),
    ('Suco integral de uva', null, 'juice', 'integral', 'Integral', 100, 'ml', 60, 0.4, 14.5, 0.1, 'baseline'),
    ('Suco zero', null, 'juice', 'zero', 'Zero', 100, 'ml', 2, 0, 0, 0, 'baseline'),
    ('Cafe sem acucar', null, 'hot_drink', 'coffee_black', 'Café sem açúcar', 100, 'ml', 2, 0.3, 0, 0, 'baseline'),
    ('Cafe com leite', null, 'hot_drink', 'coffee_milk', 'Café com leite', 100, 'ml', 41, 2.0, 4.0, 1.5, 'baseline'),
    ('Cha sem acucar', null, 'hot_drink', 'tea_unsweetened', 'Chá sem açúcar', 100, 'ml', 1, 0, 0.2, 0, 'baseline')
)
update public.app_foods af
set
  family_key = p.family_key,
  variant_key = p.variant_key,
  variant_label = p.variant_label,
  base_qty = p.base_qty,
  base_unit = p.base_unit,
  kcal = p.kcal,
  protein = p.protein,
  carb = p.carb,
  fat = p.fat,
  source = p.source,
  updated_at = now()
from principal_variant_seed p
where lower(af.name) = lower(p.name)
  and coalesce(lower(af.brand), '') = coalesce(lower(p.brand), '')
  and af.base_unit = p.base_unit;

-- Porções padrão para medidas inteligentes (idempotente)
insert into public.app_food_portions(food_id, label, amount, unit_key, base_qty_equivalent, is_default, sort_order)
select
  f.id,
  case
    when f.base_unit = 'ml' then 'mililitro (ml)'
    when f.base_unit = 'un' then 'unidade'
    else 'grama (g)'
  end as label,
  1 as amount,
  case
    when f.base_unit = 'ml' then 'ml'
    when f.base_unit = 'un' then 'un'
    else 'g'
  end as unit_key,
  1 as base_qty_equivalent,
  true as is_default,
  0 as sort_order
from public.app_foods f
where not exists (
  select 1
  from public.app_food_portions p
  where p.food_id = f.id
    and lower(p.label) = lower(
      case
        when f.base_unit = 'ml' then 'mililitro (ml)'
        when f.base_unit = 'un' then 'unidade'
        else 'grama (g)'
      end
    )
);

insert into public.app_food_portions(food_id, label, amount, unit_key, base_qty_equivalent, is_default, sort_order)
select f.id, 'colher de chá', 1, 'tsp', 5, false, 10
from public.app_foods f
where f.base_unit = 'ml'
  and not exists (
    select 1 from public.app_food_portions p
    where p.food_id = f.id and lower(p.label) = lower('colher de chá')
  );

insert into public.app_food_portions(food_id, label, amount, unit_key, base_qty_equivalent, is_default, sort_order)
select f.id, 'litro (l)', 1, 'l', 1000, false, 8
from public.app_foods f
where f.base_unit = 'ml'
  and not exists (
    select 1 from public.app_food_portions p
    where p.food_id = f.id and lower(p.label) = lower('litro (l)')
  );

insert into public.app_food_portions(food_id, label, amount, unit_key, base_qty_equivalent, is_default, sort_order)
select f.id, 'colher de sopa', 1, 'tbsp', 15, false, 20
from public.app_foods f
where f.base_unit = 'ml'
  and not exists (
    select 1 from public.app_food_portions p
    where p.food_id = f.id and lower(p.label) = lower('colher de sopa')
  );

insert into public.app_food_portions(food_id, label, amount, unit_key, base_qty_equivalent, is_default, sort_order)
select f.id, 'xícara', 1, 'cup', 240, false, 30
from public.app_foods f
where f.base_unit = 'ml'
  and not exists (
    select 1 from public.app_food_portions p
    where p.food_id = f.id and lower(p.label) = lower('xícara')
  );

insert into public.app_food_portions(food_id, label, amount, unit_key, base_qty_equivalent, is_default, sort_order)
select f.id, 'copo', 1, 'glass', 200, false, 40
from public.app_foods f
where f.base_unit = 'ml'
  and not exists (
    select 1 from public.app_food_portions p
    where p.food_id = f.id and lower(p.label) = lower('copo')
  );

insert into public.app_food_portions(food_id, label, amount, unit_key, base_qty_equivalent, is_default, sort_order)
select f.id, 'concha', 1, 'ladle', 100, false, 50
from public.app_foods f
where f.base_unit = 'ml'
  and not exists (
    select 1 from public.app_food_portions p
    where p.food_id = f.id and lower(p.label) = lower('concha')
  );

insert into public.app_food_portions(food_id, label, amount, unit_key, base_qty_equivalent, is_default, sort_order)
select f.id, 'fatia', 1, 'slice', 25, false, 15
from public.app_foods f
where lower(f.name) like '%pao%'
  and not exists (
    select 1 from public.app_food_portions p
    where p.food_id = f.id and lower(p.label) = lower('fatia')
  );

-- Unidade para ovos e frutas principais
insert into public.app_food_portions(food_id, label, amount, unit_key, base_qty_equivalent, is_default, sort_order)
select
  f.id,
  'unidade',
  1,
  'un',
  case
    when lower(f.name) like '%ovo%' then 50
    when lower(f.name) like '%banana%' then 90
    when lower(f.name) like '%maca%' then 130
    when lower(f.name) like '%pera%' then 140
    when lower(f.name) like '%laranja%' then 130
    when lower(f.name) like '%tangerina%' then 120
    when lower(f.name) like '%kiwi%' then 75
    when lower(f.name) like '%abacate%' then 150
    when lower(f.name) like '%manga%' then 150
    else greatest(1, coalesce(f.base_qty, 100))
  end as base_qty_equivalent,
  false,
  12
from public.app_foods f
where f.base_unit = 'g'
  and lower(f.name) ~ '(ovo|banana|maca|pera|laranja|tangerina|kiwi|abacate|manga|goiaba)'
  and not exists (
    select 1 from public.app_food_portions p
    where p.food_id = f.id and lower(p.label) = lower('unidade')
  );

-- Colheres/xicara/concha para carboidratos e leguminosas cozidas
insert into public.app_food_portions(food_id, label, amount, unit_key, base_qty_equivalent, is_default, sort_order)
select f.id, 'colher de sopa', 1, 'tbsp', 15, false, 20
from public.app_foods f
where f.base_unit = 'g'
  and lower(f.name) ~ '(arroz|feijao|lentilha|grao de bico|ervilha|macarrao|quinoa|cuscuz|aveia|granola|farofa)'
  and not exists (
    select 1 from public.app_food_portions p
    where p.food_id = f.id and lower(p.label) = lower('colher de sopa')
  );

insert into public.app_food_portions(food_id, label, amount, unit_key, base_qty_equivalent, is_default, sort_order)
select f.id, 'xicara', 1, 'cup', 160, false, 25
from public.app_foods f
where f.base_unit = 'g'
  and lower(f.name) ~ '(arroz|feijao|lentilha|grao de bico|ervilha|macarrao|quinoa|cuscuz|aveia|granola|farofa)'
  and not exists (
    select 1 from public.app_food_portions p
    where p.food_id = f.id and lower(p.label) = lower('xicara')
  );

insert into public.app_food_portions(food_id, label, amount, unit_key, base_qty_equivalent, is_default, sort_order)
select f.id, 'concha', 1, 'ladle', 100, false, 30
from public.app_foods f
where f.base_unit = 'g'
  and lower(f.name) ~ '(feijao|lentilha|grao de bico|ervilha|sopa|caldo)'
  and not exists (
    select 1 from public.app_food_portions p
    where p.food_id = f.id and lower(p.label) = lower('concha')
  );

-- Medidas de colher para gorduras e cremes
insert into public.app_food_portions(food_id, label, amount, unit_key, base_qty_equivalent, is_default, sort_order)
select f.id, 'colher de cha', 1, 'tsp', 5, false, 10
from public.app_foods f
where f.base_unit = 'g'
  and lower(f.name) ~ '(azeite|oleo|manteiga|margarina|pasta de amendoim|maionese|requeijao|cream cheese)'
  and not exists (
    select 1 from public.app_food_portions p
    where p.food_id = f.id and lower(p.label) = lower('colher de cha')
  );

insert into public.app_food_portions(food_id, label, amount, unit_key, base_qty_equivalent, is_default, sort_order)
select f.id, 'colher de sopa', 1, 'tbsp', 15, false, 20
from public.app_foods f
where f.base_unit = 'g'
  and lower(f.name) ~ '(azeite|oleo|manteiga|margarina|pasta de amendoim|maionese|requeijao|cream cheese)'
  and not exists (
    select 1 from public.app_food_portions p
    where p.food_id = f.id and lower(p.label) = lower('colher de sopa')
  );


create extension if not exists pg_trgm;

create unique index if not exists app_foods_name_brand_unit_uniq
  on public.app_foods ((lower(name)), (coalesce(lower(brand), '')), base_unit);
create unique index if not exists app_food_portions_food_label_uniq
  on public.app_food_portions (food_id, (lower(label)));
create index if not exists app_trainers_owner_id_idx on public.app_trainers(owner_id);
create unique index if not exists app_trainers_owner_id_unique_idx
  on public.app_trainers(owner_id)
  where owner_id is not null;
create index if not exists app_trainers_handle_idx on public.app_trainers((lower(handle)));
create index if not exists app_trainers_theme_preset_idx on public.app_trainers(theme_preset);
create index if not exists app_students_trainer_code_idx on public.app_students(trainer_code);
create index if not exists app_students_updated_at_idx on public.app_students(updated_at desc);
create index if not exists app_foods_name_idx on public.app_foods(name);
create index if not exists app_foods_name_trgm_idx on public.app_foods using gin (name gin_trgm_ops);
create index if not exists app_foods_source_idx on public.app_foods(source);
create index if not exists app_foods_family_key_idx on public.app_foods(family_key);
create index if not exists app_foods_variant_key_idx on public.app_foods(variant_key);
create index if not exists app_foods_created_at_idx on public.app_foods(created_at desc);
create index if not exists app_food_portions_food_id_idx on public.app_food_portions(food_id);
create index if not exists app_food_portions_unit_key_idx on public.app_food_portions(unit_key);

alter table public.app_trainers enable row level security;
alter table public.app_students enable row level security;
alter table public.app_foods enable row level security;
alter table public.app_food_portions enable row level security;

drop policy if exists app_trainers_select_all on public.app_trainers;
drop policy if exists app_trainers_insert_all on public.app_trainers;
drop policy if exists app_trainers_update_all on public.app_trainers;
drop policy if exists app_trainers_select_auth on public.app_trainers;
drop policy if exists app_trainers_insert_owner on public.app_trainers;
drop policy if exists app_trainers_update_owner on public.app_trainers;
drop policy if exists app_students_select_all on public.app_students;
drop policy if exists app_students_insert_all on public.app_students;
drop policy if exists app_students_update_all on public.app_students;
drop policy if exists app_students_delete_all on public.app_students;
drop policy if exists app_students_select_scoped on public.app_students;
drop policy if exists app_students_insert_scoped on public.app_students;
drop policy if exists app_students_update_scoped on public.app_students;
drop policy if exists app_students_delete_scoped on public.app_students;
drop policy if exists app_foods_select_all on public.app_foods;
drop policy if exists app_foods_insert_all on public.app_foods;
drop policy if exists app_foods_update_all on public.app_foods;
drop policy if exists app_foods_select_auth on public.app_foods;
drop policy if exists app_foods_insert_auth on public.app_foods;
drop policy if exists app_foods_update_auth on public.app_foods;
drop policy if exists app_food_portions_select_auth on public.app_food_portions;
drop policy if exists app_food_portions_insert_auth on public.app_food_portions;
drop policy if exists app_food_portions_update_auth on public.app_food_portions;

-- Production policies: authenticated-only access + scoped ownership.
create policy app_trainers_select_auth on public.app_trainers
  for select using (auth.role() = 'authenticated');
create policy app_trainers_insert_owner on public.app_trainers
  for insert with check (
    auth.role() = 'authenticated'
    and owner_id = auth.uid()
  );
create policy app_trainers_update_owner on public.app_trainers
  for update using (owner_id = auth.uid())
  with check (owner_id = auth.uid());

create policy app_students_select_scoped on public.app_students
  for select using (
    (
      auth.role() = 'authenticated'
      and exists (
        select 1
        from public.app_trainers t
        where t.code = app_students.trainer_code
          and t.owner_id = auth.uid()
      )
    ) or (
      auth.role() = 'authenticated'
      and coalesce(app_students.data ->> 'userId', '') = auth.uid()::text
    )
  );
create policy app_students_insert_scoped on public.app_students
  for insert with check (
    (
      auth.role() = 'authenticated'
      and exists (
        select 1
        from public.app_trainers t
        where t.code = app_students.trainer_code
          and t.owner_id = auth.uid()
      )
    ) or (
      auth.role() = 'authenticated'
      and coalesce(app_students.data ->> 'userId', '') = auth.uid()::text
    )
  );
create policy app_students_update_scoped on public.app_students
  for update using (
    (
      auth.role() = 'authenticated'
      and exists (
        select 1
        from public.app_trainers t
        where t.code = app_students.trainer_code
          and t.owner_id = auth.uid()
      )
    ) or (
      auth.role() = 'authenticated'
      and coalesce(app_students.data ->> 'userId', '') = auth.uid()::text
    )
  )
  with check (
    (
      auth.role() = 'authenticated'
      and exists (
        select 1
        from public.app_trainers t
        where t.code = app_students.trainer_code
          and t.owner_id = auth.uid()
      )
    ) or (
      auth.role() = 'authenticated'
      and coalesce(app_students.data ->> 'userId', '') = auth.uid()::text
    )
  );
create policy app_students_delete_scoped on public.app_students
  for delete using (
    auth.role() = 'authenticated'
    and exists (
      select 1
      from public.app_trainers t
      where t.code = app_students.trainer_code
        and t.owner_id = auth.uid()
    )
  );

create policy app_foods_select_auth on public.app_foods
  for select using (auth.role() = 'authenticated');
create policy app_foods_insert_auth on public.app_foods
  for insert with check (auth.role() = 'authenticated');
create policy app_foods_update_auth on public.app_foods
  for update using (auth.role() = 'authenticated')
  with check (auth.role() = 'authenticated');

create policy app_food_portions_select_auth on public.app_food_portions
  for select using (auth.role() = 'authenticated');
create policy app_food_portions_insert_auth on public.app_food_portions
  for insert with check (auth.role() = 'authenticated');
create policy app_food_portions_update_auth on public.app_food_portions
  for update using (auth.role() = 'authenticated')
  with check (auth.role() = 'authenticated');

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

  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'app_food_portions'
  ) then
    alter publication supabase_realtime add table public.app_food_portions;
  end if;
end $$;
