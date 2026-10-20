-- Matebeto: pay the vendor and the rider straight to their mobile money when the customer's OTP completes the order.
-- Nothing is sent until you turn it on:   update public.settings set payouts_enabled = true;
-- Safe to run more than once.

begin;

-- Where to send the money. Empty = use the vendor's phone/WhatsApp, or the rider's phone.
alter table public.vendors add column if not exists payout_number text;
alter table public.riders add column if not exists payout_number text;

-- A payout being sent is marked PROCESSING so it can never be sent twice.
do $$
declare c record;
begin
  for c in
    select conname from pg_constraint
    where conrelid = 'public.payouts'::regclass and contype = 'c' and pg_get_constraintdef(oid) like '%PENDING%'
  loop
    execute format('alter table public.payouts drop constraint %I', c.conname);
  end loop;
  alter table public.payouts
    add constraint payouts_status_check check (status in ('PENDING','PROCESSING','SENT','FAILED','MANUAL'));
end $$;

-- Admin: put a failed payout back in the queue (it is sent again within a minute)
create or replace function public.admin_retry_payout(p_payout uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then raise exception 'Forbidden'; end if;
  update public.payouts set status = 'PENDING', updated_at = now()
  where id = p_payout and status in ('FAILED', 'MANUAL');
  return jsonb_build_object('ok', found);
end;
$$;
revoke all on function public.admin_retry_payout(uuid) from public;
grant execute on function public.admin_retry_payout(uuid) to authenticated;

-- Send right away when a payout record is created (the every-minute job is the safety net)
create or replace function public.enqueue_payout_send()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_secret text;
begin
  select secret into v_secret from public.push_hook where id = 1;
  if v_secret is null or length(v_secret) < 8 then
    return new;
  end if;
  begin
    perform net.http_post(
      url := 'https://lmyvvwulabezlglxjzvl.supabase.co/functions/v1/send-payouts',
      headers := jsonb_build_object('Content-Type', 'application/json', 'x-cron-secret', v_secret),
      body := jsonb_build_object('orderId', new.order_id)
    );
  exception when others then
    raise warning 'payout send trigger failed: %', sqlerrm;
  end;
  return new;
end;
$$;

drop trigger if exists payouts_send on public.payouts;
create trigger payouts_send
after insert on public.payouts
for each row
execute function public.enqueue_payout_send();

commit;

notify pgrst, 'reload schema';
