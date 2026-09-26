-- Paste this in the Supabase SQL editor if catalog/login reads fail.
-- Safe to run more than once.

alter table public.profiles enable row level security;
alter table public.markets enable row level security;
alter table public.categories enable row level security;
alter table public.meals enable row level security;
alter table public.meal_sides enable row level security;
alter table public.vendors enable row level security;
alter table public.vendor_meals enable row level security;
alter table public.riders enable row level security;
alter table public.platform_admins enable row level security;
alter table public.settings enable row level security;
alter table public.orders enable row level security;
alter table public.order_items enable row level security;
alter table public.vendor_attempts enable row level security;
alter table public.rider_offers enable row level security;
alter table public.order_events enable row level security;
alter table public.delivery_otps enable row level security;

drop policy if exists "profiles_self" on public.profiles;
drop policy if exists "profiles_self_upd" on public.profiles;
drop policy if exists "profiles_self_ins" on public.profiles;
drop policy if exists "markets_read" on public.markets;
drop policy if exists "categories_read" on public.categories;
drop policy if exists "meals_read" on public.meals;
drop policy if exists "sides_read" on public.meal_sides;
drop policy if exists "vendors_admin" on public.vendors;
drop policy if exists "vendor_meals_read" on public.vendor_meals;
drop policy if exists "settings_read" on public.settings;
drop policy if exists "riders_self" on public.riders;
drop policy if exists "riders_self_upd" on public.riders;
drop policy if exists "orders_own" on public.orders;
drop policy if exists "items_own" on public.order_items;
drop policy if exists "attempts_admin" on public.vendor_attempts;
drop policy if exists "offers_rider" on public.rider_offers;
drop policy if exists "events_own" on public.order_events;
drop policy if exists "otp_customer_only" on public.delivery_otps;
drop policy if exists "admin_write_markets" on public.markets;
drop policy if exists "admin_write_categories" on public.categories;
drop policy if exists "admin_write_meals" on public.meals;
drop policy if exists "admin_write_sides" on public.meal_sides;
drop policy if exists "admin_write_vendors" on public.vendors;
drop policy if exists "admin_write_vendor_meals" on public.vendor_meals;
drop policy if exists "admin_write_riders" on public.riders;
drop policy if exists "admin_write_settings" on public.settings;
drop policy if exists "admin_write_admins" on public.platform_admins;

create policy "profiles_self" on public.profiles for select to authenticated using (user_id = auth.uid() or public.is_admin());
create policy "profiles_self_upd" on public.profiles for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "profiles_self_ins" on public.profiles for insert to authenticated with check (user_id = auth.uid());

create policy "markets_read" on public.markets for select using (is_active = true or public.is_admin());
create policy "categories_read" on public.categories for select using (true);
create policy "meals_read" on public.meals for select using (is_available = true or public.is_admin());
create policy "sides_read" on public.meal_sides for select using (true);
create policy "vendors_admin" on public.vendors for select to authenticated using (public.is_admin() or is_active);
create policy "vendor_meals_read" on public.vendor_meals for select using (true);
create policy "settings_read" on public.settings for select using (true);

create policy "riders_self" on public.riders for select to authenticated
  using (user_id = auth.uid() or public.is_admin());
create policy "riders_self_upd" on public.riders for update to authenticated
  using (user_id = auth.uid() or public.is_admin());

create policy "orders_own" on public.orders for select to authenticated
  using (
    customer_id = auth.uid()
    or public.is_admin()
    or rider_id in (select id from public.riders where user_id = auth.uid())
  );

create policy "items_own" on public.order_items for select to authenticated
  using (order_id in (select id from public.orders));

create policy "attempts_admin" on public.vendor_attempts for select to authenticated
  using (public.is_admin() or order_id in (select id from public.orders where customer_id = auth.uid()));

create policy "offers_rider" on public.rider_offers for select to authenticated
  using (
    public.is_admin()
    or rider_id in (select id from public.riders where user_id = auth.uid())
  );

create policy "events_own" on public.order_events for select to authenticated
  using (order_id in (select id from public.orders));

create policy "otp_customer_only" on public.delivery_otps for select to authenticated
  using (customer_id = auth.uid() or public.is_admin());

create policy "admin_write_markets" on public.markets for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "admin_write_categories" on public.categories for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "admin_write_meals" on public.meals for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "admin_write_sides" on public.meal_sides for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "admin_write_vendors" on public.vendors for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "admin_write_vendor_meals" on public.vendor_meals for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "admin_write_riders" on public.riders for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "admin_write_settings" on public.settings for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "admin_write_admins" on public.platform_admins for all to authenticated using (public.is_admin()) with check (public.is_admin());

grant usage on schema public to anon, authenticated;
grant select on public.markets, public.categories, public.meals, public.meal_sides, public.settings to anon, authenticated;
grant execute on all functions in schema public to authenticated;
