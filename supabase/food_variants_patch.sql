-- Patch seguro para variantes de alimentos na dieta
-- Pode ser executado isoladamente no Supabase SQL Editor.

alter table public.app_foods add column if not exists family_key text;
alter table public.app_foods add column if not exists variant_key text;
alter table public.app_foods add column if not exists variant_label text;

do $$
begin
  if exists (
    select 1
    from pg_constraint
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

with principal_variant_seed(name, brand, family_key, variant_key, variant_label, base_qty, base_unit, kcal, protein, carb, fat, source) as (
  values
    -- Existing core families
    ('Arroz branco cozido', null, 'rice', 'white', 'Branco', 100, 'g', 128, 2.5, 28.1, 0.2, 'baseline'),
    ('Arroz integral cozido', null, 'rice', 'brown', 'Integral', 100, 'g', 124, 2.6, 25.8, 1.0, 'baseline'),
    ('Feijao carioca cozido', null, 'beans', 'carioca', 'Carioca', 100, 'g', 76, 4.8, 13.6, 0.5, 'baseline'),
    ('Feijao preto cozido', null, 'beans', 'black', 'Preto', 100, 'g', 77, 4.5, 14.0, 0.5, 'baseline'),
    ('Leite integral', null, 'milk', 'whole', 'Integral', 100, 'ml', 61, 3.2, 4.7, 3.3, 'baseline'),
    ('Leite semidesnatado', null, 'milk', 'semi', 'Semi', 100, 'ml', 45, 3.2, 4.8, 1.5, 'baseline'),
    ('Leite desnatado', null, 'milk', 'skim', 'Desnatado', 100, 'ml', 34, 3.4, 5.0, 0.1, 'baseline'),
    ('Refrigerante normal', null, 'soda', 'regular', 'Normal', 100, 'ml', 42, 0, 10.6, 0, 'baseline'),
    ('Refrigerante zero', null, 'soda', 'zero', 'Zero', 100, 'ml', 1, 0, 0, 0, 'baseline'),
    ('Agua mineral sem gas', null, 'water', 'still', 'Sem gas', 100, 'ml', 0, 0, 0, 0, 'baseline'),
    ('Agua mineral com gas', null, 'water', 'sparkling', 'Com gas', 100, 'ml', 0, 0, 0, 0, 'baseline'),
    -- Principal+ families
    ('Iogurte natural', null, 'yogurt', 'natural', 'Natural', 100, 'g', 61, 3.5, 4.7, 3.3, 'baseline'),
    ('Iogurte grego natural', null, 'yogurt', 'greek', 'Grego', 100, 'g', 97, 9.0, 4.0, 5.0, 'baseline'),
    ('Iogurte natural desnatado', null, 'yogurt', 'skim', 'Desnatado', 100, 'g', 42, 3.8, 5.2, 0.1, 'baseline'),
    ('Pao frances', null, 'bread', 'french', 'Frances', 100, 'g', 300, 8.0, 58.6, 3.1, 'baseline'),
    ('Pao integral', null, 'bread', 'whole', 'Integral', 100, 'g', 253, 9.4, 43.0, 3.4, 'baseline'),
    ('Queijo mucarela', null, 'cheese', 'mozzarella', 'Mucarela', 100, 'g', 300, 22.6, 3.0, 22.0, 'baseline'),
    ('Queijo minas frescal', null, 'cheese', 'minas', 'Minas', 100, 'g', 264, 17.0, 3.2, 20.0, 'baseline'),
    ('Queijo cottage', null, 'cheese', 'cottage', 'Cottage', 100, 'g', 98, 11.0, 3.4, 4.3, 'baseline'),
    ('Suco de laranja natural', null, 'juice', 'natural', 'Natural', 100, 'ml', 45, 0.7, 10.4, 0.2, 'baseline'),
    ('Suco integral de uva', null, 'juice', 'integral', 'Integral', 100, 'ml', 60, 0.4, 14.5, 0.1, 'baseline'),
    ('Suco zero', null, 'juice', 'zero', 'Zero', 100, 'ml', 2, 0, 0, 0, 'baseline'),
    ('Cafe sem acucar', null, 'hot_drink', 'coffee_black', 'Cafe sem acucar', 100, 'ml', 2, 0.3, 0, 0, 'baseline'),
    ('Cafe com leite', null, 'hot_drink', 'coffee_milk', 'Cafe com leite', 100, 'ml', 41, 2.0, 4.0, 1.5, 'baseline'),
    ('Cha sem acucar', null, 'hot_drink', 'tea_unsweetened', 'Cha sem acucar', 100, 'ml', 1, 0, 0.2, 0, 'baseline')
),
inserted as (
  insert into public.app_foods(name, brand, family_key, variant_key, variant_label, base_qty, base_unit, kcal, protein, carb, fat, source)
  select p.name, p.brand, p.family_key, p.variant_key, p.variant_label, p.base_qty, p.base_unit, p.kcal, p.protein, p.carb, p.fat, p.source
  from principal_variant_seed p
  where not exists (
    select 1
    from public.app_foods af
    where lower(af.name) = lower(p.name)
      and coalesce(lower(af.brand), '') = coalesce(lower(p.brand), '')
      and af.base_unit = p.base_unit
  )
  returning id
)
select count(*) from inserted;

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
    ('Agua mineral sem gas', null, 'water', 'still', 'Sem gas', 100, 'ml', 0, 0, 0, 0, 'baseline'),
    ('Agua mineral com gas', null, 'water', 'sparkling', 'Com gas', 100, 'ml', 0, 0, 0, 0, 'baseline'),
    ('Iogurte natural', null, 'yogurt', 'natural', 'Natural', 100, 'g', 61, 3.5, 4.7, 3.3, 'baseline'),
    ('Iogurte grego natural', null, 'yogurt', 'greek', 'Grego', 100, 'g', 97, 9.0, 4.0, 5.0, 'baseline'),
    ('Iogurte natural desnatado', null, 'yogurt', 'skim', 'Desnatado', 100, 'g', 42, 3.8, 5.2, 0.1, 'baseline'),
    ('Pao frances', null, 'bread', 'french', 'Frances', 100, 'g', 300, 8.0, 58.6, 3.1, 'baseline'),
    ('Pao integral', null, 'bread', 'whole', 'Integral', 100, 'g', 253, 9.4, 43.0, 3.4, 'baseline'),
    ('Queijo mucarela', null, 'cheese', 'mozzarella', 'Mucarela', 100, 'g', 300, 22.6, 3.0, 22.0, 'baseline'),
    ('Queijo minas frescal', null, 'cheese', 'minas', 'Minas', 100, 'g', 264, 17.0, 3.2, 20.0, 'baseline'),
    ('Queijo cottage', null, 'cheese', 'cottage', 'Cottage', 100, 'g', 98, 11.0, 3.4, 4.3, 'baseline'),
    ('Suco de laranja natural', null, 'juice', 'natural', 'Natural', 100, 'ml', 45, 0.7, 10.4, 0.2, 'baseline'),
    ('Suco integral de uva', null, 'juice', 'integral', 'Integral', 100, 'ml', 60, 0.4, 14.5, 0.1, 'baseline'),
    ('Suco zero', null, 'juice', 'zero', 'Zero', 100, 'ml', 2, 0, 0, 0, 'baseline'),
    ('Cafe sem acucar', null, 'hot_drink', 'coffee_black', 'Cafe sem acucar', 100, 'ml', 2, 0.3, 0, 0, 'baseline'),
    ('Cafe com leite', null, 'hot_drink', 'coffee_milk', 'Cafe com leite', 100, 'ml', 41, 2.0, 4.0, 1.5, 'baseline'),
    ('Cha sem acucar', null, 'hot_drink', 'tea_unsweetened', 'Cha sem acucar', 100, 'ml', 1, 0, 0.2, 0, 'baseline')
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

insert into public.app_food_portions(food_id, label, amount, unit_key, base_qty_equivalent, is_default, sort_order)
select f.id, 'litro (l)', 1, 'l', 1000, false, 8
from public.app_foods f
where f.base_unit = 'ml'
  and not exists (
    select 1
    from public.app_food_portions p
    where p.food_id = f.id
      and lower(p.label) = lower('litro (l)')
  );
