-- Part 2: Server-side order flow, timeouts, payment reference
-- Safe to run twice.

begin;

-- Fresh payment reference per attempt
alter table public.orders add column if not exists payment_reference text;

-- Timeout minutes stored in settings
alter table public.settings add column if not exists vendor_timeout_minutes int not null default 10;
alter table public.settings add column if not exists rider_timeout_minutes int not null default 5;

-- Process timeouts (call this from pg_cron or an edge cron)
create or replace function public.process_timeouts()
returns void
language plpgsql security definer set search_path = public as $$
declare
  v_settings public.settings%rowtype;
  v_attempt record;
  v_offer record;
begin
  select * into v_settings from public.settings where id = 1;
  if not found then return; end if;

  -- Vendor timeouts
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
    -- next vendor (still max 3 inside offer_next_vendor)
    perform public.offer_next_vendor(v_attempt.order_id);
    -- notify happens in the edge function that calls this, or we leave a note
  end loop;

  -- Rider timeouts / unanswered
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
end;
$$;

-- Grant the timeout processor only to service role (or keep internal)
-- (no grant to authenticated)

commit;
