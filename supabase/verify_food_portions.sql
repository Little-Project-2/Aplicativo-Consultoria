-- Verify food catalog + portions after running realtime_app_sync.sql
-- Run in Supabase SQL Editor.

-- 1) Basic counts
select
  (select count(*) from public.app_foods) as foods_total,
  (select count(*) from public.app_food_portions) as portions_total,
  (select count(*) from public.app_foods f where exists (
    select 1 from public.app_food_portions p where p.food_id = f.id
  )) as foods_with_any_portion;

-- 2) Required examples from scope
select
  f.name,
  f.base_unit,
  p.label,
  p.amount,
  p.unit_key,
  p.base_qty_equivalent,
  p.is_default
from public.app_foods f
join public.app_food_portions p on p.food_id = f.id
where lower(f.name) like any (array['%pao%', '%leite desnatado%', '%leite integral%'])
order by f.name, p.sort_order, p.label;

-- 3) Ensure each food has at least one default portion
select
  f.id,
  f.name
from public.app_foods f
where not exists (
  select 1
  from public.app_food_portions p
  where p.food_id = f.id
    and p.is_default = true
)
order by f.name
limit 50;

-- 4) Spot-check conversion math for 2 fatias de pao
-- Expected factor = (2 * 25g) / base_qty(100g) = 0.5
select
  f.name,
  f.base_qty,
  f.kcal as kcal_base,
  round((f.kcal * ((2 * p.base_qty_equivalent) / nullif(f.base_qty, 0)))::numeric, 1) as kcal_for_2_slices
from public.app_foods f
join public.app_food_portions p on p.food_id = f.id
where lower(f.name) like '%pao%'
  and p.unit_key = 'slice'
order by f.name
limit 10;
