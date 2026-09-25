-- Launch catalog for Thornpark, Longacres, Olympia.
-- Vendors are real operating records you should rename to actual partners.

insert into public.markets (name, slug, image_url, sort_order) values
  ('Thornpark', 'thornpark', 'https://images.unsplash.com/photo-1555939594-58d7cb561ad1?w=1200', 1),
  ('Longacres', 'longacres', 'https://images.unsplash.com/photo-1544025162-d76690232da6?w=1200', 2),
  ('Olympia', 'olympia', 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=1200', 3)
on conflict (slug) do nothing;

insert into public.categories (name, image_url, sort_order) values
  ('Chicken', 'https://images.unsplash.com/photo-1598103442097-8b74394b95c6?w=800', 1),
  ('T-Bone', 'https://images.unsplash.com/photo-1600891964092-4316c288032e?w=800', 2),
  ('Fish', 'https://images.unsplash.com/photo-1519708227418-c8fd9a32b7a2?w=800', 3),
  ('Traditional Meals', 'https://images.unsplash.com/photo-1604329760661-e71dc83f8f26?w=800', 4),
  ('Vegetables', 'https://images.unsplash.com/photo-1540420773420-3366772f4999?w=800', 5),
  ('Other Meals', 'https://images.unsplash.com/photo-1482049016688-2d3e1b311543?w=800', 6);

do $$
declare
  c_chicken uuid; c_tbone uuid; c_fish uuid; c_trad uuid; c_veg uuid; c_other uuid;
  m_tbone uuid; m_chicken uuid; m_fish uuid; m_nshima uuid; m_veg uuid;
  mk uuid; v uuid;
begin
  select id into c_chicken from public.categories where name = 'Chicken' limit 1;
  select id into c_tbone from public.categories where name = 'T-Bone' limit 1;
  select id into c_fish from public.categories where name = 'Fish' limit 1;
  select id into c_trad from public.categories where name = 'Traditional Meals' limit 1;
  select id into c_veg from public.categories where name = 'Vegetables' limit 1;
  select id into c_other from public.categories where name = 'Other Meals' limit 1;

  insert into public.meals (category_id, name, description, price, image_url, is_featured)
  values
    (c_tbone, 'T-Bone Steak', 'Grilled T-bone steak served with your choice of included sides.', 85, 'https://images.unsplash.com/photo-1600891964092-4316c288032e?w=1200', true),
    (c_chicken, 'Quarter Chicken', 'Flame-grilled chicken quarter with included sides.', 65, 'https://images.unsplash.com/photo-1598103442097-8b74394b95c6?w=1200', true),
    (c_fish, 'Grilled Fish', 'Fresh grilled fish with included sides.', 75, 'https://images.unsplash.com/photo-1519708227418-c8fd9a32b7a2?w=1200', true),
    (c_trad, 'Traditional Plate', 'A full traditional plate with relish and included sides.', 55, 'https://images.unsplash.com/photo-1604329760661-e71dc83f8f26?w=1200', false),
    (c_veg, 'Vegetable Bowl', 'Seasonal vegetables with included sides.', 45, 'https://images.unsplash.com/photo-1540420773420-3366772f4999?w=1200', false)
  on conflict do nothing;

  select id into m_tbone from public.meals where name = 'T-Bone Steak' limit 1;
  select id into m_chicken from public.meals where name = 'Quarter Chicken' limit 1;
  select id into m_fish from public.meals where name = 'Grilled Fish' limit 1;
  select id into m_nshima from public.meals where name = 'Traditional Plate' limit 1;
  select id into m_veg from public.meals where name = 'Vegetable Bowl' limit 1;

  insert into public.meal_sides (meal_id, name)
  select m_tbone, x from unnest(array['Nshima','Vegetables','Beans','Okra']) x
  on conflict do nothing;
  insert into public.meal_sides (meal_id, name)
  select m_chicken, x from unnest(array['Nshima','Vegetables','Beans','Okra']) x;
  insert into public.meal_sides (meal_id, name)
  select m_fish, x from unnest(array['Nshima','Vegetables','Salad']) x;
  insert into public.meal_sides (meal_id, name)
  select m_nshima, x from unnest(array['Nshima','Relish','Vegetables']) x;
  insert into public.meal_sides (meal_id, name)
  select m_veg, x from unnest(array['Nshima','Beans']) x;

  for mk in select id from public.markets
  loop
    insert into public.vendors (market_id, name, contact_name, phone, whatsapp, is_active, is_available)
    values
      (mk, 'Market Grill 1', 'Operations', '260970000001', '260970000001', true, true),
      (mk, 'Market Grill 2', 'Operations', '260970000002', '260970000002', true, true),
      (mk, 'Market Grill 3', 'Operations', '260970000003', '260970000003', true, true)
    returning id into v;
  end loop;

  insert into public.vendor_meals (vendor_id, meal_id, is_available)
  select v.id, m.id, true from public.vendors v cross join public.meals m
  on conflict do nothing;
end $$;

update public.settings set
  platform_fee = 10,
  bicycle_delivery_fee = 15,
  motorbike_delivery_fee = 25
where id = 1;
