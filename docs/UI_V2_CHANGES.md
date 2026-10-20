# UI v2: white, Yango-style

## Look
- Every page is white. Peach/cream background removed (lib/theme.ts).
- Home: logo on white (no black box, no header card). Banner is taller with the next banner peeking. Market cards and banner art untouched. Avondale tile no longer prints its name twice.
- Bottom bar: solid white with a thin top line.
- Meal list (market page): rows with name, description, price and photo on the right, divided by lines.
- Account: saved details show as a card with an Edit button. The form only opens on Edit (or when nothing is saved yet).
- Orders, Markets, Notifications rebuilt on white (food-photo backgrounds removed).

## Opening and loading
- Splash (copied from the Yango video): large yellow wordmark on black; the black page slides out to the left behind a slanted edge, the wordmark stays put and flips to black on the white; after a short rest it rises off the top (components/brand-splash.tsx). Navigation waits until it has finished. Native splash image regenerated big (assets/splash.png).
- One spinner everywhere (components/spinner.tsx). Old orange-slice, plate loader and skeleton blocks now all show it.
- Admin: spinner page, then dashboard. Market and meal pages open on a white spinner page.

## Login
- Phone and code screens follow Yango's layout (components/auth-ui.tsx). Log out always goes to login.

## Popups
- components/confirm.tsx. Used for: log out (customer, rider, admin), delete rider / banner / market / category / meal / notification, clear basket, admin order actions.

## Rider
- Jobs, job detail, earnings on white. Application follows the Lenco ID layout: card, progress ring, radio list (licence, NRC, passport), dashed upload boxes, full-width Continue.
- Admin > Riders: expanded card shows name, phone, gender, vehicle, ID type, area, applied date, face photo and both ID photos.

## Admin
- Dashboard cards show only live counts, no filler text. Explanatory paragraphs removed. Log out added.

## Phone notifications (when the app is closed)
The app side re-saves the phone token every time the app opens. If nothing arrives, the server side is the cause. Check in order:
1. SQL `20261016010000_push_notifications.sql` ran, and `update public.push_hook set secret = '<CRON_SECRET>' where id = 1;`
2. `send-push` is deployed with Verify JWT off.
3. FCM V1 service-account key uploaded in Expo credentials (Android, production).
4. A NEW build was made after that (eas build --platform android --profile internal) and installed.
5. In Supabase, table `push_tokens` has a row for the phone after login. No row = permission denied on the phone or an old build.

## Buttons (matches the approved mock-up)
Red buttons (#D6263A), white outline for secondary actions, red selected chips/tabs/checkboxes, soft pink for strips. Login Continue/Verify, welcome buttons, rider Continue, camera buttons and retry buttons all use it.
Notifications now sits below the status bar with the standard back header (the old one overlapped the clock).

## Boss's rider flow (2026-10-21)
Run `supabase/migrations/20261021000000_rider_job_card.sql`, redeploy `send-push` (or paste `docs/send-push-dashboard.ts`), then make a new build.
- New delivery request (popup on the rider home, the request card, and the phone push): Origin (market), Delivery (area), Amount (trip price). Accept or Decline. Nothing else is revealed before accepting.
- After accepting: VENDOR (name, number with call button, market, order number) and DELIVERY (name, number with call button, address, notes).
- At the vendor: type the order number the vendor shows, tap Collected. A wrong number does not move the order (checked on the server).
- Delivery: call the customer, enter the customer's OTP, Complete delivery.
- Refund on failed payments stays admin-only (Admin > Orders > Mark refunded).
- NOT built yet: paying vendor and rider instantly when the OTP is entered. Needs Lipila payout details (see docs/FIXES_AND_SETUP.md section 7).

## Paying the vendor and rider straight to mobile money (2026-10-22)
Built from Lipila's published SDK docs. It has NOT been tried against Lipila. Test with a K1 order first.
1. Run `supabase/migrations/20261022000000_payouts.sql`.
2. Deploy `send-payouts` (Verify JWT OFF) and redeploy `run-timeouts`.
3. Admin > Vendors: set each vendor's "Mobile money number for payments" (if empty, their phone/WhatsApp is used). Riders are paid to the phone number on their application.
4. Do a K1 test order end to end. Check Edge Functions > send-payouts > Logs and the payouts table. In Admin > Orders each completed order shows "Vendor/Rider payout ... Sent/Failed". A failed one has a "Retry payout" button.
5. Only then turn it on: `update public.settings set payouts_enabled = true;`
Amounts (still to be confirmed by the boss): vendor gets the food total, rider gets the delivery fee, Matebeto keeps the platform fee.
The account the money leaves from is your Lipila wallet, so it must hold enough balance.
If Lipila rejects the request, compare the body in `_shared/payouts.ts` with the disbursement page of your Lipila dashboard docs.
