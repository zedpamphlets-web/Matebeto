-- Matebeto V1 schema. Run in Supabase SQL Editor.
create extension if not exists pgcrypto;

create sequence if not exists public.order_number_seq start 1042;

create table if not exists public.profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  phone text unique,
  full_name text,
  address_text text,
  address_notes text,
  is_customer boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.markets (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text unique not null,
  image_url text,
  is_active boolean not null default true,
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.categories (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  image_url text,
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.meals (
  id uuid primary key default gen_random_uuid(),
  category_id uuid references public.categories(id) on delete set null,
  name text not null,
  description text,
  price numeric(12,2) not null,
  image_url text,
  is_featured boolean not null default false,
  is_available boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.meal_sides (
  id uuid primary key default gen_random_uuid(),
  meal_id uuid not null references public.meals(id) on delete cascade,
  name text not null
);

create table if not exists public.vendors (
  id uuid primary key default gen_random_uuid(),
  market_id uuid not null references public.markets(id) on delete restrict,
  name text not null,
  contact_name text,
  phone text,
  whatsapp text,
  is_active boolean not null default true,
  is_available boolean not null default true,
  notes text,
  created_at timestamptz not null default now()
);

create table if not exists public.vendor_meals (
  vendor_id uuid not null references public.vendors(id) on delete cascade,
  meal_id uuid not null references public.meals(id) on delete cascade,
  is_available boolean not null default true,
  primary key (vendor_id, meal_id)
);

create table if not exists public.riders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid unique references auth.users(id) on delete set null,
  full_name text not null,
  phone text not null,
  address_text text,
  vehicle_type text not null check (vehicle_type in ('bicycle', 'motorbike')),
  licence_info text,
  ownership_note text,
  smartphone_confirmed boolean not null default true,
  status text not null default 'PENDING' check (status in ('PENDING','APPROVED','REJECTED','SUSPENDED')),
  is_online boolean not null default false,
  current_order_id uuid,
  created_at timestamptz not null default now()
);

create table if not exists public.platform_admins (
  user_id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

create table if not exists public.settings (
  id int primary key default 1 check (id = 1),
  platform_fee numeric(12,2) not null default 10,
  bicycle_delivery_fee numeric(12,2) not null default 15,
  motorbike_delivery_fee numeric(12,2) not null default 25,
  support_phone text,
  home_banner_url text
);

insert into public.settings (id) values (1) on conflict (id) do nothing;

create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  order_number int unique not null default nextval('public.order_number_seq'),
  customer_id uuid not null references auth.users(id),
  market_id uuid not null references public.markets(id),
  vendor_id uuid references public.vendors(id),
  rider_id uuid references public.riders(id),
  delivery_type text not null check (delivery_type in ('bicycle','motorbike')),
  delivery_address jsonb,
  food_total numeric(12,2) not null,
  platform_fee numeric(12,2) not null,
  delivery_fee numeric(12,2) not null,
  total numeric(12,2) not null,
  payment_status text not null default 'unpaid' check (payment_status in ('unpaid','pending','paid','failed','refunded')),
  status text not null default 'CREATED',
  delivery_otp_hash text,
  vendor_attempts int not null default 0,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  meal_id uuid not null references public.meals(id),
  meal_name text not null,
  unit_price numeric(12,2) not null,
  quantity int not null check (quantity > 0),
  sides text[] not null default '{}'
);

create table if not exists public.vendor_attempts (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  vendor_id uuid not null references public.vendors(id),
  attempt_no int not null,
  status text not null default 'OFFERED' check (status in ('OFFERED','ACCEPTED','DECLINED','UNAVAILABLE','TIMEOUT')),
  created_at timestamptz not null default now()
);

create table if not exists public.rider_offers (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  rider_id uuid not null references public.riders(id),
  status text not null default 'OFFERED' check (status in ('OFFERED','ACCEPTED','DECLINED')),
  created_at timestamptz not null default now()
);

create table if not exists public.order_events (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  event text not null,
  detail text,
  created_at timestamptz not null default now()
);

create table if not exists public.delivery_otps (
  order_id uuid primary key references public.orders(id) on delete cascade,
  customer_id uuid not null references auth.users(id),
  code text not null,
  created_at timestamptz not null default now()
);

create or replace function public.is_admin()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.platform_admins where user_id = auth.uid());
$$;

create or replace function public.touch_order()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists orders_touch on public.orders;
create trigger orders_touch before update on public.orders
for each row execute function public.touch_order();

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (user_id, phone)
  values (new.id, new.phone)
  on conflict (user_id) do update set phone = excluded.phone;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users
for each row execute function public.handle_new_user();

create or replace function public.log_event(p_order uuid, p_event text, p_detail text default null)
returns void language sql security definer set search_path = public as $$
  insert into public.order_events (order_id, event, detail) values (p_order, p_event, p_detail);
$$;

-- Create order from basket. One market, one future vendor.
create or replace function public.create_order(
  p_market_id uuid,
  p_delivery_type text,
  p_address jsonb,
  p_items jsonb
) returns public.orders
language plpgsql security definer set search_path = public as $$
declare
  v_uid uuid := auth.uid();
  v_food numeric := 0;
  v_platform numeric;
  v_delivery numeric;
  v_item jsonb;
  v_meal public.meals%rowtype;
  v_order public.orders%rowtype;
begin
  if v_uid is null then raise exception 'Not signed in'; end if;
  if p_delivery_type not in ('bicycle','motorbike') then raise exception 'Invalid delivery type'; end if;
  if jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) < 1 then
    raise exception 'Basket is empty';
  end if;

  select platform_fee,
         case when p_delivery_type = 'bicycle' then bicycle_delivery_fee else motorbike_delivery_fee end
    into v_platform, v_delivery
  from public.settings where id = 1;

  for v_item in select * from jsonb_array_elements(p_items)
  loop
    select * into v_meal from public.meals where id = (v_item->>'meal_id')::uuid and is_available = true;
    if not found then raise exception 'Meal unavailable'; end if;
    v_food := v_food + (v_meal.price * (v_item->>'quantity')::int);
  end loop;

  insert into public.orders (
    customer_id, market_id, delivery_type, delivery_address,
    food_total, platform_fee, delivery_fee, total, payment_status, status
  ) values (
    v_uid, p_market_id, p_delivery_type, p_address,
    v_food, v_platform, v_delivery, v_food + v_platform + v_delivery, 'unpaid', 'CREATED'
  ) returning * into v_order;

  for v_item in select * from jsonb_array_elements(p_items)
  loop
    select * into v_meal from public.meals where id = (v_item->>'meal_id')::uuid;
    insert into public.order_items (order_id, meal_id, meal_name, unit_price, quantity, sides)
    values (
      v_order.id,
      v_meal.id,
      v_meal.name,
      v_meal.price,
      (v_item->>'quantity')::int,
      coalesce(array(select jsonb_array_elements_text(v_item->'sides')), '{}')
    );
  end loop;

  perform public.log_event(v_order.id, 'CREATED', 'Order created');
  return v_order;
