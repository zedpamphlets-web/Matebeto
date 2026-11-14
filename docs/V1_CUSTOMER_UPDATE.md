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

## Update 2 (restaurants only, refunds, timeouts)
1. Run `supabase/migrations/20261028000000_refunds_and_timeouts.sql`.
2. Deploy the new edge function `send-refund` (Verify JWT ON) and redeploy `create-payment` (it now saves the number the customer paid with).
3. Change the scheduler to run every 30 seconds so the 5 minute rider timeout hands over quickly (see answer / LIVE_SETUP_NOTES).
4. Markets show "N restaurants". Categories are gone from Admin. Admin > Restaurants has collapsible cards.
5. Chosen restaurant does not accept (decline, no reply in the vendor timeout, or cannot fulfil): order is cancelled and marked refund pending.
   Admin > Orders > "Refund customer" sends the total back through Lipila to the number the customer paid with.

## Update 3 (Loko Cooks rebrand)
- App name is now "Loko Cooks" ("The Matebeto Online"). Package id, slug and scheme are unchanged so the store listing and EAS project stay the same.
- New assets from the boss's files: icon (flame on white), adaptive icon (white background), full-screen white splash, in-app full-screen logo screen.
- UI: maroon headers, orange action buttons, maroon active tab. Home has the maroon header with logo, LOKO COOKS, tagline and location.
- Customer welcome screen no longer shows "I'm a rider": riders use the separate Loko Cooks Rider app (same Supabase).
- Needs a NEW build (name, icon, splash and location changed).
