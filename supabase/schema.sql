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
  licence_front_url text,
  licence_back_url text,
  ownership_note text,
  smartphone_confirmed boolean not null default true,
  status text not null default 'PENDING' check (status in ('PENDING','APPROVED','REJECTED','SUSPENDED')),
  is_online boolean not null default false,
  current_order_id uuid,
  photo_url text,
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
  home_banner_url text,
  vendor_timeout_minutes int not null default 10,
  rider_timeout_minutes int not null default 5,
  customer_wait_minutes int not null default 10
);

insert into public.settings (id) values (1) on conflict (id) do nothing;

create table if not exists public.banners (
  id uuid primary key default gen_random_uuid(),
  image_url text,
  title text,
  amount numeric(12,2),
  sort_order int not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

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
  payment_reference text,
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

-- Payouts (created when OTP completes the order)
create table if not exists public.payouts (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  payee_type text not null check (payee_type in ('vendor','rider')),
  payee_id uuid not null,
  amount numeric(12,2) not null,
  reference text unique not null,
  status text not null default 'PENDING' check (status in ('PENDING','SENT','FAILED','MANUAL')),
  lipila_response jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create table if not exists public.delivery_otp_private (
  order_id uuid primary key references public.orders(id) on delete cascade,
  hash text not null,
  failed_attempts int not null default 0,
  locked boolean not null default false
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
  v_is_server boolean := (auth.role() = 'service_role');
begin
  if auth.uid() is null and not v_is_server then raise exception 'Not signed in'; end if;
  select * into v_order from public.orders where id = p_order;
  if not found then raise exception 'Order not found'; end if;
  if not v_is_server and v_order.customer_id <> auth.uid() and not public.is_admin() then
    raise exception 'Forbidden';
  end if;
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
  v_my_rider uuid;
  v_is_server boolean := (auth.role() = 'service_role');
  v_allowed boolean := false;
begin
  select * into v_order from public.orders where id = p_order;
  if not found then raise exception 'Order not found'; end if;

  select id into v_my_rider from public.riders where user_id = auth.uid() and status = 'APPROVED';

  v_allowed := v_is_server
    or public.is_admin()
    or v_order.customer_id = auth.uid()
    or (v_my_rider is not null and exists (
         select 1 from public.rider_offers
         where order_id = p_order and rider_id = v_my_rider
       ));

  if not v_allowed then raise exception 'Forbidden'; end if;

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

  insert into public.delivery_otp_private (order_id, hash, failed_attempts, locked)
  values (p_order, encode(digest(v_code, 'sha256'), 'hex'), 0, false)
  on conflict (order_id) do update
    set hash = excluded.hash, failed_attempts = 0, locked = false;

  perform set_config('matebeto.allow_rider_update', 'true', true);
  update public.orders
    set rider_id = v_rider.id,
        status = 'RIDER_ASSIGNED'
    where id = p_order
    returning * into v_order;
  update public.riders set current_order_id = p_order, is_online = true where id = v_rider.id;
  perform set_config('matebeto.allow_rider_update', 'false', true);

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
  v_secret public.delivery_otp_private%rowtype;
  v_hash text;
begin
  select * into v_rider from public.riders where user_id = auth.uid() and status = 'APPROVED';
  if not found then raise exception 'Not an approved rider'; end if;
  select * into v_order from public.orders where id = p_order and rider_id = v_rider.id;
  if not found then raise exception 'Not your job'; end if;
  if v_order.status not in ('OUT_FOR_DELIVERY','PICKED_UP','RIDER_ASSIGNED') then
    raise exception 'Order is not out for delivery';
  end if;

  select * into v_secret from public.delivery_otp_private where order_id = p_order;
  if not found or v_secret.locked then
    perform public.log_event(p_order, 'OTP_LOCKED', 'Already locked or missing');
    return jsonb_build_object('ok', false, 'reason', 'LOCKED');
  end if;

  v_hash := encode(digest(trim(p_code), 'sha256'), 'hex');
  if v_secret.hash <> v_hash then
    update public.delivery_otp_private
      set failed_attempts = failed_attempts + 1
      where order_id = p_order
      returning * into v_secret;

    perform public.log_event(p_order, 'OTP_FAILED', 'Wrong OTP');

    if v_secret.failed_attempts >= 5 then
      update public.delivery_otp_private set locked = true where order_id = p_order;
      update public.orders set status = 'SUPPORT_REQUIRED' where id = p_order;
      perform public.log_event(p_order, 'OTP_LOCKED', '5 wrong codes — support required');
      return jsonb_build_object('ok', false, 'reason', 'LOCKED_AFTER_5');
    end if;

    return jsonb_build_object('ok', false, 'reason', 'WRONG_OTP', 'attempts_left', 5 - v_secret.failed_attempts);
  end if;

  -- Correct
  perform set_config('matebeto.allow_rider_update', 'true', true);
  update public.orders set status = 'OTP_VERIFIED' where id = p_order;
  update public.orders set status = 'COMPLETED' where id = p_order returning * into v_order;
  update public.riders set current_order_id = null where id = v_rider.id;
  perform set_config('matebeto.allow_rider_update', 'false', true);
  perform public.log_event(p_order, 'OTP_VERIFIED', null);
  perform public.log_event(p_order, 'COMPLETED', 'Settlement triggered');
  perform public.create_payout_records(p_order);
  return jsonb_build_object('ok', true, 'status', 'COMPLETED');
end;
$$;

-- Admin-only reset of OTP lock
create or replace function public.reset_delivery_lock(p_order uuid)
returns jsonb
language plpgsql security definer set search_path = public as $$
begin
  if not public.is_admin() then
    raise exception 'Admin only';
  end if;
  update public.delivery_otp_private
    set failed_attempts = 0, locked = false
    where order_id = p_order;
  update public.orders
    set status = 'OUT_FOR_DELIVERY'
    where id = p_order and status = 'SUPPORT_REQUIRED';
  perform public.log_event(p_order, 'OTP_LOCK_RESET', 'Admin reset');
  return jsonb_build_object('ok', true);
end;
$$;

-- Authorized vendor name lookup (customer / assigned rider / admin)
create or replace function public.order_vendor_name(p_order uuid)
returns text
language plpgsql stable security definer set search_path = public as $$
declare
  v_order public.orders%rowtype;
  v_name text;
  v_rider_id uuid;
begin
  select * into v_order from public.orders where id = p_order;
  if not found then return null; end if;

  select id into v_rider_id from public.riders where user_id = auth.uid();
  if v_order.customer_id <> auth.uid()
     and not public.is_admin()
     and (v_rider_id is null or v_order.rider_id is distinct from v_rider_id) then
    raise exception 'Forbidden';
  end if;

  select name into v_name from public.vendors where id = v_order.vendor_id;
  return v_name;
end;
$$;

-- Protect sensitive rider columns from non-admin direct updates
create or replace function public.prevent_rider_sensitive_update()
returns trigger language plpgsql as $$
begin
  if public.is_admin() or current_setting('matebeto.allow_rider_update', true) = 'true' then
    return new;
  end if;
  if old.status is distinct from new.status
     or old.user_id is distinct from new.user_id
     or old.vehicle_type is distinct from new.vehicle_type
     or old.current_order_id is distinct from new.current_order_id then
    raise exception 'You cannot change rider status, user, vehicle type or current order';
  end if;
  return new;
end;
$$;

drop trigger if exists riders_protect_sensitive on public.riders;
create trigger riders_protect_sensitive
  before update on public.riders
  for each row execute function public.prevent_rider_sensitive_update();

create or replace function public.apply_rider(
  p_full_name text,
  p_phone text,
  p_address text,
  p_vehicle text,
  p_licence text,
  p_ownership text,
  p_licence_front text default null,
  p_licence_back text default null,
  p_photo text default null
) returns public.riders
language plpgsql security definer set search_path = public as $$
declare
  v_row public.riders%rowtype;
begin
  if auth.uid() is null then raise exception 'Not signed in'; end if;
  if p_vehicle not in ('bicycle','motorbike') then raise exception 'Vehicle must be bicycle or motorbike'; end if;
  insert into public.riders (
    user_id, full_name, phone, address_text, vehicle_type, licence_info, ownership_note,
    licence_front_url, licence_back_url, photo_url, status
  )
  values (
    auth.uid(), p_full_name, p_phone, p_address, p_vehicle, p_licence, p_ownership,
    p_licence_front, p_licence_back, p_photo, 'PENDING'
  )
  on conflict (user_id) do update
    set full_name = excluded.full_name,
        phone = excluded.phone,
        address_text = excluded.address_text,
        vehicle_type = excluded.vehicle_type,
        licence_info = excluded.licence_info,
        ownership_note = excluded.ownership_note,
        licence_front_url = excluded.licence_front_url,
        licence_back_url = excluded.licence_back_url,
        photo_url = coalesce(excluded.photo_url, public.riders.photo_url),
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
alter table public.banners enable row level security;
alter table public.orders enable row level security;
alter table public.order_items enable row level security;
alter table public.vendor_attempts enable row level security;
alter table public.rider_offers enable row level security;
alter table public.order_events enable row level security;
alter table public.delivery_otps enable row level security;
alter table public.delivery_otp_private enable row level security;
alter table public.payouts enable row level security;

create policy "profiles_self" on public.profiles for select to authenticated using (user_id = auth.uid() or public.is_admin());
create policy "profiles_self_upd" on public.profiles for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "profiles_self_ins" on public.profiles for insert to authenticated with check (user_id = auth.uid());

create policy "markets_read" on public.markets for select using (is_active = true or public.is_admin());
create policy "categories_read" on public.categories for select using (true);
create policy "meals_read" on public.meals for select using (is_available = true or public.is_admin());
create policy "sides_read" on public.meal_sides for select using (true);
create policy "vendors_admin" on public.vendors for select to authenticated using (public.is_admin());
create policy "vendor_meals_read" on public.vendor_meals for select using (true);
create policy "settings_read" on public.settings for select using (true);
create policy "banners_read" on public.banners for select using (is_active = true or public.is_admin());

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

create policy "payouts_admin" on public.payouts for select to authenticated using (public.is_admin());

create policy "admin_write_markets" on public.markets for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "admin_write_categories" on public.categories for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "admin_write_meals" on public.meals for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "admin_write_sides" on public.meal_sides for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "admin_write_vendors" on public.vendors for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "admin_write_vendor_meals" on public.vendor_meals for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "admin_write_riders" on public.riders for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "admin_write_settings" on public.settings for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "admin_write_banners" on public.banners for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "admin_write_admins" on public.platform_admins for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- Create payout records when order is completed by OTP
create or replace function public.create_payout_records(p_order uuid)
returns void
language plpgsql security definer set search_path = public as $$
declare
  v_order public.orders%rowtype;
  v_vendor_amount numeric;
  v_rider_amount numeric;
begin
  select * into v_order from public.orders where id = p_order;
  if not found or v_order.status <> 'COMPLETED' then return; end if;
  -- PLACEHOLDER — confirm amounts with client
  v_vendor_amount := v_order.food_total;
  v_rider_amount := v_order.delivery_fee;
  if v_order.vendor_id is not null then
    insert into public.payouts (order_id, payee_type, payee_id, amount, reference)
    values (p_order, 'vendor', v_order.vendor_id, v_vendor_amount, p_order || '-vendor')
    on conflict (reference) do nothing;
  end if;
  if v_order.rider_id is not null then
    insert into public.payouts (order_id, payee_type, payee_id, amount, reference)
    values (p_order, 'rider', v_order.rider_id, v_rider_amount, p_order || '-rider')
    on conflict (reference) do nothing;
  end if;
end;
$$;

-- Customer cancel before vendor accepts
create or replace function public.customer_cancel(p_order uuid)
returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  v_order public.orders%rowtype;
begin
  select * into v_order from public.orders where id = p_order;
  if v_order.customer_id <> auth.uid() and not public.is_admin() then raise exception 'Forbidden'; end if;
  if v_order.status not in ('CREATED','PAYMENT_CONFIRMED','SEARCHING_VENDOR','VENDOR_OFFERED') then
    return jsonb_build_object('ok', false, 'reason', 'Too late to cancel');
  end if;
  update public.orders set status = 'CANCELLED' where id = p_order;
  if v_order.payment_status = 'paid' then
    update public.orders set payment_status = 'refund_pending' where id = p_order;
  end if;
  perform public.log_event(p_order, 'CANCELLED', 'Customer cancelled');
  return jsonb_build_object('ok', true);
end;
$$;

-- Vendor cannot fulfil → re-offer same order number
create or replace function public.vendor_cannot_fulfil(p_order uuid)
returns jsonb
language plpgsql security definer set search_path = public as $$
begin
  if not public.is_admin() and auth.role() <> 'service_role' then raise exception 'Forbidden'; end if;
  update public.orders set vendor_id = null, status = 'SEARCHING_VENDOR' where id = p_order;
  perform public.log_event(p_order, 'VENDOR_CANNOT_FULFIL', null);
  return public.offer_next_vendor(p_order);
end;
$$;

-- Rider cannot finish → free rider, re-offer same order number
create or replace function public.rider_cannot_finish(p_order uuid)
returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  v_rider uuid;
begin
  if not public.is_admin() and auth.role() <> 'service_role' then raise exception 'Forbidden'; end if;
  select rider_id into v_rider from public.orders where id = p_order;
  if v_rider is not null then
    perform set_config('matebeto.allow_rider_update', 'true', true);
    update public.riders set current_order_id = null where id = v_rider;
    perform set_config('matebeto.allow_rider_update', 'false', true);
  end if;
  update public.orders set rider_id = null, status = 'SEARCHING_RIDER' where id = p_order;
  perform public.log_event(p_order, 'RIDER_CANNOT_FINISH', null);
  return public.offer_next_rider(p_order);
end;
$$;

-- Customer not at home
create or replace function public.customer_not_home(p_order uuid)
returns jsonb
language plpgsql security definer set search_path = public as $$
begin
  if not exists (
    select 1 from public.orders o join public.riders r on r.id = o.rider_id
    where o.id = p_order and r.user_id = auth.uid()
  ) then raise exception 'Not your job'; end if;
  update public.orders set status = 'CUSTOMER_NOT_HOME' where id = p_order;
  perform public.log_event(p_order, 'CUSTOMER_NOT_HOME', null);
  return jsonb_build_object('ok', true);
end;
$$;

-- Process vendor and rider timeouts (schedule with pg_cron)
create or replace function public.process_timeouts()
returns void
language plpgsql security definer set search_path = public as $$
declare
  v_settings public.settings%rowtype;
  v_attempt record;
  v_offer record;
  v_order record;
begin
  select * into v_settings from public.settings where id = 1;
  if not found then return; end if;

  for v_attempt in
    select va.*
    from public.vendor_attempts va
    join public.orders o on o.id = va.order_id
    where va.status = 'OFFERED'
      and o.status = 'VENDOR_OFFERED'
      and va.created_at < now() - (v_settings.vendor_timeout_minutes || ' minutes')::interval
  loop
    update public.vendor_attempts set status = 'TIMEOUT' where id = v_attempt.id;
    perform public.log_event(v_attempt.order_id, 'VENDOR_TIMEOUT', null);
    perform public.offer_next_vendor(v_attempt.order_id);
  end loop;

  -- customer not home → support after wait
  for v_order in
    select id from public.orders
    where status = 'CUSTOMER_NOT_HOME'
      and updated_at < now() - (v_settings.customer_wait_minutes || ' minutes')::interval
  loop
    update public.orders set status = 'SUPPORT_REQUIRED' where id = v_order.id;
    perform public.log_event(v_order.id, 'CUSTOMER_NOT_HOME_SUPPORT', null);
  end loop;
end;
$$;

grant usage on schema public to anon, authenticated;
grant select on public.markets, public.categories, public.meals, public.meal_sides, public.settings, public.banners to anon, authenticated;

-- Only the functions the app actually calls (is_admin kept for policies)
revoke execute on all functions in schema public from authenticated;
grant execute on function public.is_admin() to authenticated;
grant execute on function public.create_order(uuid, text, jsonb, jsonb) to authenticated;
grant execute on function public.offer_next_vendor(uuid) to authenticated;
grant execute on function public.offer_next_rider(uuid) to authenticated;
grant execute on function public.rider_respond(uuid, boolean) to authenticated;
grant execute on function public.confirm_pickup(uuid) to authenticated;
grant execute on function public.verify_delivery_otp(uuid, text) to authenticated;
grant execute on function public.customer_delivery_otp(uuid) to authenticated;
grant execute on function public.apply_rider(text, text, text, text, text, text, text, text, text) to authenticated;
grant execute on function public.respond_vendor(uuid, boolean, text) to authenticated;
grant execute on function public.order_vendor_name(uuid) to authenticated;
grant execute on function public.reset_delivery_lock(uuid) to authenticated;
grant execute on function public.customer_cancel(uuid) to authenticated;
grant execute on function public.customer_not_home(uuid) to authenticated;


-- ============================================================
-- FIX ROUND 1 (same content as migrations/20261010030000_fixes.sql)
-- Later definitions replace the earlier ones above, so a fresh install ends in the fixed state.
-- ============================================================
-- Fix round 1 (review fixes). Safe to run twice. Run on a Supabase branch/copy first.
-- Order of the migrations: 20261010000000 -> 20261010010000 -> 20261010020000 -> this file.


-- ============================================================
-- 0. New columns / settings
-- ============================================================
do $$
begin
  if not exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'vendor_attempts' and column_name = 'notified_at'
  ) then
    alter table public.vendor_attempts add column notified_at timestamptz;
    -- offers that already existed before this migration are treated as already messaged
    update public.vendor_attempts set notified_at = created_at;
  end if;
end $$;

alter table public.vendor_attempts add column if not exists notify_tries int not null default 0;
alter table public.settings add column if not exists payouts_enabled boolean not null default false;

-- payment_status must allow refund_pending (money received, order cancelled)
do $$
declare c record;
begin
  for c in
    select conname from pg_constraint
    where conrelid = 'public.orders'::regclass and contype = 'c'
      and pg_get_constraintdef(oid) ilike '%payment_status%'
  loop
    execute format('alter table public.orders drop constraint %I', c.conname);
  end loop;
  alter table public.orders add constraint orders_payment_status_check
    check (payment_status in ('unpaid','pending','paid','failed','refund_pending','refunded'));
end $$;

-- ============================================================
-- 1. offer_next_vendor: fail closed, idempotent, no vendor contacts for customers
-- ============================================================
create or replace function public.offer_next_vendor(p_order uuid)
returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  v_order public.orders%rowtype;
  v_vendor public.vendors%rowtype;
  v_uid uuid := auth.uid();
  v_is_server boolean := coalesce(auth.role(), '') = 'service_role';
begin
  if v_uid is null and not v_is_server then raise exception 'Not signed in'; end if;

  select * into v_order from public.orders where id = p_order for update;
  if not found then raise exception 'Order not found'; end if;

  if not v_is_server and not public.is_admin() and v_order.customer_id is distinct from v_uid then
    raise exception 'Forbidden';
  end if;
  if v_order.payment_status <> 'paid' then raise exception 'Payment not confirmed'; end if;

  -- Never start a second search while one is running or finished
  if exists (select 1 from public.vendor_attempts where order_id = p_order and status = 'OFFERED') then
    return jsonb_build_object('ok', false, 'reason', 'ALREADY_IN_PROGRESS', 'status', v_order.status);
  end if;
  if v_order.status not in ('PAYMENT_CONFIRMED', 'SEARCHING_VENDOR') then
    return jsonb_build_object('ok', false, 'reason', 'NOT_SEARCHING', 'status', v_order.status);
  end if;

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

  return jsonb_build_object('ok', true, 'vendor_id', v_vendor.id, 'attempt', v_order.vendor_attempts + 1)
    || case when v_is_server
         then jsonb_build_object('vendor_name', v_vendor.name, 'whatsapp', v_vendor.whatsapp, 'phone', v_vendor.phone)
         else '{}'::jsonb end;
end;
$$;

-- ============================================================
-- 2. respond_vendor: only while the order is waiting for that vendor
-- ============================================================
create or replace function public.respond_vendor(p_order uuid, p_accept boolean, p_reason text default null)
returns public.orders
language plpgsql security definer set search_path = public as $$
declare
  v_order public.orders%rowtype;
begin
  if not (public.is_admin() or coalesce(auth.role(), '') = 'service_role') then
    raise exception 'Forbidden';
  end if;

  select * into v_order from public.orders where id = p_order for update;
  if not found then raise exception 'Order not found'; end if;
  if v_order.status <> 'VENDOR_OFFERED' or v_order.vendor_id is null then
    raise exception 'Order is not waiting for a vendor reply';
  end if;
  if not exists (
    select 1 from public.vendor_attempts
    where order_id = p_order and vendor_id = v_order.vendor_id and status = 'OFFERED'
  ) then
    raise exception 'No open vendor offer for this order';
  end if;

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

-- ============================================================
-- 3. offer_next_rider: fail closed, no double offers
-- ============================================================
create or replace function public.offer_next_rider(p_order uuid)
returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  v_order public.orders%rowtype;
  v_rider public.riders%rowtype;
  v_uid uuid := auth.uid();
  v_my_rider uuid;
  v_is_server boolean := coalesce(auth.role(), '') = 'service_role';
  v_allowed boolean := false;
begin
  if v_uid is null and not v_is_server then raise exception 'Not signed in'; end if;

  select * into v_order from public.orders where id = p_order for update;
  if not found then raise exception 'Order not found'; end if;

  select id into v_my_rider from public.riders where user_id = v_uid and status = 'APPROVED';

  v_allowed := v_is_server
    or public.is_admin()
    or (v_uid is not null and v_order.customer_id = v_uid)
    or (v_my_rider is not null and exists (
         select 1 from public.rider_offers where order_id = p_order and rider_id = v_my_rider
       ));
  if not coalesce(v_allowed, false) then raise exception 'Forbidden'; end if;

  if v_order.status not in ('VENDOR_ACCEPTED', 'SEARCHING_RIDER', 'NO_RIDER_AVAILABLE') then
    raise exception 'Order is not ready for a rider';
  end if;
  if v_order.rider_id is not null then
    return jsonb_build_object('ok', false, 'reason', 'ALREADY_ASSIGNED');
  end if;
  if exists (select 1 from public.rider_offers where order_id = p_order and status = 'OFFERED') then
    return jsonb_build_object('ok', false, 'reason', 'ALREADY_IN_PROGRESS');
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

-- ============================================================
-- 4. rider_respond: only the rider who was offered the job, only while it is open
-- ============================================================
create or replace function public.rider_respond(p_order uuid, p_accept boolean)
returns public.orders
language plpgsql security definer set search_path = public, extensions as $$
declare
  v_uid uuid := auth.uid();
  v_rider public.riders%rowtype;
  v_order public.orders%rowtype;
  v_offer public.rider_offers%rowtype;
  v_code text;
begin
  if v_uid is null then raise exception 'Not signed in'; end if;
  select * into v_rider from public.riders where user_id = v_uid and status = 'APPROVED';
  if not found then raise exception 'Not an approved rider'; end if;

  select * into v_order from public.orders where id = p_order for update;
  if not found then raise exception 'Order not found'; end if;

  select * into v_offer from public.rider_offers
    where order_id = p_order and rider_id = v_rider.id and status = 'OFFERED'
    order by created_at desc limit 1 for update;
  if not found then raise exception 'This job was not offered to you, or it is no longer available'; end if;
  if v_order.status <> 'SEARCHING_RIDER' or v_order.rider_id is not null then
    raise exception 'This job is no longer available';
  end if;

  if not p_accept then
    update public.rider_offers set status = 'DECLINED' where id = v_offer.id;
    perform public.log_event(p_order, 'RIDER_DECLINED', v_rider.full_name);
    return v_order;
  end if;

  if v_rider.current_order_id is not null then raise exception 'You already have an active job'; end if;

  update public.rider_offers set status = 'ACCEPTED' where id = v_offer.id;
  v_code := lpad((floor(random() * 900000) + 100000)::int::text, 6, '0');

  insert into public.delivery_otp_private (order_id, hash, failed_attempts, locked)
  values (p_order, encode(digest(v_code, 'sha256'), 'hex'), 0, false)
  on conflict (order_id) do update
    set hash = excluded.hash, failed_attempts = 0, locked = false;

  perform set_config('matebeto.allow_rider_update', 'true', true);
  update public.orders
    set rider_id = v_rider.id, status = 'RIDER_ASSIGNED'
    where id = p_order
    returning * into v_order;
  update public.riders set current_order_id = p_order, is_online = true where id = v_rider.id;
  perform set_config('matebeto.allow_rider_update', 'false', true);

  perform public.log_event(p_order, 'RIDER_ASSIGNED', v_rider.full_name);
  insert into public.delivery_otps (order_id, customer_id, code)
  values (p_order, v_order.customer_id, v_code)
  on conflict (order_id) do update set code = excluded.code, created_at = now();
  return v_order;
end;
$$;

-- ============================================================
-- 5. confirm_pickup: only from RIDER_ASSIGNED
-- ============================================================
create or replace function public.confirm_pickup(p_order uuid)
returns public.orders
language plpgsql security definer set search_path = public as $$
declare
  v_rider public.riders%rowtype;
  v_order public.orders%rowtype;
begin
  if auth.uid() is null then raise exception 'Not signed in'; end if;
  select * into v_rider from public.riders where user_id = auth.uid() and status = 'APPROVED';
  if not found then raise exception 'Not an approved rider'; end if;
  select * into v_order from public.orders where id = p_order and rider_id = v_rider.id for update;
  if not found then raise exception 'Not your job'; end if;

  if v_order.status in ('PICKED_UP', 'OUT_FOR_DELIVERY') then return v_order; end if;
  if v_order.status <> 'RIDER_ASSIGNED' then raise exception 'Order is not ready for pickup'; end if;

  update public.orders set status = 'PICKED_UP' where id = p_order;
  update public.orders set status = 'OUT_FOR_DELIVERY' where id = p_order returning * into v_order;
  perform public.log_event(p_order, 'PICKED_UP', null);
  perform public.log_event(p_order, 'OUT_FOR_DELIVERY', null);
  return v_order;
end;
$$;

-- ============================================================
-- 6. verify_delivery_otp: serialised guesses, works after "customer not home",
--    creates payout records in the same transaction
-- ============================================================
create or replace function public.verify_delivery_otp(p_order uuid, p_code text)
returns jsonb
language plpgsql security definer set search_path = public, extensions as $$
declare
  v_rider public.riders%rowtype;
  v_order public.orders%rowtype;
  v_secret public.delivery_otp_private%rowtype;
  v_hash text;
begin
  if auth.uid() is null then raise exception 'Not signed in'; end if;
  select * into v_rider from public.riders where user_id = auth.uid() and status = 'APPROVED';
  if not found then raise exception 'Not an approved rider'; end if;
  select * into v_order from public.orders where id = p_order and rider_id = v_rider.id for update;
  if not found then raise exception 'Not your job'; end if;
  if v_order.status not in ('OUT_FOR_DELIVERY', 'PICKED_UP', 'RIDER_ASSIGNED', 'CUSTOMER_NOT_HOME') then
    raise exception 'Order is not out for delivery';
  end if;

  -- row lock: parallel guesses cannot slip past the 5-attempt limit
  select * into v_secret from public.delivery_otp_private where order_id = p_order for update;
  if not found or v_secret.locked then
    perform public.log_event(p_order, 'OTP_LOCKED', 'Already locked or missing');
    return jsonb_build_object('ok', false, 'reason', 'LOCKED');
  end if;

  v_hash := encode(digest(trim(coalesce(p_code, '')), 'sha256'), 'hex');
  if v_secret.hash <> v_hash then
    update public.delivery_otp_private
      set failed_attempts = failed_attempts + 1
      where order_id = p_order
      returning * into v_secret;
    perform public.log_event(p_order, 'OTP_FAILED', 'Wrong OTP');

    if v_secret.failed_attempts >= 5 then
      update public.delivery_otp_private set locked = true where order_id = p_order;
      update public.orders set status = 'SUPPORT_REQUIRED' where id = p_order;
      perform public.log_event(p_order, 'OTP_LOCKED', '5 wrong codes - support required');
      return jsonb_build_object('ok', false, 'reason', 'LOCKED_AFTER_5');
    end if;
    return jsonb_build_object('ok', false, 'reason', 'WRONG_OTP', 'attempts_left', 5 - v_secret.failed_attempts);
  end if;

  perform set_config('matebeto.allow_rider_update', 'true', true);
  update public.orders set status = 'OTP_VERIFIED' where id = p_order;
  update public.orders set status = 'COMPLETED' where id = p_order returning * into v_order;
  update public.riders set current_order_id = null where id = v_rider.id;
  perform set_config('matebeto.allow_rider_update', 'false', true);

  perform public.log_event(p_order, 'OTP_VERIFIED', null);
  perform public.create_payout_records(p_order);
  perform public.log_event(p_order, 'COMPLETED', 'Delivery confirmed. Payout records created.');
  return jsonb_build_object('ok', true, 'status', 'COMPLETED');
end;
$$;

-- ============================================================
-- 7. Customer OTP and vendor name: fail closed
-- ============================================================
create or replace function public.customer_delivery_otp(p_order uuid)
returns text
language plpgsql stable security definer set search_path = public as $$
declare
  v_order public.orders%rowtype;
  v_code text;
begin
  if auth.uid() is null then raise exception 'Not signed in'; end if;
  select * into v_order from public.orders where id = p_order;
  if not found then raise exception 'Forbidden'; end if;
  if v_order.customer_id is distinct from auth.uid() and not public.is_admin() then
    raise exception 'Forbidden';
  end if;
  select code into v_code from public.delivery_otps where order_id = p_order;
  return v_code;
end;
$$;

-- Only the assigned rider or an admin (customers do not need the vendor name)
create or replace function public.order_vendor_name(p_order uuid)
returns text
language plpgsql stable security definer set search_path = public as $$
declare
  v_order public.orders%rowtype;
  v_rider_id uuid;
  v_name text;
begin
  if auth.uid() is null then raise exception 'Not signed in'; end if;
  select * into v_order from public.orders where id = p_order;
  if not found then return null; end if;
  select id into v_rider_id from public.riders where user_id = auth.uid();
  if not (public.is_admin() or (v_rider_id is not null and v_order.rider_id = v_rider_id)) then
    raise exception 'Forbidden';
  end if;
  select name into v_name from public.vendors where id = v_order.vendor_id;
  return v_name;
end;
$$;

-- ============================================================
-- 8. apply_rider: re-apply after rejection works; vehicle change needs re-approval
-- ============================================================
create or replace function public.apply_rider(
  p_full_name text, p_phone text, p_address text, p_vehicle text, p_licence text,
  p_ownership text, p_licence_front text default null, p_licence_back text default null,
  p_photo text default null
) returns public.riders
language plpgsql security definer set search_path = public as $$
declare
  v_row public.riders%rowtype;
begin
  if auth.uid() is null then raise exception 'Not signed in'; end if;
  if p_vehicle not in ('bicycle', 'motorbike') then raise exception 'Vehicle must be bicycle or motorbike'; end if;

  perform set_config('matebeto.allow_rider_update', 'true', true);
  insert into public.riders (
    user_id, full_name, phone, address_text, vehicle_type, licence_info, ownership_note,
    licence_front_url, licence_back_url, photo_url, status
  )
  values (
    auth.uid(), p_full_name, p_phone, p_address, p_vehicle, p_licence, p_ownership,
    p_licence_front, p_licence_back, p_photo, 'PENDING'
  )
  on conflict (user_id) do update
    set full_name = excluded.full_name,
        phone = excluded.phone,
        address_text = excluded.address_text,
        vehicle_type = case when public.riders.status = 'SUSPENDED' then public.riders.vehicle_type else excluded.vehicle_type end,
        licence_info = excluded.licence_info,
        ownership_note = excluded.ownership_note,
        licence_front_url = excluded.licence_front_url,
        licence_back_url = excluded.licence_back_url,
        photo_url = coalesce(excluded.photo_url, public.riders.photo_url),
        status = case
          when public.riders.status = 'SUSPENDED' then 'SUSPENDED'
          when public.riders.status = 'APPROVED' and public.riders.vehicle_type = excluded.vehicle_type then 'APPROVED'
          else 'PENDING' end,
        is_online = case
          when public.riders.status = 'APPROVED' and public.riders.vehicle_type = excluded.vehicle_type
          then public.riders.is_online else false end
  returning * into v_row;
  perform set_config('matebeto.allow_rider_update', 'false', true);
  return v_row;
end;
$$;

-- ============================================================
-- 9. Cancel, refund, problems, reassignment
-- ============================================================
create or replace function public.customer_cancel(p_order uuid)
returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  v_order public.orders%rowtype;
begin
  if auth.uid() is null then raise exception 'Not signed in'; end if;
  select * into v_order from public.orders where id = p_order for update;
  if not found then raise exception 'Order not found'; end if;
  if v_order.customer_id is distinct from auth.uid() and not public.is_admin() then
    raise exception 'Forbidden';
  end if;
  if v_order.status not in ('CREATED', 'PAYMENT_CONFIRMED', 'SEARCHING_VENDOR', 'VENDOR_OFFERED', 'NO_VENDOR_FOUND') then
    return jsonb_build_object('ok', false, 'reason', 'Too late to cancel. Please contact support.');
  end if;

  update public.vendor_attempts set status = 'DECLINED' where order_id = p_order and status = 'OFFERED';
  update public.orders
    set status = 'CANCELLED',
        payment_status = case when payment_status = 'paid' then 'refund_pending' else payment_status end
    where id = p_order;
  perform public.log_event(p_order, 'CANCELLED', 'Customer cancelled');
  return jsonb_build_object('ok', true, 'refund_pending', v_order.payment_status = 'paid');
end;
$$;

create or replace function public.admin_cancel_order(p_order uuid)
returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  v_order public.orders%rowtype;
begin
  if not public.is_admin() then raise exception 'Admin only'; end if;
  select * into v_order from public.orders where id = p_order for update;
  if not found then raise exception 'Order not found'; end if;
  if v_order.status in ('COMPLETED', 'CANCELLED') then
    return jsonb_build_object('ok', false, 'reason', 'Order is already ' || v_order.status);
  end if;

  if v_order.rider_id is not null then
    perform set_config('matebeto.allow_rider_update', 'true', true);
    update public.riders set current_order_id = null where id = v_order.rider_id and current_order_id = p_order;
    perform set_config('matebeto.allow_rider_update', 'false', true);
  end if;
  update public.vendor_attempts set status = 'DECLINED' where order_id = p_order and status = 'OFFERED';
  update public.rider_offers set status = 'DECLINED' where order_id = p_order and status = 'OFFERED';
  update public.orders
    set status = 'CANCELLED',
        payment_status = case when payment_status = 'paid' then 'refund_pending' else payment_status end
    where id = p_order;
  perform public.log_event(p_order, 'CANCELLED', 'Cancelled by admin');
  return jsonb_build_object('ok', true);
end;
$$;

create or replace function public.admin_mark_refunded(p_order uuid)
returns jsonb
language plpgsql security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'Admin only'; end if;
  update public.orders set payment_status = 'refunded' where id = p_order and payment_status = 'refund_pending';
  if not found then return jsonb_build_object('ok', false, 'reason', 'Order is not waiting for a refund'); end if;
  perform public.log_event(p_order, 'REFUNDED', 'Marked refunded by admin');
  return jsonb_build_object('ok', true);
end;
$$;

create or replace function public.vendor_cannot_fulfil(p_order uuid)
returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  v_order public.orders%rowtype;
begin
  if not (public.is_admin() or coalesce(auth.role(), '') = 'service_role') then
    raise exception 'Forbidden';
  end if;
  select * into v_order from public.orders where id = p_order for update;
  if not found then raise exception 'Order not found'; end if;
  if v_order.status not in ('VENDOR_ACCEPTED', 'SEARCHING_RIDER', 'NO_RIDER_AVAILABLE', 'RIDER_ASSIGNED') then
    return jsonb_build_object('ok', false, 'reason', 'Food has already left the vendor or the order is not active');
  end if;

  if v_order.rider_id is not null then
    perform set_config('matebeto.allow_rider_update', 'true', true);
    update public.riders set current_order_id = null where id = v_order.rider_id and current_order_id = p_order;
    perform set_config('matebeto.allow_rider_update', 'false', true);
  end if;
  update public.vendor_attempts set status = 'UNAVAILABLE'
    where order_id = p_order and vendor_id = v_order.vendor_id and status = 'ACCEPTED';
  update public.rider_offers set status = 'DECLINED' where order_id = p_order and status in ('OFFERED', 'ACCEPTED');

  update public.orders set vendor_id = null, rider_id = null, status = 'SEARCHING_VENDOR' where id = p_order;
  perform public.log_event(p_order, 'VENDOR_CANNOT_FULFIL', 'Re-offering the whole basket');
  return public.offer_next_vendor(p_order);
end;
$$;

create or replace function public.rider_cannot_finish(p_order uuid)
returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  v_order public.orders%rowtype;
begin
  if not (public.is_admin() or coalesce(auth.role(), '') = 'service_role') then
    raise exception 'Forbidden';
  end if;
  select * into v_order from public.orders where id = p_order for update;
  if not found then raise exception 'Order not found'; end if;
  if v_order.status not in ('RIDER_ASSIGNED', 'PICKED_UP', 'OUT_FOR_DELIVERY', 'CUSTOMER_NOT_HOME', 'SUPPORT_REQUIRED') then
    return jsonb_build_object('ok', false, 'reason', 'Order has no rider to replace');
  end if;

  if v_order.rider_id is not null then
    perform set_config('matebeto.allow_rider_update', 'true', true);
    update public.riders set current_order_id = null where id = v_order.rider_id and current_order_id = p_order;
    perform set_config('matebeto.allow_rider_update', 'false', true);
  end if;
  update public.rider_offers set status = 'DECLINED' where order_id = p_order and status in ('OFFERED', 'ACCEPTED');

  update public.orders set rider_id = null, status = 'SEARCHING_RIDER' where id = p_order;
  perform public.log_event(p_order, 'RIDER_CANNOT_FINISH', 'Re-offering to the next rider');
  return public.offer_next_rider(p_order);
end;
$$;

create or replace function public.customer_not_home(p_order uuid)
returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  v_order public.orders%rowtype;
begin
  if auth.uid() is null then raise exception 'Not signed in'; end if;
  select o.* into v_order
    from public.orders o join public.riders r on r.id = o.rider_id
    where o.id = p_order and r.user_id = auth.uid()
    for update of o;
  if not found then raise exception 'Not your job'; end if;
  if v_order.status <> 'OUT_FOR_DELIVERY' then
    raise exception 'You can only report this while out for delivery';
  end if;
  update public.orders set status = 'CUSTOMER_NOT_HOME' where id = p_order;
  perform public.log_event(p_order, 'CUSTOMER_NOT_HOME', 'Waiting for customer');
  return jsonb_build_object('ok', true, 'wait_minutes', (select customer_wait_minutes from public.settings where id = 1));
end;
$$;

create or replace function public.rider_report_problem(p_order uuid, p_reason text default null)
returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  v_order public.orders%rowtype;
begin
  if auth.uid() is null then raise exception 'Not signed in'; end if;
  select o.* into v_order
    from public.orders o join public.riders r on r.id = o.rider_id
    where o.id = p_order and r.user_id = auth.uid()
    for update of o;
  if not found then raise exception 'Not your job'; end if;
  if v_order.status not in ('RIDER_ASSIGNED', 'PICKED_UP', 'OUT_FOR_DELIVERY', 'CUSTOMER_NOT_HOME') then
    raise exception 'This order is not an active delivery';
  end if;
  update public.orders set status = 'SUPPORT_REQUIRED' where id = p_order;
  perform public.log_event(p_order, 'RIDER_PROBLEM', left(coalesce(p_reason, 'Rider reported a problem'), 200));
  return jsonb_build_object('ok', true);
end;
$$;

-- ============================================================
-- 10. Timeouts (server only). One failing order never stops the rest.
-- ============================================================
create or replace function public.process_timeouts()
returns void
language plpgsql security definer set search_path = public as $$
declare
  v_set public.settings%rowtype;
  r record;
begin
  if coalesce(auth.role(), '') <> 'service_role' then raise exception 'Server only'; end if;
  select * into v_set from public.settings where id = 1;
  if not found then return; end if;

  -- vendor never answered: next vendor (still max 3). The WhatsApp message goes out via the outbox.
  for r in
    select va.id, va.order_id
    from public.vendor_attempts va join public.orders o on o.id = va.order_id
    where va.status = 'OFFERED' and o.status = 'VENDOR_OFFERED'
      and va.created_at < now() - make_interval(mins => v_set.vendor_timeout_minutes)
  loop
    begin
      update public.vendor_attempts set status = 'TIMEOUT' where id = r.id and status = 'OFFERED';
      if found then
        perform public.log_event(r.order_id, 'VENDOR_TIMEOUT', null);
        update public.orders set vendor_id = null, status = 'SEARCHING_VENDOR'
          where id = r.order_id and status = 'VENDOR_OFFERED';
        perform public.offer_next_vendor(r.order_id);
      end if;
    exception when others then
      perform public.log_event(r.order_id, 'TIMEOUT_ERROR', left(sqlerrm, 200));
    end;
  end loop;

  -- rider never answered: next rider
  for r in
    select ro.id, ro.order_id
    from public.rider_offers ro join public.orders o on o.id = ro.order_id
    where ro.status = 'OFFERED' and o.status = 'SEARCHING_RIDER'
      and ro.created_at < now() - make_interval(mins => v_set.rider_timeout_minutes)
  loop
    begin
      update public.rider_offers set status = 'DECLINED' where id = r.id and status = 'OFFERED';
      if found then
        perform public.log_event(r.order_id, 'RIDER_TIMEOUT', null);
        perform public.offer_next_rider(r.order_id);
      end if;
    exception when others then
      perform public.log_event(r.order_id, 'TIMEOUT_ERROR', left(sqlerrm, 200));
    end;
  end loop;

  -- safety net: paid orders that never got a vendor offer
  for r in
    select id from public.orders
    where payment_status = 'paid' and status in ('PAYMENT_CONFIRMED', 'SEARCHING_VENDOR')
      and updated_at < now() - interval '1 minute'
  loop
    begin
      perform public.offer_next_vendor(r.id);
    exception when others then
      perform public.log_event(r.id, 'TIMEOUT_ERROR', left(sqlerrm, 200));
    end;
  end loop;

  -- safety net: accepted orders that never got a rider offer
  for r in
    select id from public.orders
    where status = 'VENDOR_ACCEPTED' and updated_at < now() - interval '1 minute'
  loop
    begin
      perform public.offer_next_rider(r.id);
    exception when others then
      perform public.log_event(r.id, 'TIMEOUT_ERROR', left(sqlerrm, 200));
    end;
  end loop;

  -- customer not home: after the wait, hand over to support (never completes, never pays)
  for r in
    select id from public.orders
    where status = 'CUSTOMER_NOT_HOME'
      and updated_at < now() - make_interval(mins => v_set.customer_wait_minutes)
  loop
    begin
      update public.orders set status = 'SUPPORT_REQUIRED' where id = r.id and status = 'CUSTOMER_NOT_HOME';
      perform public.log_event(r.id, 'CUSTOMER_NOT_HOME_SUPPORT', 'Customer not home after the wait');
    exception when others then
      perform public.log_event(r.id, 'TIMEOUT_ERROR', left(sqlerrm, 200));
    end;
  end loop;
end;
$$;

-- ============================================================
-- 11. Function permissions (closed by default; migrations 2 and 3 were left open)
-- ============================================================
revoke execute on all functions in schema public from public, anon, authenticated;
alter default privileges in schema public revoke execute on functions from public, anon, authenticated;

grant execute on all functions in schema public to service_role;
alter default privileges in schema public grant execute on functions to service_role;

-- RLS policies call this one, including for signed-out users
grant execute on function public.is_admin() to anon, authenticated;

grant execute on function public.create_order(uuid, text, jsonb, jsonb) to authenticated;
grant execute on function public.offer_next_vendor(uuid) to authenticated;
grant execute on function public.offer_next_rider(uuid) to authenticated;
grant execute on function public.respond_vendor(uuid, boolean, text) to authenticated;
grant execute on function public.rider_respond(uuid, boolean) to authenticated;
grant execute on function public.confirm_pickup(uuid) to authenticated;
grant execute on function public.verify_delivery_otp(uuid, text) to authenticated;
grant execute on function public.customer_delivery_otp(uuid) to authenticated;
grant execute on function public.order_vendor_name(uuid) to authenticated;
grant execute on function public.apply_rider(text, text, text, text, text, text, text, text, text) to authenticated;
grant execute on function public.customer_cancel(uuid) to authenticated;
grant execute on function public.customer_not_home(uuid) to authenticated;
grant execute on function public.rider_report_problem(uuid, text) to authenticated;
-- admin screen (each one checks is_admin() inside)
grant execute on function public.reset_delivery_lock(uuid) to authenticated;
grant execute on function public.vendor_cannot_fulfil(uuid) to authenticated;
grant execute on function public.rider_cannot_finish(uuid) to authenticated;
grant execute on function public.admin_cancel_order(uuid) to authenticated;
grant execute on function public.admin_mark_refunded(uuid) to authenticated;
-- internal only (no grant): log_event, capable_vendors, create_payout_records, process_timeouts,
-- touch_order, handle_new_user, prevent_rider_sensitive_update

