-- Part 3: Payouts, cancel/refund, reassign, customer-not-home
-- Amounts and exact refund rules are placeholders — see questions for the client.
-- Safe to run twice.

begin;

-- Payouts table (never pay twice)
create table if not exists public.payouts (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  payee_type text not null check (payee_type in ('vendor','rider')),
  payee_id uuid not null,
  amount numeric(12,2) not null,
  reference text unique not null, -- idempotency key
  status text not null default 'PENDING' check (status in ('PENDING','SENT','FAILED','MANUAL')),
  lipila_response jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.payouts enable row level security;
-- admins only
drop policy if exists "payouts_admin" on public.payouts;
create policy "payouts_admin" on public.payouts for select to authenticated using (public.is_admin());

-- Customer-not-home wait
alter table public.settings add column if not exists customer_wait_minutes int not null default 10;

-- Function called when OTP completes the order (hook into verify_delivery_otp later if needed)
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

  -- PLACEHOLDER AMOUNTS — client must confirm
  -- Example: vendor gets food_total, rider gets delivery_fee (adjust as needed)
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
  if v_order.customer_id <> auth.uid() and not public.is_admin() then
    raise exception 'Forbidden';
  end if;
  if v_order.status not in ('CREATED','PAYMENT_CONFIRMED','SEARCHING_VENDOR','VENDOR_OFFERED') then
    return jsonb_build_object('ok', false, 'reason', 'Too late to cancel');
  end if;
  update public.orders set status = 'CANCELLED' where id = p_order;
  perform public.log_event(p_order, 'CANCELLED', 'Customer cancelled before vendor accept');
  -- Refund: if paid, mark for refund (actual Lipila refund call is in edge function)
  if v_order.payment_status = 'paid' then
    update public.orders set payment_status = 'refund_pending' where id = p_order;
  end if;
  return jsonb_build_object('ok', true);
end;
$$;

-- Vendor accepts but cannot make the food → re-offer whole basket (same order number)
create or replace function public.vendor_cannot_fulfil(p_order uuid)
returns jsonb
language plpgsql security definer set search_path = public as $$
begin
  if not public.is_admin() and auth.role() <> 'service_role' then
    raise exception 'Forbidden';
  end if;
  update public.orders set vendor_id = null, status = 'SEARCHING_VENDOR' where id = p_order;
  perform public.log_event(p_order, 'VENDOR_CANNOT_FULFIL', 'Re-offering basket');
  return public.offer_next_vendor(p_order);
end;
$$;

-- Rider cannot finish (bike broke) → free rider, offer to next (same order number)
create or replace function public.rider_cannot_finish(p_order uuid)
returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  v_rider uuid;
begin
  if not public.is_admin() and auth.role() <> 'service_role' then
    raise exception 'Forbidden';
  end if;
  select rider_id into v_rider from public.orders where id = p_order;
  if v_rider is not null then
    perform set_config('matebeto.allow_rider_update', 'true', true);
    update public.riders set current_order_id = null where id = v_rider;
    perform set_config('matebeto.allow_rider_update', 'false', true);
  end if;
  update public.orders set rider_id = null, status = 'SEARCHING_RIDER' where id = p_order;
  perform public.log_event(p_order, 'RIDER_CANNOT_FINISH', 'Re-offering to next rider');
  return public.offer_next_rider(p_order);
end;
$$;

-- Customer not at home: rider taps, system waits, then support
create or replace function public.customer_not_home(p_order uuid)
returns jsonb
language plpgsql security definer set search_path = public as $$
begin
  -- only the assigned rider
  if not exists (
    select 1 from public.orders o
    join public.riders r on r.id = o.rider_id
    where o.id = p_order and r.user_id = auth.uid()
  ) then
    raise exception 'Not your job';
  end if;
  update public.orders set status = 'CUSTOMER_NOT_HOME' where id = p_order;
  perform public.log_event(p_order, 'CUSTOMER_NOT_HOME', 'Waiting for customer');
  -- Actual wait + support is handled by the timeout processor or a scheduled job
  return jsonb_build_object('ok', true, 'wait_minutes', (select customer_wait_minutes from public.settings where id = 1));
end;
$$;

-- Extend process_timeouts for customer-not-home
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

  -- vendor timeouts (unchanged logic)
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

  -- rider timeouts
  for v_offer in
    select ro.*
    from public.rider_offers ro
    join public.orders o on o.id = ro.order_id
    where ro.status = 'OFFERED'
      and o.status = 'SEARCHING_RIDER'
      and ro.created_at < now() - (v_settings.rider_timeout_minutes || ' minutes')::interval
  loop
    update public.rider_offers set status = 'DECLINED' where id = v_offer.id;
    perform public.log_event(v_offer.order_id, 'RIDER_TIMEOUT', null);
    perform public.offer_next_rider(v_offer.order_id);
  end loop;

  -- customer not home → support after wait
  for v_order in
    select id from public.orders
    where status = 'CUSTOMER_NOT_HOME'
      and updated_at < now() - (v_settings.customer_wait_minutes || ' minutes')::interval
  loop
    update public.orders set status = 'SUPPORT_REQUIRED' where id = v_order.id;
    perform public.log_event(v_order.id, 'CUSTOMER_NOT_HOME_SUPPORT', 'Customer not home after wait');
  end loop;
end;
$$;

commit;
