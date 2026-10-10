-- Round 1 fixes: permissions, state guards, timeouts, payouts flag
-- Idempotent. Wrapped in begin/commit.
-- Do not run on live without testing on a branch.

begin;

-- ============================================================
-- 1. payment_status constraint: add refund_pending
-- ============================================================
alter table public.orders drop constraint if exists orders_payment_status_check;
alter table public.orders add constraint orders_payment_status_check
  check (payment_status in ('unpaid','pending','paid','failed','refunded','refund_pending'));

-- ============================================================
-- 2. settings.payouts_enabled
-- ============================================================
alter table public.settings add column if not exists payouts_enabled boolean not null default false;

-- ============================================================
-- 3. payment_attempts so earlier payment tries are never lost
-- ============================================================
create table if not exists public.payment_attempts (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  reference text unique not null,
  amount numeric(12,2) not null,
  currency text not null default 'ZMW',
  status text not null default 'pending',
  created_at timestamptz not null default now()
);
alter table public.payment_attempts enable row level security;
-- no select for authenticated; service role only

-- ============================================================
-- 4. Fixed functions (fail-closed, state guards, locks)
-- ============================================================

-- offer_next_vendor
create or replace function public.offer_next_vendor(p_order uuid)
returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  v_order public.orders%rowtype;
  v_vendor public.vendors%rowtype;
  v_is_server boolean := (auth.role() = 'service_role');
  v_offered_count int;
begin
  if auth.uid() is null and not v_is_server then
    raise exception 'Not signed in';
  end if;

  select * into v_order from public.orders where id = p_order for update;
  if not found then raise exception 'Order not found'; end if;

  if not v_is_server and v_order.customer_id is distinct from auth.uid() and not public.is_admin() then
    raise exception 'Forbidden';
  end if;

  if v_order.status not in ('PAYMENT_CONFIRMED', 'SEARCHING_VENDOR') then
    return jsonb_build_object('ok', false, 'reason', 'ALREADY_IN_PROGRESS');
  end if;

  select count(*) into v_offered_count
  from public.vendor_attempts
  where order_id = p_order and status = 'OFFERED';
  if v_offered_count > 0 then
    return jsonb_build_object('ok', false, 'reason', 'ALREADY_IN_PROGRESS');
  end if;

  if v_order.payment_status <> 'paid' then raise exception 'Payment not confirmed'; end if;

  if v_order.vendor_attempts >= 3 then
    update public.orders set status = 'NO_VENDOR_FOUND',
      payment_status = case when payment_status = 'paid' then 'refund_pending' else payment_status end
    where id = p_order;
    perform public.log_event(p_order, 'NO_VENDOR_FOUND', 'Maximum three vendor attempts used');
    return jsonb_build_object('ok', false, 'reason', 'NO_VENDOR_FOUND');
  end if;

  select * into v_vendor from public.capable_vendors(p_order) limit 1;
  if not found then
    update public.orders set status = 'NO_VENDOR_FOUND',
      payment_status = case when payment_status = 'paid' then 'refund_pending' else payment_status end
    where id = p_order;
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
    'attempt', v_order.vendor_attempts + 1
  );
end;
$$;

-- respond_vendor: only VENDOR_OFFERED + OFFERED attempt, return whether changed
create or replace function public.respond_vendor(p_order uuid, p_accept boolean, p_reason text default null)
returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  v_order public.orders%rowtype;
  v_changed boolean := false;
