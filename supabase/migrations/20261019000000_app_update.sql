-- Matebeto app update. Safe to run more than once.
-- Adds: legal links, one static promotion, meal edit/delete rules, customer retry,
-- clearer "not found" notifications, payment-failed notification, new-account alerts,
-- and account deletion.

begin;

-- 1. Legal links the admin can change without a new app build
alter table public.settings add column if not exists terms_url text;
alter table public.settings add column if not exists privacy_url text;
alter table public.settings add column if not exists cookies_url text;

-- 2. One static promotion (replaces the moving banners)
create table if not exists public.promotion (
  id int primary key default 1 check (id = 1),
  image_url text,
  title text,
  subtitle text,
  amount numeric(12,2),
  is_active boolean not null default true,
  updated_at timestamptz not null default now()
);
alter table public.promotion enable row level security;
drop policy if exists "promotion_read" on public.promotion;
create policy "promotion_read" on public.promotion for select using (is_active = true or public.is_admin());
drop policy if exists "admin_write_promotion" on public.promotion;
create policy "admin_write_promotion" on public.promotion for all to authenticated
  using (public.is_admin()) with check (public.is_admin());
grant select on public.promotion to anon, authenticated;
grant insert, update, delete on public.promotion to authenticated;

do $$
begin
  insert into public.promotion (id, image_url, title, subtitle, amount, is_active)
  select 1, b.image_url, b.title, b.subtitle, b.amount, true
  from public.banners b
  where b.is_active
  order by b.sort_order, b.created_at
  limit 1
  on conflict (id) do nothing;
exception when others then
  null; -- no old banners to copy: that is fine
end $$;

-- 3. Admin can edit and delete meals and their sides
alter table public.order_items alter column meal_id drop not null;
do $$
declare c text;
begin
  select conname into c from pg_constraint
  where conrelid = 'public.order_items'::regclass and contype = 'f'
    and confrelid = 'public.meals'::regclass
  limit 1;
  if c is not null then
    execute format('alter table public.order_items drop constraint %I', c);
  end if;
end $$;
alter table public.order_items
  add constraint order_items_meal_id_fkey
  foreign key (meal_id) references public.meals(id) on delete set null;

drop policy if exists "admin_write_meals" on public.meals;
create policy "admin_write_meals" on public.meals for all to authenticated
  using (public.is_admin()) with check (public.is_admin());
drop policy if exists "admin_write_sides" on public.meal_sides;
create policy "admin_write_sides" on public.meal_sides for all to authenticated
  using (public.is_admin()) with check (public.is_admin());
grant insert, update, delete on public.meals, public.meal_sides to authenticated;

