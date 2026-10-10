-- Banners: multiple with text + amount, auto-swap every 10s
-- Safe to run twice.

begin;

create table if not exists public.banners (
  id uuid primary key default gen_random_uuid(),
  image_url text,
  title text,
  amount numeric(12,2),
  sort_order int not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

alter table public.banners enable row level security;

drop policy if exists "banners_read" on public.banners;
create policy "banners_read" on public.banners for select using (is_active = true or public.is_admin());

drop policy if exists "admin_write_banners" on public.banners;
create policy "admin_write_banners" on public.banners for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

grant select on public.banners to anon, authenticated;

commit;