begin
  if not public.is_admin() and auth.role() <> 'service_role' then
    raise exception 'Forbidden';
  end if;

  select * into v_order from public.orders where id = p_order for update;
  if not found then return jsonb_build_object('ok', false, 'changed', false, 'reason', 'NOT_FOUND'); end if;

  if v_order.status is distinct from 'VENDOR_OFFERED' then
    return jsonb_build_object('ok', false, 'changed', false, 'reason', 'WRONG_STATUS');
  end if;

  if not exists (
    select 1 from public.vendor_attempts
    where order_id = p_order and vendor_id = v_order.vendor_id and status = 'OFFERED'
  ) then
    return jsonb_build_object('ok', false, 'changed', false, 'reason', 'NO_OFFERED_ATTEMPT');
  end if;

  if p_accept then
    update public.vendor_attempts set status = 'ACCEPTED'
      where order_id = p_order and vendor_id = v_order.vendor_id and status = 'OFFERED';
    update public.orders set status = 'VENDOR_ACCEPTED' where id = p_order;
    perform public.log_event(p_order, 'VENDOR_ACCEPTED', p_reason);
    v_changed := true;
  else
    update public.vendor_attempts set status = 'DECLINED'
      where order_id = p_order and vendor_id = v_order.vendor_id and status = 'OFFERED';
    update public.orders set vendor_id = null, status = 'SEARCHING_VENDOR' where id = p_order;
    perform public.log_event(p_order, 'VENDOR_DECLINED', p_reason);
    v_changed := true;
  end if;

  return jsonb_build_object('ok', true, 'changed', v_changed);
end;
$$;

-- offer_next_rider
create or replace function public.offer_next_rider(p_order uuid)
returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  v_order public.orders%rowtype;
  v_rider public.riders%rowtype;
  v_my_rider uuid;
  v_is_server boolean := (auth.role() = 'service_role');
  v_allowed boolean := false;
  v_offered_count int;
begin
  if auth.uid() is null and not v_is_server then
    raise exception 'Not signed in';
  end if;

  select * into v_order from public.orders where id = p_order for update;
  if not found then raise exception 'Order not found'; end if;

  select id into v_my_rider from public.riders where user_id = auth.uid() and status = 'APPROVED';

  v_allowed := v_is_server
    or public.is_admin()
    or (auth.uid() is not null and v_order.customer_id is not distinct from auth.uid())
    or (v_my_rider is not null and exists (
         select 1 from public.rider_offers
         where order_id = p_order and rider_id = v_my_rider
       ));

  if not v_allowed then raise exception 'Forbidden'; end if;

  if v_order.status not in ('VENDOR_ACCEPTED', 'SEARCHING_RIDER') then
    return jsonb_build_object('ok', false, 'reason', 'ALREADY_IN_PROGRESS');
  end if;

  select count(*) into v_offered_count
  from public.rider_offers
  where order_id = p_order and status = 'OFFERED';
  if v_offered_count > 0 then
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
    update public.orders set status = 'NO_RIDER_AVAILABLE',
      payment_status = case when payment_status = 'paid' then 'refund_pending' else payment_status end
    where id = p_order;
    perform public.log_event(p_order, 'NO_RIDER_AVAILABLE', v_order.delivery_type);
    return jsonb_build_object('ok', false, 'reason', 'NO_RIDER_AVAILABLE');
  end if;

  insert into public.rider_offers (order_id, rider_id, status) values (p_order, v_rider.id, 'OFFERED');
  update public.orders set status = 'SEARCHING_RIDER' where id = p_order;
  perform public.log_event(p_order, 'RIDER_OFFERED', v_rider.full_name);
  return jsonb_build_object('ok', true, 'rider_id', v_rider.id, 'name', v_rider.full_name);
end;
$$;

-- rider_respond: strict guards, no OTP counter reset on re-accept
create or replace function public.rider_respond(p_order uuid, p_accept boolean)
returns public.orders
language plpgsql security definer set search_path = public as $$
declare
  v_uid uuid := auth.uid();
  v_rider public.riders%rowtype;
  v_order public.orders%rowtype;
  v_code text;
  v_has_offer boolean;
