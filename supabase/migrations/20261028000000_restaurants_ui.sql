-- Customer V1: vendors = restaurants (photo + stand), promotion links to a meal for the home banner.
-- Safe to re-run. Does not insert sample data.

begin;

alter table public.vendors add column if not exists image_url text;
alter table public.vendors add column if not exists stand_number text;

alter table public.promotion add column if not exists meal_id uuid references public.meals(id) on delete set null;

commit;
