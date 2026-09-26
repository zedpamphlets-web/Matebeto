-- Run this if the project already applied schema.sql before licence photos existed.
alter table public.riders add column if not exists licence_front_url text;
alter table public.riders add column if not exists licence_back_url text;

create or replace function public.apply_rider(
  p_full_name text,
  p_phone text,
  p_address text,
  p_vehicle text,
  p_licence text,
  p_ownership text,
  p_licence_front text default null,
  p_licence_back text default null
) returns public.riders
language plpgsql security definer set search_path = public as $$
declare
  v_row public.riders%rowtype;
begin
  if auth.uid() is null then raise exception 'Not signed in'; end if;
  if p_vehicle not in ('bicycle','motorbike') then raise exception 'Vehicle must be bicycle or motorbike'; end if;
  insert into public.riders (
    user_id, full_name, phone, address_text, vehicle_type, licence_info, ownership_note,
    licence_front_url, licence_back_url, status
  )
  values (
    auth.uid(), p_full_name, p_phone, p_address, p_vehicle, p_licence, p_ownership,
    p_licence_front, p_licence_back, 'PENDING'
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
        status = case when public.riders.status = 'APPROVED' then public.riders.status else 'PENDING' end
  returning * into v_row;
  return v_row;
end;
$$;