begin
  if v_uid is null then raise exception 'Not signed in'; end if;

  select * into v_rider from public.riders where user_id = v_uid and status = 'APPROVED';
  if not found then raise exception 'Not an approved rider'; end if;

  select * into v_order from public.orders where id = p_order for update;
  if not found then raise exception 'Order not found'; end if;

  select exists (
    select 1 from public.rider_offers
    where order_id = p_order and rider_id = v_rider.id and status = 'OFFERED'
  ) into v_has_offer;

  if not v_has_offer or v_order.status is distinct from 'SEARCHING_RIDER' or v_order.rider_id is not null then
    raise exception 'Order not offered to you or already assigned';
  end if;

  if not p_accept then
    update public.rider_offers set status = 'DECLINED' where order_id = p_order and rider_id = v_rider.id and status = 'OFFERED';
    update public.orders set status = 'SEARCHING_RIDER' where id = p_order returning * into v_order;
    perform public.log_event(p_order, 'RIDER_DECLINED', v_rider.full_name);
    return v_order;
  end if;

  update public.rider_offers set status = 'ACCEPTED' where order_id = p_order and rider_id = v_rider.id and status = 'OFFERED';

  -- Generate new code only if none exists; never reset failed_attempts / locked here
  if not exists (select 1 from public.delivery_otp_private where order_id = p_order) then
    v_code := lpad((floor(random()*900000)+100000)::int::text, 6, '0');
    insert into public.delivery_otp_private (order_id, hash, failed_attempts, locked)
    values (p_order, encode(digest(v_code, 'sha256'), 'hex'), 0, false);
    insert into public.delivery_otps (order_id, customer_id, code)
    values (p_order, v_order.customer_id, v_code)
    on conflict (order_id) do update set code = excluded.code, created_at = now();
  end if;

  perform set_config('matebeto.allow_rider_update', 'true', true);
  update public.orders
    set rider_id = v_rider.id,
        status = 'RIDER_ASSIGNED'
    where id = p_order
    returning * into v_order;
  update public.riders set current_order_id = p_order, is_online = true where id = v_rider.id;
  perform set_config('matebeto.allow_rider_update', 'false', true);

  perform public.log_event(p_order, 'RIDER_ASSIGNED', v_rider.full_name);
  return v_order;
end;
$$;

-- order_vendor_name fail-closed
create or replace function public.order_vendor_name(p_order uuid)
returns text
language plpgsql stable security definer set search_path = public as $$
declare
  v_order public.orders%rowtype;
  v_name text;
  v_rider_id uuid;
begin
  if auth.uid() is null and auth.role() <> 'service_role' then
    raise exception 'Not signed in';
  end if;

  select * into v_order from public.orders where id = p_order;
  if not found then return null; end if;

  select id into v_rider_id from public.riders where user_id = auth.uid();
  if auth.uid() is not null
     and v_order.customer_id is distinct from auth.uid()
     and not public.is_admin()
     and (v_rider_id is null or v_order.rider_id is distinct from v_rider_id) then
    raise exception 'Forbidden';
  end if;

  select name into v_name from public.vendors where id = v_order.vendor_id;
  return v_name;
end;
$$;

-- customer_cancel fail-closed + order not found
create or replace function public.customer_cancel(p_order uuid)
returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  v_order public.orders%rowtype;
begin
  if auth.uid() is null and auth.role() <> 'service_role' then
    raise exception 'Not signed in';
  end if;

  select * into v_order from public.orders where id = p_order for update;
  if not found then return jsonb_build_object('ok', false, 'reason', 'NOT_FOUND'); end if;

  if auth.uid() is not null and v_order.customer_id is distinct from auth.uid() and not public.is_admin() then
    raise exception 'Forbidden';
  end if;

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

-- vendor_cannot_fulfil: mark old attempt UNAVAILABLE
create or replace function public.vendor_cannot_fulfil(p_order uuid)
returns jsonb
language plpgsql security definer set search_path = public as $$
begin
  if not public.is_admin() and auth.role() <> 'service_role' then raise exception 'Forbidden'; end if;

  update public.vendor_attempts set status = 'UNAVAILABLE'
    where order_id = p_order and status = 'OFFERED';
  update public.orders set vendor_id = null, status = 'SEARCHING_VENDOR' where id = p_order;
  perform public.log_event(p_order, 'VENDOR_CANNOT_FULFIL', null);
  return public.offer_next_vendor(p_order);
