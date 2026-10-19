-- Sends a push to every registered phone when a new meal becomes visible with a photo.
-- Safe to run more than once. Existing meals are marked as already announced.
begin;

alter table public.meals add column if not exists announced_at timestamptz;
update public.meals set announced_at = now() where announced_at is null;

create or replace function public.enqueue_meal_push()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_secret text;
begin
  if new.announced_at is not null or not new.is_available or coalesce(new.image_url, '') = '' then
    return new;
  end if;

  select secret into v_secret from public.push_hook where id = 1;
  if v_secret is null or length(v_secret) < 8 then
    return new;
  end if;

  update public.meals set announced_at = now() where id = new.id;

  begin
    perform net.http_post(
      url := 'https://lmyvvwulabezlglxjzvl.supabase.co/functions/v1/send-push',
      headers := jsonb_build_object('Content-Type', 'application/json', 'x-cron-secret', v_secret),
      body := jsonb_build_object('kind', 'new_meal', 'mealId', new.id)
    );
  exception when others then
    raise warning 'meal push failed: %', sqlerrm;
  end;

  return new;
end;
$$;

drop trigger if exists meals_push on public.meals;
create trigger meals_push
after insert or update of image_url, is_available on public.meals
for each row
when (new.announced_at is null)
execute function public.enqueue_meal_push();

commit;
