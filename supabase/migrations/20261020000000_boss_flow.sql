-- Matebeto: boss's order flow wording, rider order-number check, rider job alerts,
-- and automatic restart when a vendor becomes available. Safe to run more than once.

begin;

-- 1. Order notifications use the boss's wording (and "Order confirmed" at pickup)
create or replace function public.enqueue_order_push()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_secret text;
  v_title text;
  v_text text;
  v_body text;
  v_num text := 'Order #' || coalesce(new.order_number::text, '');
begin
  if new.status is not distinct from old.status then
    return new;
  end if;
  if new.payment_status is null or new.payment_status not in ('paid', 'refund_pending', 'refunded') then
    return new;
  end if;
  if new.status not in (
    'VENDOR_OFFERED','VENDOR_ACCEPTED','RIDER_ASSIGNED','PICKED_UP','OUT_FOR_DELIVERY',
    'COMPLETED','CANCELLED','NO_VENDOR_FOUND','NO_RIDER_AVAILABLE'
  ) then
    return new;
  end if;

  v_title := case new.status
    when 'VENDOR_OFFERED' then 'Looking for Chef'
    when 'VENDOR_ACCEPTED' then 'Chef confirmed'
    when 'RIDER_ASSIGNED' then 'Rider confirmed'
    when 'PICKED_UP' then 'Order confirmed'
    when 'OUT_FOR_DELIVERY' then 'Rider coming'
    when 'COMPLETED' then 'Delivery complete'
    when 'CANCELLED' then 'Order cancelled'
    when 'NO_VENDOR_FOUND' then 'Still looking for a chef'
    when 'NO_RIDER_AVAILABLE' then 'Still looking for a rider'
    else 'Matebeto'
  end;
  v_text := case new.status
    when 'VENDOR_OFFERED' then 'We are looking for a chef for your order.'
    when 'VENDOR_ACCEPTED' then 'Your chef confirmed and is preparing your order.'
    when 'RIDER_ASSIGNED' then 'A rider is going to collect your order.'
    when 'PICKED_UP' then 'Your rider and chef matched the order number.'
    when 'OUT_FOR_DELIVERY' then 'Your rider is coming with your order.'
    when 'COMPLETED' then 'Your order has been delivered.'
    when 'CANCELLED' then 'Your order was cancelled.'
    when 'NO_VENDOR_FOUND' then 'We have not found a chef yet. Open the order and tap Try again.'
    when 'NO_RIDER_AVAILABLE' then 'No rider is free right now. Open the order and tap Try again.'
    else 'You have an update.'
  end;
  v_body := v_num || '. ' || v_text;

  insert into public.user_notifications (user_id, title, body, kind, order_id)
  values (new.customer_id, v_title, v_body, 'order', new.id);

  select secret into v_secret from public.push_hook where id = 1;
  if v_secret is null or length(v_secret) < 8 then
    return new;
  end if;

  begin
    perform net.http_post(
      url := 'https://lmyvvwulabezlglxjzvl.supabase.co/functions/v1/send-push',
      headers := jsonb_build_object('Content-Type', 'application/json', 'x-cron-secret', v_secret),
      body := jsonb_build_object('kind', 'order', 'orderId', new.id, 'status', new.status)
    );
  exception when others then
    raise warning 'order push failed: %', sqlerrm;
  end;
  return new;
end;
$$;

-- 2. Rider confirms pickup by typing the order number the vendor shows
drop function if exists public.confirm_pickup(uuid);

create or replace function public.confirm_pickup(p_order uuid, p_number text default null)
returns public.orders
language plpgsql
security definer
set search_path = public
as $$
declare
  v_rider public.riders%rowtype;
  v_order public.orders%rowtype;
  v_typed text := regexp_replace(coalesce(p_number, ''), '\D', '', 'g');
begin
  if auth.uid() is null then raise exception 'Not signed in'; end if;
  select * into v_rider from public.riders where user_id = auth.uid() and status = 'APPROVED';
  if not found then raise exception 'Not an approved rider'; end if;
  select * into v_order from public.orders where id = p_order and rider_id = v_rider.id for update;
  if not found then raise exception 'Not your job'; end if;

  if v_order.status in ('PICKED_UP', 'OUT_FOR_DELIVERY') then return v_order; end if;
  if v_order.status <> 'RIDER_ASSIGNED' then raise exception 'Order is not ready for pickup'; end if;

  if v_typed = '' then
    raise exception 'Enter the order number the vendor shows you';
  end if;
  if v_typed <> v_order.order_number::text then
    raise exception 'That order number does not match. Check with the vendor and try again.';
  end if;

  update public.orders set status = 'PICKED_UP' where id = p_order;
  update public.orders set status = 'OUT_FOR_DELIVERY' where id = p_order returning * into v_order;
  perform public.log_event(p_order, 'PICKED_UP', 'Order number matched');
  perform public.log_event(p_order, 'OUT_FOR_DELIVERY', null);
  return v_order;
