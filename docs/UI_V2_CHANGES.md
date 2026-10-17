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
