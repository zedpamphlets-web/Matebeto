-- Matebeto: admin Earnings screen (platform fee totals). Read-only, admin only. Safe to run more than once.
create or replace function public.admin_earnings()
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_tz text := 'Africa/Lusaka';
  v_today timestamptz := date_trunc('day', now() at time zone v_tz) at time zone v_tz;
  v_week timestamptz := date_trunc('week', now() at time zone v_tz) at time zone v_tz;
  v_month timestamptz := date_trunc('month', now() at time zone v_tz) at time zone v_tz;
begin
  if not public.is_admin() then raise exception 'Forbidden'; end if;
  return jsonb_build_object(
    'fee_today', (select coalesce(sum(platform_fee), 0) from public.orders where status = 'COMPLETED' and updated_at >= v_today),
    'fee_week',  (select coalesce(sum(platform_fee), 0) from public.orders where status = 'COMPLETED' and updated_at >= v_week),
    'fee_month', (select coalesce(sum(platform_fee), 0) from public.orders where status = 'COMPLETED' and updated_at >= v_month),
    'fee_all',   (select coalesce(sum(platform_fee), 0) from public.orders where status = 'COMPLETED'),
    'orders_all',   (select count(*) from public.orders where status = 'COMPLETED'),
    'orders_today', (select count(*) from public.orders where status = 'COMPLETED' and updated_at >= v_today),
    'vendor_sent', (select coalesce(sum(amount), 0) from public.payouts where payee_type = 'vendor' and status = 'SENT'),
    'rider_sent',  (select coalesce(sum(amount), 0) from public.payouts where payee_type = 'rider' and status = 'SENT'),
    'waiting', (select count(*) from public.payouts where status in ('PENDING', 'PROCESSING')),
    'failed',  (select count(*) from public.payouts where status in ('FAILED', 'MANUAL')),
    'failed_amount', (select coalesce(sum(amount), 0) from public.payouts where status in ('FAILED', 'MANUAL'))
  );
end;
$$;
revoke all on function public.admin_earnings() from public;
grant execute on function public.admin_earnings() to authenticated;
notify pgrst, 'reload schema';
