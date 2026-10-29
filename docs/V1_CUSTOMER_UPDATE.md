# Matebeto V1 customer-side update

Run order
1. Supabase SQL editor: run `supabase/migrations/20261027000000_restaurants_v1.sql` (safe to re-run).
2. `npm install` (adds expo-location), then a NEW build (EAS) - location needs a native rebuild, OTA update is not enough.
3. Admin app, before customers see it:
   - Markets: set Latitude / Longitude for each market (real distance on Home cards). Distance in km is only the fallback.
   - Vendors: for each restaurant add photo, stand number, cuisine, rating, then tick its meals and set its own price + food photo.
   - Home > Promotion: pick the restaurant the banner opens, add that restaurant's food photo.
   - Fees > Payment transaction charge %: leave 0 until the client confirms (their mockup shows 3.5%).
   - Menu: meals T-bone, Chicken, Dry Fish, Goat Meat; sides Beans, Okra, Rape.

What changed (customer side only)
- Home: greeting, location, clickable banner (opens restaurant menu), markets with real distance and "N active vendors", "More markets coming soon" strip.
- Market -> Restaurants list -> Restaurant menu (4 meals, own prices) -> Meal (sides, qty, Add to Order, then Continue Shopping / Continue to Checkout) -> Basket (fees, address, payment, Pay Now).
- Bottom navigation stays visible on all of them.
- One restaurant per basket; adding from another restaurant asks to clear the basket first.
- Server: create_order takes the chosen restaurant and uses its prices; only that restaurant is offered the order.
- Untouched: vendor/rider/admin dashboards, payment, payouts, OTP, WhatsApp, refunds.