-- 4. Customer "Try again": restarts the vendor or rider search
create or replace function public.customer_retry_order(p_order uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_order public.orders%rowtype;
  v_uid uuid := auth.uid();
  v_res jsonb;
begin
  if v_uid is null then raise exception 'Not signed in'; end if;
  select * into v_order from public.orders where id = p_order for update;
  if not found then raise exception 'Order not found'; end if;
  if v_order.customer_id is distinct from v_uid and not public.is_admin() then
    raise exception 'Forbidden';
  end if;
  if v_order.payment_status <> 'paid' then
    return jsonb_build_object('ok', false, 'reason', 'NOT_PAID');
  end if;

  if v_order.status = 'NO_VENDOR_FOUND' then
    delete from public.vendor_attempts where order_id = p_order;
    update public.orders
      set vendor_attempts = 0, vendor_id = null, status = 'SEARCHING_VENDOR'
      where id = p_order;
    perform public.log_event(p_order, 'CUSTOMER_RETRY', 'Vendor search started again');
    v_res := public.offer_next_vendor(p_order);
    return coalesce(v_res, '{}'::jsonb) || jsonb_build_object('searching', 'vendor');
  elsif v_order.status = 'NO_RIDER_AVAILABLE' then
    delete from public.rider_offers where order_id = p_order and status <> 'ACCEPTED';
    perform public.log_event(p_order, 'CUSTOMER_RETRY', 'Rider search started again');
    v_res := public.offer_next_rider(p_order);
    return coalesce(v_res, '{}'::jsonb) || jsonb_build_object('searching', 'rider');
  end if;

  return jsonb_build_object('ok', false, 'reason', 'NOT_RETRYABLE', 'status', v_order.status);
end;
$$;
revoke all on function public.customer_retry_order(uuid) from public;
grant execute on function public.customer_retry_order(uuid) to authenticated;

-- 5. Order notifications: clearer "not found" wording, and nothing for unpaid orders
create or replace function public.enqueue_order_push()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_secret text;
  v_title text;
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
    'VENDOR_OFFERED','VENDOR_ACCEPTED','RIDER_ASSIGNED','OUT_FOR_DELIVERY',
    'COMPLETED','CANCELLED','NO_VENDOR_FOUND','NO_RIDER_AVAILABLE'
  ) then
    return new;
  end if;

  v_title := case new.status
    when 'VENDOR_OFFERED' then 'Vendor offered'
    when 'VENDOR_ACCEPTED' then 'Vendor accepted'
    when 'RIDER_ASSIGNED' then 'Rider found'
    when 'OUT_FOR_DELIVERY' then 'Rider on the way'
    when 'COMPLETED' then 'Delivered'
    when 'CANCELLED' then 'Order cancelled'
    when 'NO_VENDOR_FOUND' then 'Vendor not found'
    when 'NO_RIDER_AVAILABLE' then 'Rider not found'
    else 'Matebeto'
  end;
  v_body := case new.status
    when 'NO_VENDOR_FOUND' then v_num || '. We could not find a vendor. Open the order and tap Try again.'
    when 'NO_RIDER_AVAILABLE' then v_num || '. No rider is free right now. Open the order and tap Try again.'
    else v_num || '. ' || v_title
  end;

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

-- Payment failed: tell the customer, but the order itself is never listed
create or replace function public.enqueue_payment_failed()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_secret text;
begin
  insert into public.user_notifications (user_id, title, body, kind)
  values (
    new.customer_id,
    'Payment failed',
    'Order #' || coalesce(new.order_number::text, '') || '. Your payment did not go through and you were not charged.',
    'order'
  );

  select secret into v_secret from public.push_hook where id = 1;
  if v_secret is null or length(v_secret) < 8 then
    return new;
  end if;

  begin
    perform net.http_post(
      url := 'https://lmyvvwulabezlglxjzvl.supabase.co/functions/v1/send-push',
      headers := jsonb_build_object('Content-Type', 'application/json', 'x-cron-secret', v_secret),
      body := jsonb_build_object('kind', 'order', 'orderId', new.id, 'status', 'PAYMENT_FAILED')
    );
  exception when others then
    raise warning 'payment failed push failed: %', sqlerrm;
  end;
  return new;
end;
$$;

drop trigger if exists orders_payment_failed on public.orders;
create trigger orders_payment_failed
after update of payment_status on public.orders
for each row
when (new.payment_status = 'failed' and old.payment_status is distinct from 'failed')
execute function public.enqueue_payment_failed();

-- 6. New account: welcome the customer and tell the admins which phone signed up
create table if not exists public.account_announced (
  user_id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);
alter table public.account_announced enable row level security;

create or replace function public.announce_new_account(p_device text default null, p_platform text default 'android')
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_created timestamptz;
  v_secret text;
  v_device text := left(coalesce(nullif(trim(p_device), ''), 'phone'), 60);
  v_platform text := initcap(left(coalesce(nullif(trim(p_platform), ''), 'android'), 20));
  v_rows int;
