-- Older copies of the orders table had address_text / address_notes marked NOT NULL.
-- The current create_order stores the address in delivery_address, so those must be optional.
-- Safe to run twice, and does nothing if the columns do not exist.
do $$
begin
  if exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'orders' and column_name = 'address_text') then
    alter table public.orders alter column address_text drop not null;
  end if;
  if exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'orders' and column_name = 'address_notes') then
    alter table public.orders alter column address_notes drop not null;
  end if;
end $$;
