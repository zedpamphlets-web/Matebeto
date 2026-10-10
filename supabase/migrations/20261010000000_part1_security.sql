-- Part 1: Security fixes
-- Safe to run twice. Wrapped in begin/commit.

begin;

-- ============================================================
-- 1. Private delivery OTP hash table (no app user can read it)
-- ============================================================
create table if not exists public.delivery_otp_private (
  order_id uuid primary key references public.orders(id) on delete cascade,
  hash text not null,
  failed_attempts int not null default 0,
  locked boolean not null default false
);

alter table public.delivery_otp_private enable row level security;
-- No SELECT policy for authenticated/anon → only service_role / definer functions can read.

-- Move existing hashes and empty the public column
insert into public.delivery_otp_private (order_id, hash)
select id, delivery_otp_hash
from public.orders
where delivery_otp_hash is not null
on conflict (order_id) do nothing;

update public.orders
set delivery_otp_hash = null
where delivery_otp_hash is not null;

-- ============================================================
-- 2. Updated rider_respond: store hash in private table
-- ============================================================
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

  -- Store hash privately; do not put it on the orders row
  insert into public.delivery_otp_private (order_id, hash, failed_attempts, locked)
  values (p_order, encode(digest(v_code, 'sha256'), 'hex'), 0, false)
  on conflict (order_id) do update
    set hash = excluded.hash, failed_attempts = 0, locked = false;

  update public.orders
    set rider_id = v_rider.id,
        status = 'RIDER_ASSIGNED'
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

-- ============================================================
-- 3. Updated verify_delivery_otp: 5-wrong-guess lock + SUPPORT_REQUIRED
-- ============================================================
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
  update public.orders set status = 'OTP_VERIFIED' where id = p_order;
  update public.orders set status = 'COMPLETED' where id = p_order returning * into v_order;
  update public.riders set current_order_id = null where id = v_rider.id;
  perform public.log_event(p_order, 'OTP_VERIFIED', null);
  perform public.log_event(p_order, 'COMPLETED', 'Settlement triggered');
  return jsonb_build_object('ok', true, 'status', 'COMPLETED');
end;
$$;

-- ============================================================
-- 4. Admin-only reset of OTP lock
-- ============================================================
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

-- ============================================================
-- 5. Rider sensitive-column protection (trigger)
--    Allows is_online changes; blocks status / user_id / vehicle_type / current_order_id
--    for non-admins. Functions set a session flag to bypass.
-- ============================================================
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

-- Update functions that legitimately change current_order_id to set the flag
-- (rider_respond already updated above; also confirm_pickup / verify clear it)

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

-- In verify we already clear current_order_id; add flag there too (recreate with flag)
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

  -- Correct — clear rider assignment with flag
  perform set_config('matebeto.allow_rider_update', 'true', true);
  update public.orders set status = 'OTP_VERIFIED' where id = p_order;
  update public.orders set status = 'COMPLETED' where id = p_order returning * into v_order;
  update public.riders set current_order_id = null where id = v_rider.id;
  perform set_config('matebeto.allow_rider_update', 'false', true);
  perform public.log_event(p_order, 'OTP_VERIFIED', null);
  perform public.log_event(p_order, 'COMPLETED', 'Settlement triggered');
  return jsonb_build_object('ok', true, 'status', 'COMPLETED');
end;
$$;

-- Also update rider_respond to set the flag when assigning
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

-- ============================================================
-- 6. Vendors table: admins only. Function for authorized name lookup
-- ============================================================
drop policy if exists "vendors_admin" on public.vendors;
create policy "vendors_admin" on public.vendors for select to authenticated
  using (public.is_admin());

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

  -- customer, admin, or assigned rider
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

-- ============================================================
-- 7. offer_next_vendor: allow service_role
-- ============================================================
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

-- ============================================================
-- 8. offer_next_rider: permission check
-- ============================================================
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

-- ============================================================
-- 9. Function grants: only the ones the app needs
-- ============================================================
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

-- log_event and capable_vendors stay internal (no grant)

commit;