end;
$$;

-- rider_cannot_finish: reset OTP counter when freeing for new rider
create or replace function public.rider_cannot_finish(p_order uuid)
returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  v_rider uuid;
begin
  if not public.is_admin() and auth.role() <> 'service_role' then raise exception 'Forbidden'; end if;

  select rider_id into v_rider from public.orders where id = p_order for update;
  if v_rider is not null then
    perform set_config('matebeto.allow_rider_update', 'true', true);
    update public.riders set current_order_id = null where id = v_rider;
    perform set_config('matebeto.allow_rider_update', 'false', true);
  end if;

  -- Reset OTP so the next rider starts clean
  update public.delivery_otp_private set failed_attempts = 0, locked = false where order_id = p_order;

  update public.orders set rider_id = null, status = 'SEARCHING_RIDER' where id = p_order;
  perform public.log_event(p_order, 'RIDER_CANNOT_FINISH', null);
  return public.offer_next_rider(p_order);
end;
$$;

-- customer_not_home: only assigned rider, only OUT_FOR_DELIVERY
create or replace function public.customer_not_home(p_order uuid)
returns jsonb
language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then raise exception 'Not signed in'; end if;
  if not exists (
    select 1 from public.orders o
    join public.riders r on r.id = o.rider_id
    where o.id = p_order and r.user_id = auth.uid() and o.status = 'OUT_FOR_DELIVERY'
  ) then
    raise exception 'Not your job or wrong status';
  end if;
  update public.orders set status = 'CUSTOMER_NOT_HOME' where id = p_order;
  perform public.log_event(p_order, 'CUSTOMER_NOT_HOME', null);
  return jsonb_build_object('ok', true);
end;
$$;

-- verify_delivery_otp: allow CUSTOMER_NOT_HOME; SUPPORT_REQUIRED needs reset
create or replace function public.verify_delivery_otp(p_order uuid, p_code text)
returns jsonb
language plpgsql security definer set search_path = public as $$
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

  if v_order.status = 'SUPPORT_REQUIRED' then
    return jsonb_build_object('ok', false, 'reason', 'SUPPORT_REQUIRED');
  end if;
  if v_order.status not in ('OUT_FOR_DELIVERY','PICKED_UP','RIDER_ASSIGNED','CUSTOMER_NOT_HOME') then
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

  -- Correct — complete in same transaction
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

-- apply_rider: allow re-apply after REJECTED; if APPROVED changes vehicle, set PENDING
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
  v_old_vehicle text;
  v_old_status text;
begin
  if auth.uid() is null then raise exception 'Not signed in'; end if;
  if p_vehicle not in ('bicycle','motorbike') then raise exception 'Vehicle must be bicycle or motorbike'; end if;

  select vehicle_type, status into v_old_vehicle, v_old_status
  from public.riders where user_id = auth.uid();

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
        vehicle_type = excluded.vehicle_type,
        licence_info = excluded.licence_info,
        ownership_note = excluded.ownership_note,
        licence_front_url = excluded.licence_front_url,
        licence_back_url = excluded.licence_back_url,
        photo_url = coalesce(excluded.photo_url, public.riders.photo_url),
        status = case
          when public.riders.status = 'APPROVED' and public.riders.vehicle_type is distinct from excluded.vehicle_type then 'PENDING'
          when public.riders.status = 'APPROVED' then public.riders.status
          else 'PENDING'
        end
  returning * into v_row;

  perform set_config('matebeto.allow_rider_update', 'false', true);
  return v_row;
end;
$$;

