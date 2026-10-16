-- Fields behind the new customer screens, so Admin can edit everything shown on Home.
-- Safe to run more than once. Does not insert markets, meals, photos, or other sample rows.
-- Empty values fall back to the standard wording in the app.
begin;

-- Home: market cards show distance; meal page shows prep time
alter table public.markets add column if not exists distance_km numeric(4,1);
alter table public.meals   add column if not exists prep_time text;

-- Home: banner second line ("Fresh. Tasty. Local.")
alter table public.banners add column if not exists subtitle text;

-- Home: text under the logo, city, markets heading, and the "Great food. Great places." strip
alter table public.settings add column if not exists home_tagline text;
alter table public.settings add column if not exists home_city text;
alter table public.settings add column if not exists home_markets_title text;
alter table public.settings add column if not exists promo_enabled boolean not null default true;
alter table public.settings add column if not exists promo_title text;
alter table public.settings add column if not exists promo_subtitle text;

commit;
