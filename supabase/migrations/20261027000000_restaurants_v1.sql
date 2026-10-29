-- Matebeto V1 customer-side update: market -> restaurant -> own menu and prices.
-- Safe to run more than once. Does NOT touch payment, payouts, rider or vendor-reply logic.
-- It only (a) adds restaurant details, (b) lets each restaurant set its own meal prices and photos,
-- (c) lets an order remember which restaurant the customer chose, (d) links the Home banner
-- to a restaurant, (e) adds an optional payment transaction charge (default 0 = off).
begin;

-- 1. Markets: real distance is worked out from the customer's phone location
alter table public.markets add column if not exists latitude numeric(9,6);
alter table public.markets add column if not exists longitude numeric(9,6);

-- 2. Restaurants (the existing vendors table)
alter table public.vendors add column if not exists image_url text;
alter table public.vendors add column if not exists stand_number text;
alter table public.vendors add column if not exists cuisine text;
alter table public.vendors add column if not exists description text;
alter table public.vendors add column if not exists rating numeric(2,1);
alter table public.vendors add column if not exists rating_count int;

-- 3. Each restaurant's own price and food photo per meal (empty = use the main meal's)
alter table public.vendor_meals add column if not exists price numeric(12,2);
alter table public.vendor_meals add column if not exists image_url text;

-- 4. Home banner opens a restaurant menu
alter table public.promotion add column if not exists vendor_id uuid references public.vendors(id) on delete set null;
alter table public.promotion add column if not exists label text;
alter table public.promotion add column if not exists button_text text;

-- 5. Optional payment transaction charge, shown at checkout. 0 = not charged.
alter table public.settings add column if not exists transaction_fee_percent numeric(5,2) not null default 0;
alter table public.orders add column if not exists transaction_fee numeric(12,2) not null default 0;
alter table public.orders add column if not exists requested_vendor_id uuid references public.vendors(id) on delete set null;

-- 6. What customers may see about restaurants (never phone / WhatsApp / payout numbers)
create or replace function public.app_restaurants(p_market uuid default null)
returns table (
  id uuid, market_id uuid, name text, image_url text, stand_number text,
  cuisine text, description text, rating numeric, rating_count int, is_open boolean
)
language sql stable security definer set search_path = public as $$
  select v.id, v.market_id, v.name, v.image_url, v.stand_number, v.cuisine, v.description,
         v.rating, v.rating_count, v.is_available
  from public.vendors v
  where v.is_active
    and (p_market is null or v.market_id = p_market)
  order by v.name;
$$;

create or replace function public.app_restaurant_menu(p_vendor uuid)
returns table (
  meal_id uuid, name text, description text, price numeric, image_url text, prep_time text
)
language sql stable security definer set search_path = public as $$
  select m.id, m.name, m.description,
         coalesce(vm.price, m.price), coalesce(vm.image_url, m.image_url), m.prep_time
  from public.vendor_meals vm
  join public.meals m on m.id = vm.meal_id
  join public.vendors v on v.id = vm.vendor_id
  where vm.vendor_id = p_vendor and vm.is_available and m.is_available and v.is_active
  order by m.created_at, m.name;
$$;

grant execute on function public.app_restaurants(uuid) to anon, authenticated;
grant execute on function public.app_restaurant_menu(uuid) to anon, authenticated;

-- 7. create_order: the customer picks one restaurant. Prices are that restaurant's own.
--    (Old 4-argument version removed so the app cannot hit an ambiguous call.)
drop function if exists public.create_order(uuid, text, jsonb, jsonb);

create or replace function public.create_order(
  p_market_id uuid,
  p_delivery_type text,
  p_address jsonb,
  p_items jsonb,
  p_vendor_id uuid default null
) returns public.orders
language plpgsql security definer set search_path = public as $$
declare
  v_uid uuid := auth.uid();
  v_food numeric := 0;
  v_platform numeric;
  v_delivery numeric;
  v_pct numeric;
  v_txn numeric := 0;
  v_price numeric;
  v_item jsonb;
  v_meal public.meals%rowtype;
  v_vendor public.vendors%rowtype;
  v_order public.orders%rowtype;
