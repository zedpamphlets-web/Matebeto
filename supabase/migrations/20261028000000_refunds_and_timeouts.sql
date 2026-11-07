-- Matebeto: automatic refund when the chosen restaurant does not accept, Lipila refund from Admin,
-- and a 5 minute rider timeout. Safe to run more than once.
begin;

-- 1. Refund tracking on the order. payment_phone = the mobile money number the customer paid with.
alter table public.orders add column if not exists payment_phone text;
alter table public.orders add column if not exists refund_status text;      -- PROCESSING / SENT / FAILED
alter table public.orders add column if not exists refund_reference text;
alter table public.orders add column if not exists refund_response jsonb;
alter table public.orders add column if not exists refund_attempts int not null default 0;

-- 2. Rider has 5 minutes to accept, then the next rider is offered the order automatically.
update public.settings set rider_timeout_minutes = 5 where id = 1;

-- 3. The customer picked ONE restaurant. If it declines, never answers in time, or cannot make the
--    order, the order is cancelled and marked for refund (no searching other vendors).
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

  if exists (select 1 from public.vendor_attempts where order_id = p_order and status = 'OFFERED') then
    return jsonb_build_object('ok', false, 'reason', 'ALREADY_IN_PROGRESS', 'status', v_order.status);
  end if;
  if v_order.status not in ('PAYMENT_CONFIRMED', 'SEARCHING_VENDOR') then
    return jsonb_build_object('ok', false, 'reason', 'NOT_SEARCHING', 'status', v_order.status);
  end if;

  -- chosen restaurant already tried (declined / no answer / cannot fulfil): refund, do not search others
  if v_order.requested_vendor_id is not null
     and exists (select 1 from public.vendor_attempts where order_id = p_order and vendor_id = v_order.requested_vendor_id) then
    update public.orders
      set status = 'CANCELLED', vendor_id = null, rider_id = null,
          payment_status = case when payment_status = 'paid' then 'refund_pending' else payment_status end
      where id = p_order;
    perform public.log_event(p_order, 'RESTAURANT_NOT_ACCEPTED', 'Restaurant did not accept - refund due');
    return jsonb_build_object('ok', false, 'reason', 'RESTAURANT_NOT_ACCEPTED');
  end if;

  if v_order.vendor_attempts >= 3 then
    update public.orders set status = 'NO_VENDOR_FOUND' where id = p_order;
    perform public.log_event(p_order, 'NO_VENDOR_FOUND', 'Maximum three vendor attempts used');
    return jsonb_build_object('ok', false, 'reason', 'NO_VENDOR_FOUND');
  end if;

  select * into v_vendor from public.capable_vendors(p_order) limit 1;
  if not found then
    if v_order.requested_vendor_id is not null then
      -- the chosen restaurant is closed, switched off, or no longer sells something in the basket
      update public.orders
        set status = 'CANCELLED', vendor_id = null,
            payment_status = case when payment_status = 'paid' then 'refund_pending' else payment_status end
        where id = p_order;
      perform public.log_event(p_order, 'RESTAURANT_NOT_ACCEPTED', 'Chosen restaurant unavailable - refund due');
      return jsonb_build_object('ok', false, 'reason', 'RESTAURANT_NOT_ACCEPTED');
    end if;
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

grant execute on function public.offer_next_vendor(uuid) to authenticated;

commit;