begin
  if v_uid is null then return; end if;

  insert into public.account_announced (user_id) values (v_uid) on conflict (user_id) do nothing;
  get diagnostics v_rows = row_count;
  if v_rows = 0 then return; end if;

  -- only accounts created in the last day count as new; older accounts are just marked
  select created_at into v_created from auth.users where id = v_uid;
  if v_created is null or v_created < now() - interval '1 day' then return; end if;

  insert into public.user_notifications (user_id, title, body, kind)
  values (v_uid, 'Welcome to Matebeto', 'You have a new account. Complete your account details to start ordering.', 'welcome');

  insert into public.user_notifications (user_id, title, body, kind)
  select a.user_id, 'New account', 'New ' || v_platform || ' ' || v_device || ' signed up to Matebeto.', 'admin'
  from public.platform_admins a
  where a.user_id <> v_uid;

  select secret into v_secret from public.push_hook where id = 1;
  if v_secret is null or length(v_secret) < 8 then return; end if;

  begin
    perform net.http_post(
      url := 'https://lmyvvwulabezlglxjzvl.supabase.co/functions/v1/send-push',
      headers := jsonb_build_object('Content-Type', 'application/json', 'x-cron-secret', v_secret),
      body := jsonb_build_object('kind', 'new_account', 'userId', v_uid, 'device', v_device, 'platform', v_platform)
    );
  exception when others then
    raise warning 'new account push failed: %', sqlerrm;
  end;
end;
$$;
revoke all on function public.announce_new_account(text, text) from public;
grant execute on function public.announce_new_account(text, text) to authenticated;

-- 7. Delete my account (needs the account's own phone number)
create or replace function public.delete_my_account(p_phone text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_user_phone text;
  v_typed text := right(regexp_replace(coalesce(p_phone, ''), '\D', '', 'g'), 9);
  v_have text;
  v_rider uuid;
  v_rider_busy uuid;
begin
  if v_uid is null then raise exception 'Not signed in'; end if;

  select phone into v_user_phone from auth.users where id = v_uid;
  v_have := right(regexp_replace(coalesce(v_user_phone, ''), '\D', '', 'g'), 9);
  if v_have = '' or v_typed <> v_have then
    return jsonb_build_object('ok', false, 'reason', 'PHONE_MISMATCH');
  end if;

  if exists (select 1 from public.platform_admins where user_id = v_uid) then
    return jsonb_build_object('ok', false, 'reason', 'ADMIN_ACCOUNT');
  end if;

  -- do not delete while money or a delivery is still in progress
  if exists (
    select 1 from public.orders
    where customer_id = v_uid
      and (
        (payment_status = 'paid' and status not in ('COMPLETED', 'CANCELLED'))
        or payment_status = 'refund_pending'
      )
  ) or exists (
    select 1 from public.payouts p
    join public.orders o on o.id = p.order_id
    where o.customer_id = v_uid and p.status in ('PENDING', 'FAILED', 'MANUAL')
  ) then
    return jsonb_build_object('ok', false, 'reason', 'IN_PROGRESS');
  end if;

  select id, current_order_id into v_rider, v_rider_busy from public.riders where user_id = v_uid;
  if v_rider is not null and v_rider_busy is not null then
    return jsonb_build_object('ok', false, 'reason', 'IN_PROGRESS');
  end if;

  -- customer data (items, history, codes and payouts go with the orders)
  delete from public.orders where customer_id = v_uid;

  -- rider data: delete the application, or blank it out if old deliveries still point to it
  if v_rider is not null then
    perform set_config('matebeto.allow_rider_update', 'true', true);
    begin
      delete from public.rider_offers where rider_id = v_rider;
      delete from public.riders where id = v_rider;
    exception when foreign_key_violation then
      update public.riders
        set full_name = 'Deleted rider', phone = '', address_text = null, licence_info = null,
            ownership_note = null, licence_front_url = null, licence_back_url = null, photo_url = null,
            status = 'SUSPENDED', is_online = false, user_id = null
        where id = v_rider;
    end;
    perform set_config('matebeto.allow_rider_update', 'false', true);
  end if;

  delete from auth.users where id = v_uid;
  return jsonb_build_object('ok', true);
end;
$$;
revoke all on function public.delete_my_account(text) from public;
grant execute on function public.delete_my_account(text) to authenticated;

commit;

notify pgrst, 'reload schema';