-- process_timeouts: per-order exception blocks, return newly offered vendor orders
create or replace function public.process_timeouts()
returns table (order_id uuid, vendor_id uuid)
language plpgsql security definer set search_path = public as $$
declare
  v_settings public.settings%rowtype;
  v_attempt record;
  v_offer record;
  v_order record;
  v_result jsonb;
begin
  -- Does not depend on auth.uid()
  select * into v_settings from public.settings where id = 1;
  if not found then return; end if;

  -- Vendor timeouts
  for v_attempt in
    select va.id, va.order_id
    from public.vendor_attempts va
    join public.orders o on o.id = va.order_id
    where va.status = 'OFFERED'
      and o.status = 'VENDOR_OFFERED'
      and va.created_at < now() - (v_settings.vendor_timeout_minutes || ' minutes')::interval
  loop
    begin
      update public.vendor_attempts set status = 'TIMEOUT' where id = v_attempt.id;
      perform public.log_event(v_attempt.order_id, 'VENDOR_TIMEOUT', null);
      v_result := public.offer_next_vendor(v_attempt.order_id);
      if v_result->>'ok' = 'true' then
        order_id := v_attempt.order_id;
        vendor_id := (v_result->>'vendor_id')::uuid;
        return next;
      end if;
    exception when others then
      -- continue with next order
      null;
    end;
  end loop;

  -- Rider timeouts
  for v_offer in
    select ro.id, ro.order_id
    from public.rider_offers ro
    join public.orders o on o.id = ro.order_id
    where ro.status = 'OFFERED'
      and o.status = 'SEARCHING_RIDER'
      and ro.created_at < now() - (v_settings.rider_timeout_minutes || ' minutes')::interval
  loop
    begin
      update public.rider_offers set status = 'DECLINED' where id = v_offer.id;
      perform public.log_event(v_offer.order_id, 'RIDER_TIMEOUT', null);
      perform public.offer_next_rider(v_offer.order_id);
    exception when others then
      null;
    end;
  end loop;

  -- Customer not home → support
  for v_order in
    select id from public.orders
    where status = 'CUSTOMER_NOT_HOME'
      and updated_at < now() - (v_settings.customer_wait_minutes || ' minutes')::interval
  loop
    begin
      update public.orders set status = 'SUPPORT_REQUIRED' where id = v_order.id;
      perform public.log_event(v_order.id, 'CUSTOMER_NOT_HOME_SUPPORT', null);
    exception when others then
      null;
    end;
  end loop;
end;
$$;

-- New: rider-callable report problem (sets SUPPORT_REQUIRED)
create or replace function public.rider_report_problem(p_order uuid, p_reason text)
returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  v_rider public.riders%rowtype;
begin
  if auth.uid() is null then raise exception 'Not signed in'; end if;
  select * into v_rider from public.riders where user_id = auth.uid() and status = 'APPROVED';
  if not found then raise exception 'Not an approved rider'; end if;

  if not exists (
    select 1 from public.orders where id = p_order and rider_id = v_rider.id
  ) then
    raise exception 'Not your job';
  end if;

  update public.orders set status = 'SUPPORT_REQUIRED' where id = p_order;
  perform public.log_event(p_order, 'RIDER_PROBLEM', p_reason);
  return jsonb_build_object('ok', true);
end;
$$;

-- ============================================================
-- 5. Permissions: revoke all, then grant only what is needed
-- ============================================================
revoke execute on all functions in schema public from public, anon, authenticated;

alter default privileges for role postgres in schema public
  revoke execute on functions from public, anon, authenticated;

-- is_admin open for policies
grant execute on function public.is_admin() to anon, authenticated;

-- App-callable functions
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
grant execute on function public.vendor_cannot_fulfil(uuid) to authenticated;
grant execute on function public.rider_cannot_finish(uuid) to authenticated;
grant execute on function public.rider_report_problem(uuid, text) to authenticated;

-- Service role can call everything the edge functions need
grant execute on all functions in schema public to service_role;

commit;
