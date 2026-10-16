-- Phone push tokens, plus a hook that tells the send-push API when an order changes.
-- Safe to run more than once. Does not insert sample orders.
-- Notifications stay off until push_hook.secret is the same value as CRON_SECRET.

begin;

create extension if not exists pg_net;

create table if not exists public.push_tokens (
  token text primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  platform text not null default 'android',
  updated_at timestamptz not null default now()
);

alter table public.push_tokens enable row level security;

create table if not exists public.push_hook (
  id int primary key default 1 check (id = 1),
  secret text not null default ''
);

alter table public.push_hook enable row level security;

insert into public.push_hook (id, secret) values (1, '')
on conflict (id) do nothing;

create or replace function public.register_push_token(p_token text, p_platform text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'Not signed in';
  end if;
  if p_token is null or length(trim(p_token)) < 20 then
    raise exception 'Bad token';
  end if;

  delete from public.push_tokens where token = trim(p_token) and user_id <> auth.uid();

  insert into public.push_tokens (token, user_id, platform, updated_at)
  values (trim(p_token), auth.uid(), coalesce(nullif(trim(p_platform), ''), 'android'), now())
  on conflict (token) do update
    set user_id = excluded.user_id,
        platform = excluded.platform,
        updated_at = now();
end;
$$;

revoke all on function public.register_push_token(text, text) from public;
grant execute on function public.register_push_token(text, text) to authenticated;

create or replace function public.enqueue_order_push()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_secret text;
begin
  if new.status is not distinct from old.status then
    return new;
  end if;
  if new.status not in (
    'VENDOR_OFFERED',
    'VENDOR_ACCEPTED',
    'RIDER_ASSIGNED',
    'OUT_FOR_DELIVERY',
    'COMPLETED',
    'CANCELLED',
    'NO_VENDOR_FOUND',
    'NO_RIDER_AVAILABLE'
  ) then
    return new;
  end if;

  select secret into v_secret from public.push_hook where id = 1;
  if v_secret is null or length(v_secret) < 8 then
    return new;
  end if;

  begin
    perform net.http_post(
      url := 'https://lmyvvwulabezlglxjzvl.supabase.co/functions/v1/send-push',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'x-cron-secret', v_secret
      ),
      body := jsonb_build_object(
        'kind', 'order',
        'orderId', new.id,
        'status', new.status
      )
    );
  exception when others then
    raise warning 'order push failed: %', sqlerrm;
  end;

  return new;
end;
$$;

drop trigger if exists orders_push on public.orders;
create trigger orders_push
after update of status on public.orders
for each row
when (old.status is distinct from new.status)
execute function public.enqueue_order_push();

create or replace function public.enqueue_rider_push()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_secret text;
begin
  if new.status <> 'OFFERED' then
    return new;
  end if;

  select secret into v_secret from public.push_hook where id = 1;
  if v_secret is null or length(v_secret) < 8 then
    return new;
  end if;

  begin
    perform net.http_post(
      url := 'https://lmyvvwulabezlglxjzvl.supabase.co/functions/v1/send-push',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'x-cron-secret', v_secret
      ),
      body := jsonb_build_object(
        'kind', 'rider_offer',
        'orderId', new.order_id,
        'riderId', new.rider_id
      )
    );
  exception when others then
    raise warning 'rider push failed: %', sqlerrm;
  end;

  return new;
end;
$$;

drop trigger if exists rider_offer_push on public.rider_offers;
create trigger rider_offer_push
after insert on public.rider_offers
for each row
execute function public.enqueue_rider_push();

commit;
