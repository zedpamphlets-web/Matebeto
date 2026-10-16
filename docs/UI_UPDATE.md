# UI update: white + red layout (Home, Market Menu, Meal Details, Basket)

Follows the approved 4-screen layout. White background, red accents, bottom bar Home / Orders / Basket / Profile.

## Changed
- app/(customer)/index.tsx, market/[id].tsx, meal/[id].tsx, basket.tsx, delivery.tsx, menu.tsx, _layout.tsx
- components/mk.tsx (new shared pieces), components/photo.tsx (optional `fallback` picture)
- lib/theme.ts (`ui` palette added; old colours untouched), lib/format.ts, lib/favourites.ts, lib/mockup-images.ts (new)
- assets/logo-matebeto.png (transparent version of the supplied logo), assets/mockup/* (pictures cut from the mockups)
- supabase/migrations/20261016000000_ui_optional_fields.sql (optional `distance_km`, `prep_time`)

## Not changed
Supabase queries, offline cache, basket storage, payment, orders, rider and admin code.

## Pictures
A photo uploaded in Admin always wins. The mockup pictures are only shown when a market, category or meal has no
photo. They are small crops (about 300 px wide); replace them by uploading real photos in Admin.

## What Admin controls on Home
Run `supabase/migrations/20261016000000_ui_optional_fields.sql` once in the Supabase SQL editor first.

| On Home | Where to change it |
| --- | --- |
| Banner text, small line, amount, food photo, order, show/hide | Admin > Home > Banners |
| Line under the logo ("Good Food. Closer to You.") | Admin > Home > Home text |
| City ("Lusaka") and markets heading | Admin > Home > Home text |
| Bottom strip ("Great food. Great places."): on/off, title, second line | Admin > Home > Bottom strip |
| Market cards: name, distance, photo, order, hide/show, delete | Admin > Markets |

Empty fields fall back to the standard wording. Delivery fees stay in Admin > Home > Fees.

## Admin layout
No bottom bar. Admin opens on a dashboard of cards: Orders, Home screen, Markets, Menu, Vendors, Riders, Open customer app.
Each section has a back arrow. All admin screens are white with red buttons. Orders moved from `app/admin/index.tsx` to `app/admin/orders.tsx`.

## Order on Home and Menu
The same migration puts markets in the order Longacres, Olympia, Thornpark, Avondale and the food tiles in the order
T-Bone, Chicken, Fish, Goat Meat, Offals, Kapenta. Other categories already in the database come after these;
delete them in Admin > Menu if you want only the six.
