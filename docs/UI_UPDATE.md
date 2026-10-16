# UI update: white + red layout (Home, Market Menu, Meal Details, Basket)

Follows the approved 4-screen layout. White background, red accents, bottom bar Home / Orders / Basket / Profile.

## Changed
- app/(customer)/index.tsx, market/[id].tsx, meal/[id].tsx, basket.tsx, delivery.tsx, menu.tsx, _layout.tsx
- components/mk.tsx (new shared pieces), components/photo.tsx (optional `fallback` picture)
- lib/theme.ts (`ui` palette added; old colours untouched), lib/format.ts, lib/favourites.ts
- assets/logo-matebeto.png (transparent version of the supplied logo)
- supabase/migrations/20261016000000_ui_optional_fields.sql (optional `distance_km`, `prep_time`)

## Not changed
Supabase queries, offline cache, basket storage, payment, orders, rider and admin code.

## Pictures
There are no mockup pictures in the app. A market, category, meal, or banner shows a photo only when one is uploaded in Admin. With no photo, the card shows the name on a colour tile.

## What Admin controls on Home
Run `supabase/migrations/20261016000000_ui_optional_fields.sql` once in the Supabase SQL editor first. It only adds columns. It does not insert markets, meals, or photos.

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
Markets and menu tiles stay in the order already set in Admin (`sort_order`). Add or reorder them in Admin > Markets and Admin > Menu. This update does not insert sample markets or categories.