end;
$$;

-- Vendors that can fulfil the entire basket in that market.
create or replace function public.capable_vendors(p_order uuid)
returns setof public.vendors
language sql stable security definer set search_path = public as $$
  select v.*
  from public.vendors v
  join public.orders o on o.id = p_order and v.market_id = o.market_id
  where v.is_active and v.is_available
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

create or replace function public.offer_next_vendor(p_order uuid)
returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  v_order public.orders%rowtype;
  v_vendor public.vendors%rowtype;
begin
  if auth.uid() is null then raise exception 'Not signed in'; end if;
  select * into v_order from public.orders where id = p_order;
  if not found then raise exception 'Order not found'; end if;
  if v_order.customer_id <> auth.uid() and not public.is_admin() then raise exception 'Forbidden'; end if;
  if v_order.payment_status <> 'paid' then raise exception 'Payment not confirmed'; end if;
  if v_order.vendor_attempts >= 3 then
    update public.orders set status = 'NO_VENDOR_FOUND' where id = p_order;
    perform public.log_event(p_order, 'NO_VENDOR_FOUND', 'Maximum three vendor attempts used');
    return jsonb_build_object('ok', false, 'reason', 'NO_VENDOR_FOUND');
  end if;

  select * into v_vendor from public.capable_vendors(p_order) limit 1;
  if not found then
    update public.orders set status = 'NO_VENDOR_FOUND' where id = p_order;
    perform public.log_event(p_order, 'NO_VENDOR_FOUND', 'No capable vendor left');
    return jsonb_build_object('ok', false, 'reason', 'NO_VENDOR_FOUND');
  end if;

  update public.orders
    set vendor_attempts = vendor_attempts + 1,
        status = 'VENDOR_OFFERED',
        vendor_id = v_vendor.id
    where id = p_order;

  insert into public.vendor_attempts (order_id, vendor_id, attempt_no, status)
  values (p_order, v_vendor.id, v_order.vendor_attempts + 1, 'OFFERED');

  perform public.log_event(p_order, 'VENDOR_OFFERED', v_vendor.name);

  return jsonb_build_object(
    'ok', true,
    'vendor_id', v_vendor.id,
    'vendor_name', v_vendor.name,
    'whatsapp', v_vendor.whatsapp,
    'phone', v_vendor.phone,
    'attempt', v_order.vendor_attempts + 1
  );
