-- Run this in the Supabase SQL editor after schema.sql.
-- Phone-uploaded catalog photos live in the public "catalog" bucket.

insert into storage.buckets (id, name, public)
values ('catalog', 'catalog', true)
on conflict (id) do update set public = true;

drop policy if exists "catalog_public_read" on storage.objects;
create policy "catalog_public_read"
  on storage.objects for select
  using (bucket_id = 'catalog');

drop policy if exists "catalog_admin_insert" on storage.objects;
create policy "catalog_admin_insert"
  on storage.objects for insert to authenticated
  with check (bucket_id = 'catalog' and public.is_admin());

drop policy if exists "catalog_admin_update" on storage.objects;
create policy "catalog_admin_update"
  on storage.objects for update to authenticated
  using (bucket_id = 'catalog' and public.is_admin())
  with check (bucket_id = 'catalog' and public.is_admin());

drop policy if exists "catalog_admin_delete" on storage.objects;
create policy "catalog_admin_delete"
  on storage.objects for delete to authenticated
  using (bucket_id = 'catalog' and public.is_admin());

alter table public.settings add column if not exists home_banner_url text;
