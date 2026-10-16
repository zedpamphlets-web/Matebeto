-- Fields behind the new customer screens, so Admin can edit everything shown on Home.
-- Safe to run more than once. Empty values fall back to the approved default wording in the app.
begin;

-- Home: market cards show distance; meal page shows prep time
alter table public.markets add column if not exists distance_km numeric(4,1);
alter table public.meals   add column if not exists prep_time text;

-- Home: banner second line ("Fresh. Tasty. Local.")
alter table public.banners add column if not exists subtitle text;

-- Home: text under the logo, city, markets heading, and the "Great food. Great places." strip
alter table public.settings add column if not exists home_tagline text;
alter table public.settings add column if not exists home_city text;
alter table public.settings add column if not exists home_markets_title text;
alter table public.settings add column if not exists promo_enabled boolean not null default true;
alter table public.settings add column if not exists promo_title text;
alter table public.settings add column if not exists promo_subtitle text;

-- Arrange Home markets and menu tiles the way the approved layout shows them.
-- Only order is changed. Names and photos already set in Admin are kept.
insert into public.markets (name, slug, sort_order) values
  ('Longacres', 'longacres', 1),
  ('Olympia',   'olympia',   2),
  ('Thornpark', 'thornpark', 3),
  ('Avondale',  'avondale',  4)
on conflict (slug) do update set sort_order = excluded.sort_order;

insert into public.categories (name, image_url, sort_order)
select v.name, null, v.sort_order
from (values ('T-Bone', 1), ('Chicken', 2), ('Fish', 3), ('Goat Meat', 4), ('Offals', 5), ('Kapenta', 6)) as v(name, sort_order)
where not exists (select 1 from public.categories c where lower(c.name) = lower(v.name));

update public.categories set sort_order = case lower(name)
  when 't-bone' then 1 when 'chicken' then 2 when 'fish' then 3
  when 'goat meat' then 4 when 'offals' then 5 when 'kapenta' then 6
  else greatest(sort_order, 10) end;

commit;