end;
$$;

create or replace function public.respond_vendor(p_order uuid, p_accept boolean, p_reason text default null)
returns public.orders
language plpgsql security definer set search_path = public as $$
declare
  v_order public.orders%rowtype;
begin
  if not public.is_admin() then
    -- webhook service role also hits this via edge function using service key
    if auth.role() <> 'service_role' then
      raise exception 'Forbidden';
    end if;
  end if;
  select * into v_order from public.orders where id = p_order;
  if p_accept then
    update public.vendor_attempts set status = 'ACCEPTED'
      where order_id = p_order and vendor_id = v_order.vendor_id and status = 'OFFERED';
    update public.orders set status = 'VENDOR_ACCEPTED' where id = p_order returning * into v_order;
    perform public.log_event(p_order, 'VENDOR_ACCEPTED', p_reason);
  else
    update public.vendor_attempts set status = 'DECLINED'
      where order_id = p_order and vendor_id = v_order.vendor_id and status = 'OFFERED';
    update public.orders set vendor_id = null, status = 'SEARCHING_VENDOR' where id = p_order returning * into v_order;
    perform public.log_event(p_order, 'VENDOR_DECLINED', p_reason);
  end if;
  return v_order;
end;
$$;

create or replace function public.offer_next_rider(p_order uuid)
returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  v_order public.orders%rowtype;
  v_rider public.riders%rowtype;
begin
  select * into v_order from public.orders where id = p_order;
  if v_order.status not in ('VENDOR_ACCEPTED','SEARCHING_RIDER') then
    raise exception 'Order is not ready for a rider';
  end if;

  select * into v_rider
  from public.riders r
  where r.status = 'APPROVED'
    and r.is_online = true
    and r.vehicle_type = v_order.delivery_type
    and r.current_order_id is null
    and r.id not in (select rider_id from public.rider_offers where order_id = p_order)
  order by r.created_at
  limit 1;

  if not found then
    update public.orders set status = 'NO_RIDER_AVAILABLE' where id = p_order;
    perform public.log_event(p_order, 'NO_RIDER_AVAILABLE', v_order.delivery_type);
    return jsonb_build_object('ok', false, 'reason', 'NO_RIDER_AVAILABLE');
  end if;

  insert into public.rider_offers (order_id, rider_id, status) values (p_order, v_rider.id, 'OFFERED');
  update public.orders set status = 'SEARCHING_RIDER' where id = p_order;
  perform public.log_event(p_order, 'RIDER_OFFERED', v_rider.full_name);
  return jsonb_build_object('ok', true, 'rider_id', v_rider.id, 'name', v_rider.full_name);
end;
$$;

create or replace function public.rider_respond(p_order uuid, p_accept boolean)
returns public.orders
language plpgsql security definer set search_path = public as $$
declare
  v_uid uuid := auth.uid();
  v_rider public.riders%rowtype;
  v_order public.orders%rowtype;
  v_code text;
begin
  select * into v_rider from public.riders where user_id = v_uid and status = 'APPROVED';
  if not found then raise exception 'Not an approved rider'; end if;
  select * into v_order from public.orders where id = p_order;

  if not p_accept then
    update public.rider_offers set status = 'DECLINED' where order_id = p_order and rider_id = v_rider.id;
    update public.orders set status = 'SEARCHING_RIDER' where id = p_order returning * into v_order;
    perform public.log_event(p_order, 'RIDER_DECLINED', v_rider.full_name);
    return v_order;
  end if;

  update public.rider_offers set status = 'ACCEPTED' where order_id = p_order and rider_id = v_rider.id;
  v_code := lpad((floor(random()*900000)+100000)::int::text, 6, '0');
  update public.orders
    set rider_id = v_rider.id,
        status = 'RIDER_ASSIGNED',
        delivery_otp_hash = encode(digest(v_code, 'sha256'), 'hex')
    where id = p_order
    returning * into v_order;
  update public.riders set current_order_id = p_order, is_online = true where id = v_rider.id;
  perform public.log_event(p_order, 'RIDER_ASSIGNED', v_rider.full_name);
  insert into public.delivery_otps (order_id, customer_id, code)
  values (p_order, v_order.customer_id, v_code)
  on conflict (order_id) do update set code = excluded.code, created_at = now();
  return v_order;
