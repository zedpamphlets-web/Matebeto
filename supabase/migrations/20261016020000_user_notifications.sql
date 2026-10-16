-- In-app notification cards. Safe to run more than once.
begin;

create table if not exists public.user_notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  body text not null,
  kind text not null default 'update',
  order_id uuid,
  created_at timestamptz not null default now(),
  read_at timestamptz
);

alter table public.user_notifications enable row level security;

drop policy if exists "own notifications" on public.user_notifications;
create policy "own notifications" on public.user_notifications
  for select using (auth.uid() = user_id);

drop policy if exists "delete own notifications" on public.user_notifications;
create policy "delete own notifications" on public.user_notifications
  for delete using (auth.uid() = user_id);

-- Insert from the order push hook (service role / security definer).
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
begin
  if new.status is not distinct from old.status then
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
    when 'NO_VENDOR_FOUND' then 'No vendor'
    when 'NO_RIDER_AVAILABLE' then 'No rider yet'
    else 'Matebeto'
  end;
  v_body := 'Order #' || coalesce(new.order_number::text, '') || '. ' || v_title;

  insert into public.user_notifications (user_id, title, body, kind, order_id)
  values (new.customer_id, v_title, v_body, 'order', new.id);

  select secret into v_secret from public.push_hook where id = 1;
  if v_secret is null or length(v_secret) < 8 then
    return new;
  end if;

  begin
    perform net.http_post(
      url := 'https://lmyvvwulabezlglxjzvl.supabase.co/functions/v1/send-push',
      headers := jsonb_build_object('Content-Type','application/json','x-cron-secret', v_secret),
      body := jsonb_build_object('kind','order','orderId', new.id,'status', new.status)
    );
  exception when others then
    raise warning 'order push failed: %', sqlerrm;
  end;
  return new;
end;
$$;

commit;