begin
  if v_uid is null then raise exception 'Not signed in'; end if;
  if p_delivery_type not in ('bicycle','motorbike') then raise exception 'Invalid delivery type'; end if;
  if jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) < 1 then
    raise exception 'Basket is empty';
  end if;

  if p_vendor_id is not null then
    select * into v_vendor from public.vendors where id = p_vendor_id;
    if not found or not v_vendor.is_active then raise exception 'This restaurant is not available'; end if;
    if not v_vendor.is_available then raise exception 'This restaurant is closed right now'; end if;
    if v_vendor.market_id <> p_market_id then raise exception 'Restaurant is not in this market'; end if;
  end if;

  select platform_fee,
         case when p_delivery_type = 'bicycle' then bicycle_delivery_fee else motorbike_delivery_fee end,
         coalesce(transaction_fee_percent, 0)
    into v_platform, v_delivery, v_pct
  from public.settings where id = 1;

  for v_item in select * from jsonb_array_elements(p_items)
  loop
    if coalesce((v_item->>'quantity')::int, 0) < 1 then raise exception 'Invalid quantity'; end if;
    select * into v_meal from public.meals where id = (v_item->>'meal_id')::uuid and is_available = true;
    if not found then raise exception 'Meal unavailable'; end if;
    v_price := v_meal.price;
    if p_vendor_id is not null then
      select coalesce(vm.price, v_meal.price) into v_price
      from public.vendor_meals vm
      where vm.vendor_id = p_vendor_id and vm.meal_id = v_meal.id and vm.is_available;
      if not found then raise exception '% is not on this restaurant''s menu', v_meal.name; end if;
    end if;
    v_food := v_food + (v_price * (v_item->>'quantity')::int);
  end loop;

  v_txn := round((v_food + v_platform + v_delivery) * v_pct / 100, 2);

  insert into public.orders (
    customer_id, market_id, requested_vendor_id, delivery_type, delivery_address,
    food_total, platform_fee, delivery_fee, transaction_fee, total, payment_status, status
  ) values (
    v_uid, p_market_id, p_vendor_id, p_delivery_type, p_address,
    v_food, v_platform, v_delivery, v_txn, v_food + v_platform + v_delivery + v_txn, 'unpaid', 'CREATED'
  ) returning * into v_order;

  for v_item in select * from jsonb_array_elements(p_items)
  loop
    select * into v_meal from public.meals where id = (v_item->>'meal_id')::uuid;
    v_price := v_meal.price;
    if p_vendor_id is not null then
      select coalesce(vm.price, v_meal.price) into v_price
      from public.vendor_meals vm where vm.vendor_id = p_vendor_id and vm.meal_id = v_meal.id;
    end if;
    insert into public.order_items (order_id, meal_id, meal_name, unit_price, quantity, sides)
    values (
      v_order.id, v_meal.id, v_meal.name, v_price,
      (v_item->>'quantity')::int,
      coalesce(array(select jsonb_array_elements_text(v_item->'sides')), '{}')
    );
  end loop;

  perform public.log_event(v_order.id, 'CREATED',
    case when p_vendor_id is null then 'Order created' else 'Order created for ' || v_vendor.name end);
  return v_order;
end;
$$;

grant execute on function public.create_order(uuid, text, jsonb, jsonb, uuid) to authenticated;

-- 8. Vendor search: when the customer chose a restaurant, only that restaurant is offered the order.
create or replace function public.capable_vendors(p_order uuid)
returns setof public.vendors
language sql stable security definer set search_path = public as $$
  select v.*
  from public.vendors v
  join public.orders o on o.id = p_order and v.market_id = o.market_id
  where v.is_active and v.is_available
    and (o.requested_vendor_id is null or v.id = o.requested_vendor_id)
    and not exists (
      select 1 from public.order_items i
      where i.order_id = p_order
        and not exists (
          select 1 from public.vendor_meals vm
          where vm.vendor_id = v.id and vm.meal_id = i.meal_id and vm.is_available
        )
    )
    and v.id not in (select vendor_id from public.vendor_attempts where order_id = p_order)
  order by v.name;
$$;

-- Same rule for the automatic restart of orders stuck with "no vendor"
create or replace function public.restart_stuck_orders(p_market uuid)
returns void
language plpgsql security definer set search_path = public as $$
declare
  r record;
begin
  for r in
    select o.id
    from public.orders o
    where o.market_id = p_market
      and o.status = 'NO_VENDOR_FOUND'
      and o.payment_status = 'paid'
      and o.created_at > now() - interval '3 hours'
    order by o.created_at
    limit 20
  loop
    begin
      if exists (
        select 1 from public.vendors v
        where v.market_id = p_market and v.is_active and v.is_available
          and (
            (select requested_vendor_id from public.orders where id = r.id) is null
            or v.id = (select requested_vendor_id from public.orders where id = r.id)
          )
          and not exists (
            select 1 from public.order_items i
            where i.order_id = r.id
              and not exists (
                select 1 from public.vendor_meals vm
                where vm.vendor_id = v.id and vm.meal_id = i.meal_id and vm.is_available
              )
          )
      ) then
        delete from public.vendor_attempts where order_id = r.id;
        update public.orders set vendor_attempts = 0, vendor_id = null, status = 'SEARCHING_VENDOR' where id = r.id;
        perform public.log_event(r.id, 'AUTO_RETRY', 'A vendor became available');
        perform public.offer_next_vendor(r.id);
      end if;
    exception when others then
      raise warning 'auto restart failed for %: %', r.id, sqlerrm;
    end;
  end loop;
end;
$$;

commit;