end;
$$;
revoke all on function public.confirm_pickup(uuid, text) from public;
grant execute on function public.confirm_pickup(uuid, text) to authenticated;

-- 3. A rider also gets an in-app notification card when a job is offered
create or replace function public.enqueue_rider_push()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_secret text;
  v_user uuid;
  v_num text;
begin
  if new.status <> 'OFFERED' then
    return new;
  end if;

  begin
    select user_id into v_user from public.riders where id = new.rider_id;
    select order_number::text into v_num from public.orders where id = new.order_id;
    if v_user is not null then
      insert into public.user_notifications (user_id, title, body, kind, order_id)
      values (v_user, 'New delivery', 'Order #' || coalesce(v_num, '') || '. A delivery has been offered to you.', 'job', new.order_id);
    end if;
  exception when others then
    raise warning 'rider notification card failed: %', sqlerrm;
  end;

  select secret into v_secret from public.push_hook where id = 1;
  if v_secret is null or length(v_secret) < 8 then
    return new;
  end if;

  begin
    perform net.http_post(
      url := 'https://lmyvvwulabezlglxjzvl.supabase.co/functions/v1/send-push',
      headers := jsonb_build_object('Content-Type', 'application/json', 'x-cron-secret', v_secret),
      body := jsonb_build_object('kind', 'rider_offer', 'orderId', new.order_id, 'riderId', new.rider_id)
    );
  exception when others then
    raise warning 'rider push failed: %', sqlerrm;
  end;

  return new;
end;
$$;

-- 4. When a vendor becomes available in a market, restart paid orders stuck with "no vendor"
create or replace function public.restart_stuck_orders(p_market uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
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
      -- only restart when some vendor here can prepare the whole basket
      if exists (
        select 1 from public.vendors v
        where v.market_id = p_market and v.is_active and v.is_available
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

create or replace function public.vendor_became_available()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  begin
    perform public.restart_stuck_orders(new.market_id);
  exception when others then
    raise warning 'vendor restart failed: %', sqlerrm;
  end;
  return new;
end;
$$;

create or replace function public.vendor_meal_became_available()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_market uuid;
begin
  begin
    select market_id into v_market from public.vendors where id = new.vendor_id;
    if v_market is not null then
      perform public.restart_stuck_orders(v_market);
    end if;
  exception when others then
    raise warning 'vendor meal restart failed: %', sqlerrm;
  end;
  return new;
end;
$$;

drop trigger if exists vendors_restart on public.vendors;
create trigger vendors_restart
after insert or update of is_active, is_available on public.vendors
for each row
when (new.is_active and new.is_available)
execute function public.vendor_became_available();

drop trigger if exists vendor_meals_restart on public.vendor_meals;
create trigger vendor_meals_restart
after insert or update of is_available on public.vendor_meals
for each row
when (new.is_available)
execute function public.vendor_meal_became_available();

-- 5. Rider sees where to collect: vendor name, market and phone, only for their own job
create or replace function public.rider_pickup_info(p_order uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_order public.orders%rowtype;
  v_rider_id uuid;
  v_vendor public.vendors%rowtype;
  v_market text;
  v_assigned boolean;
  v_offered boolean;
begin
  if auth.uid() is null then return jsonb_build_object('ok', false); end if;
  select * into v_order from public.orders where id = p_order;
  if not found then return jsonb_build_object('ok', false); end if;

  select id into v_rider_id from public.riders where user_id = auth.uid() and status = 'APPROVED';

  v_assigned := v_rider_id is not null
    and v_order.rider_id = v_rider_id
    and v_order.status in ('RIDER_ASSIGNED', 'PICKED_UP', 'OUT_FOR_DELIVERY', 'CUSTOMER_NOT_HOME');
  v_offered := v_rider_id is not null and exists (
    select 1 from public.rider_offers
    where order_id = p_order and rider_id = v_rider_id and status = 'OFFERED'
  );

  if not (v_assigned or v_offered or public.is_admin()) then
    return jsonb_build_object('ok', false);
  end if;

  select name into v_market from public.markets where id = v_order.market_id;

  if v_assigned or public.is_admin() then
    select * into v_vendor from public.vendors where id = v_order.vendor_id;
    return jsonb_build_object(
      'ok', true,
      'market_name', v_market,
      'vendor_name', v_vendor.name,
      'vendor_phone', coalesce(nullif(v_vendor.phone, ''), v_vendor.whatsapp)
    );
  end if;

  -- offered but not accepted yet: the market only
  return jsonb_build_object('ok', true, 'market_name', v_market);
end;
$$;
revoke all on function public.rider_pickup_info(uuid) from public;
grant execute on function public.rider_pickup_info(uuid) to authenticated;

commit;

notify pgrst, 'reload schema';
