-- Matebeto V1 launch structure only.
-- No stock photos, no fake vendors, no sample meals.
-- Admin adds real partners, real menu, and real images.

-- Drop leftover placeholder rows from the old seed, if present.
delete from public.vendor_meals
  where vendor_id in (select id from public.vendors where name like 'Market Grill %');
delete from public.vendors where name like 'Market Grill %';
delete from public.meal_sides
  where meal_id in (select id from public.meals where image_url like '%unsplash%');
delete from public.meals where image_url like '%unsplash%';
update public.markets set image_url = null where image_url like '%unsplash%';
update public.categories set image_url = null where image_url like '%unsplash%';

insert into public.markets (name, slug, image_url, sort_order) values
  ('Thornpark', 'thornpark', null, 1),
  ('Longacres', 'longacres', null, 2),
  ('Olympia', 'olympia', null, 3)
on conflict (slug) do update set image_url = excluded.image_url;

insert into public.categories (name, image_url, sort_order)
select v.name, null, v.sort_order
from (values
  ('Chicken', 1),
  ('T-Bone', 2),
  ('Fish', 3),
  ('Traditional Meals', 4),
  ('Vegetables', 5),
  ('Other Meals', 6)
) as v(name, sort_order)
where not exists (select 1 from public.categories c where c.name = v.name);

update public.settings set
  platform_fee = 10,
  bicycle_delivery_fee = 15,
  motorbike_delivery_fee = 25
where id = 1;