end;
$$;

-- Customer reads the current delivery OTP (from OTP_ISSUED event).
create or replace function public.customer_delivery_otp(p_order uuid)
returns text
language plpgsql stable security definer set search_path = public as $$
declare
  v_order public.orders%rowtype;
  v_code text;
begin
  select * into v_order from public.orders where id = p_order;
  if v_order.customer_id <> auth.uid() and not public.is_admin() then
    raise exception 'Forbidden';
  end if;
  select code into v_code from public.delivery_otps where order_id = p_order;
  return v_code;
end;
$$;

create or replace function public.confirm_pickup(p_order uuid)
returns public.orders
language plpgsql security definer set search_path = public as $$
declare
  v_rider public.riders%rowtype;
  v_order public.orders%rowtype;
begin
  select * into v_rider from public.riders where user_id = auth.uid() and status = 'APPROVED';
  select * into v_order from public.orders where id = p_order and rider_id = v_rider.id;
  if not found then raise exception 'Not your job'; end if;
  update public.orders set status = 'PICKED_UP' where id = p_order;
  update public.orders set status = 'OUT_FOR_DELIVERY' where id = p_order returning * into v_order;
  perform public.log_event(p_order, 'PICKED_UP', null);
  perform public.log_event(p_order, 'OUT_FOR_DELIVERY', null);
  return v_order;
end;
$$;

create or replace function public.verify_delivery_otp(p_order uuid, p_code text)
returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  v_rider public.riders%rowtype;
  v_order public.orders%rowtype;
  v_hash text;
begin
  select * into v_rider from public.riders where user_id = auth.uid() and status = 'APPROVED';
  if not found then raise exception 'Not an approved rider'; end if;
  select * into v_order from public.orders where id = p_order and rider_id = v_rider.id;
  if not found then raise exception 'Not your job'; end if;
  if v_order.status not in ('OUT_FOR_DELIVERY','PICKED_UP','RIDER_ASSIGNED') then
    raise exception 'Order is not out for delivery';
  end if;

  v_hash := encode(digest(trim(p_code), 'sha256'), 'hex');
  if v_order.delivery_otp_hash is null or v_order.delivery_otp_hash <> v_hash then
    perform public.log_event(p_order, 'OTP_FAILED', 'Wrong OTP');
    return jsonb_build_object('ok', false, 'reason', 'WRONG_OTP');
  end if;

  update public.orders set status = 'OTP_VERIFIED' where id = p_order;
  update public.orders set status = 'COMPLETED' where id = p_order returning * into v_order;
  update public.riders set current_order_id = null where id = v_rider.id;
  perform public.log_event(p_order, 'OTP_VERIFIED', null);
  perform public.log_event(p_order, 'COMPLETED', 'Settlement triggered');
  return jsonb_build_object('ok', true, 'status', 'COMPLETED');
end;
$$;

create or replace function public.apply_rider(
  p_full_name text,
  p_phone text,
  p_address text,
  p_vehicle text,
  p_licence text,
  p_ownership text
) returns public.riders
language plpgsql security definer set search_path = public as $$
declare
  v_row public.riders%rowtype;
begin
  if auth.uid() is null then raise exception 'Not signed in'; end if;
  if p_vehicle not in ('bicycle','motorbike') then raise exception 'Vehicle must be bicycle or motorbike'; end if;
  insert into public.riders (user_id, full_name, phone, address_text, vehicle_type, licence_info, ownership_note, status)
  values (auth.uid(), p_full_name, p_phone, p_address, p_vehicle, p_licence, p_ownership, 'PENDING')
  on conflict (user_id) do update
    set full_name = excluded.full_name,
        phone = excluded.phone,
        address_text = excluded.address_text,
        vehicle_type = excluded.vehicle_type,
        licence_info = excluded.licence_info,
        ownership_note = excluded.ownership_note,
        status = case when public.riders.status = 'APPROVED' then public.riders.status else 'PENDING' end
  returning * into v_row;
  return v_row;
end;
$$;

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
