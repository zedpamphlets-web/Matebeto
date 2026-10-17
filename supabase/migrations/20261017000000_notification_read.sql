-- Lets the app mark the signed-in user's notifications as read. Safe to run more than once.
create or replace function public.mark_notifications_read()
returns void
language sql
security definer
set search_path = public
as $$
  update public.user_notifications
  set read_at = now()
  where user_id = auth.uid() and read_at is null;
$$;

revoke all on function public.mark_notifications_read() from public;
grant execute on function public.mark_notifications_read() to authenticated;
