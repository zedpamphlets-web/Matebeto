# Fix round 1 - what changed and how to deploy it

Test everything on a Supabase branch or a copy first. Nothing here has been run against a real
database or a real Lipila / WhatsApp account yet.

## 1. Run the SQL (in this order)
1. `supabase/migrations/20261010000000_part1_security.sql`
2. `supabase/migrations/20261010010000_part2_server_flow.sql`
3. `supabase/migrations/20261010020000_part3_payouts_and_exceptions.sql`
4. `supabase/migrations/20261010030000_fixes.sql`  (new)

## 2. Deploy the edge functions
Deploy all of them. Set "Verify JWT" OFF for: `lipila-webhook`, `whatsapp-webhook`, `notify-vendor`,
`run-timeouts` (they check their own secrets in code). Leave it ON (default) for `create-payment`,
`verify-payment`.

New: `run-timeouts`, `_shared/payments.ts`. Changed: all payment and WhatsApp functions.

## 3. Secrets (Edge Functions -> Secrets)
| Name | What it is |
| --- | --- |
| `LIPILA_SECRET_KEY`, `LIPILA_BASE_URL` | Lipila key and address (production is `https://blz.lipila.io/api/v1`) |
| `LIPILA_WEBHOOK_SECRET` | any random string; added to the callback address as `?token=` |
| `WHATSAPP_TOKEN`, `WHATSAPP_PHONE_ID` | Meta permanent token and Phone Number ID |
| `WHATSAPP_APP_SECRET`, `WHATSAPP_VERIFY_TOKEN` | Meta app secret; a random string you also type into Meta's webhook form |
| `WHATSAPP_TEMPLATE_NAME` | `vendor_order_request` (the approved template) |
| `CRON_SECRET` | any random string; used by the scheduler |

## 4. Schedule `run-timeouts` every minute
Supabase dashboard -> Integrations -> Cron (or Database -> Cron) -> new job -> type "Supabase Edge
Function" -> `run-timeouts` -> every 1 minute -> add the HTTP header `x-cron-secret` with your
`CRON_SECRET` value. It handles vendor and rider timeouts, retries WhatsApp messages that failed,
starts searches for paid orders that got stuck, and re-checks payments whose callback never came.

## 5. Check these before going live
- **Lipila callback.** `create-payment` sends `callbackUrl` as a header AND a body field. Make one
  small payment in the Lipila sandbox, look in Edge Functions -> `lipila-webhook` -> Logs, and
  confirm the callback arrives. Then remove whichever of the two Lipila ignores.
- **Lipila production address.** `LIPILA_BASE_URL` points at production by default, so test payments
  charge real money. Test with K1.
- **Function permissions.** In the SQL editor run:
  `select p.proname, has_function_privilege('anon', p.oid, 'execute') anon, has_function_privilege('authenticated', p.oid, 'execute') authed, has_function_privilege('service_role', p.oid, 'execute') service from pg_proc p join pg_namespace n on n.oid = p.pronamespace where n.nspname = 'public' order by 1;`
  Expected: `anon` is true only for `is_admin`; `authed` is true only for the functions granted at the
  end of the fixes migration; `service` is true for all.
- **Vendors need meals.** A vendor only counts as able to fulfil an order if they are linked to every
  meal in the basket in `vendor_meals`. Without those rows the order ends in NO_VENDOR_FOUND.
- **Template.** `vendor_order_request` must show Active in WhatsApp Manager.

## 6. Manual test script
1. Signed out: calling any function except `is_admin` is refused.
2. Rider: cannot read `delivery_otp_private`, cannot read `vendors`, cannot set own `status` to APPROVED.
3. Rider cannot accept an order that was not offered to them. After 5 wrong OTP codes the order shows SUPPORT_REQUIRED; accepting again does not reset it.
4. Pay K1 -> callback arrives -> order goes to VENDOR_OFFERED -> exactly one WhatsApp message.
5. Close the customer app right after paying: the vendor is still messaged.
6. Fire the Lipila callback twice: still one vendor, one attempt used.
7. Vendor taps Decline -> next vendor is messaged. Three declines -> NO_VENDOR_FOUND.
8. Vendor taps Accept -> a rider offer is created. A late Accept on a cancelled order does nothing.
9. Cancel a paid order before the vendor accepts -> payment_status `refund_pending`; admin can mark it refunded.
10. Rider: Customer not home -> correct OTP still completes the order; after the wait it becomes SUPPORT_REQUIRED.
11. Admin: Reset OTP lock, Reassign rider, Vendor can't fulfil, Cancel all keep the same order number.
12. A rejected rider can apply again. An approved rider who changes vehicle goes back to PENDING.

## 7. Still NOT built (needs the client's decisions)
- **Paying vendors and riders.** Payout records are created when an order completes
  (`create_payout_records`, vendor gets `food_total`, rider gets `delivery_fee` - placeholders) but
  nothing sends the money. Needed first: payout amounts, whether vendors have a cost price per meal,
  vendor and rider mobile-money numbers, and Lipila's official payout documentation.
  `settings.payouts_enabled` is `false` and must stay false until the sender exists and is tested.
- **Automatic refunds.** Cancelled paid orders are marked `refund_pending`; an admin sends the money
  back manually and taps "Mark refunded".
- **Retry vendor search after 3 attempts.** The customer can cancel for a refund or place a new order.
