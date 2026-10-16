-- Saved account details + rider can call the customer during delivery.
-- Safe to run more than once.

begin;

-- 1. Extra account details, saved permanently on the customer's profile
alter table public.profiles add column if not exists contact_phone text;
alter table public.profiles add column if not exists plot_number text;
alter table public.profiles add column if not exists location_area text;
alter table public.profiles add column if not exists payment_provider text;
alter table public.profiles add column if not exists payment_number text;

-- 2. Rider gets the customer's number only for their own active delivery
create or replace function public.rider_customer_phone(p_order uuid)
returns text
language plpgsql stable security definer set search_path = public as $$
declare
  v_rider public.riders%rowtype;
  v_order public.orders%rowtype;
  v_phone text;
begin
  if auth.uid() is null then raise exception 'Not signed in'; end if;
  select * into v_rider from public.riders where user_id = auth.uid() and status = 'APPROVED';
  if not found then raise exception 'Not an approved rider'; end if;
  select * into v_order from public.orders where id = p_order and rider_id = v_rider.id;
  if not found then raise exception 'Not your job'; end if;
  if v_order.status not in ('RIDER_ASSIGNED', 'PICKED_UP', 'OUT_FOR_DELIVERY', 'CUSTOMER_NOT_HOME') then
    raise exception 'Delivery is not active';
  end if;

  select coalesce(nullif(trim(contact_phone), ''), phone) into v_phone
  from public.profiles where user_id = v_order.customer_id;
  return v_phone;
end;
$$;

grant execute on function public.rider_customer_phone(uuid) to authenticated;

commit;
