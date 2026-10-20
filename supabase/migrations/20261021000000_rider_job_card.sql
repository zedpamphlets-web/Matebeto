-- Matebeto: the rider's job card, as the boss described it.
--   Before accepting:  Origin (market), Delivery (area), Amount (trip price). Nothing else.
--   After accepting:   VENDOR   name, number, market, order number
--                      DELIVERY name, number, address, notes
-- Only the offered rider, the assigned rider, or an admin can read it. Safe to run more than once.

begin;

create or replace function public.rider_job_card(p_order uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_order public.orders%rowtype;
  v_rider_id uuid;
  v_assigned boolean;
  v_offered boolean;
  v_market text;
  v_area text;
  v_vendor public.vendors%rowtype;
  v_profile public.profiles%rowtype;
  v_text text;
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
  select * into v_profile from public.profiles where user_id = v_order.customer_id;
  v_text := coalesce(v_order.delivery_address ->> 'text', '');
  -- area: the customer's saved area; otherwise the last part of the address line
  v_area := coalesce(
    nullif(trim(v_profile.location_area), ''),
    nullif(trim(regexp_replace(v_text, '^.*,\s*', '')), '')
  );

  if v_assigned or public.is_admin() then
    select * into v_vendor from public.vendors where id = v_order.vendor_id;
    return jsonb_build_object(
      'ok', true,
      'stage', 'assigned',
      'order_number', v_order.order_number,
      'market_name', v_market,
      'area', v_area,
      'trip_price', v_order.delivery_fee,
      'vendor_name', v_vendor.name,
      'vendor_phone', coalesce(nullif(v_vendor.phone, ''), v_vendor.whatsapp),
      'customer_name', nullif(trim(v_profile.full_name), ''),
      'customer_phone', coalesce(nullif(trim(v_profile.contact_phone), ''), v_profile.phone),
      'address', v_text,
      'notes', nullif(trim(coalesce(v_order.delivery_address ->> 'notes', '')), '')
    );
  end if;

  -- offered but not accepted yet: only what the boss listed
  return jsonb_build_object(
    'ok', true,
    'stage', 'offered',
    'order_number', v_order.order_number,
    'market_name', v_market,
    'area', v_area,
    'trip_price', v_order.delivery_fee
  );
end;
$$;

revoke all on function public.rider_job_card(uuid) from public;
grant execute on function public.rider_job_card(uuid) to authenticated;

commit;

notify pgrst, 'reload schema';
