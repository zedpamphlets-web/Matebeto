# Matebeto live setup notes (what was learned while testing)

These are the settings that are NOT visible in the code but must be right for the system to work.

## Edge functions
Deploy all 6. Set **Verify JWT OFF** on every one of them. Each checks its own secret or signed-in user
in code. If JWT checking is on, Meta and Lipila (which send no Supabase token) get "401 Unauthorized".
Pasting new code in the Supabase dashboard can switch it back on, so re-check after every deploy.

| Function | Called by | Notes |
| --- | --- | --- |
| create-payment | the app (Pay Now) | charges the customer through Lipila |
| verify-payment | the app, every 4 seconds while a payment waits | confirms the payment and starts the vendor search |
| lipila-webhook | Lipila callback (`?token=LIPILA_WEBHOOK_SECRET`) | same confirmation, instant when Lipila calls |
| notify-vendor | server only | sends the WhatsApp template to the vendor |
| whatsapp-webhook | Meta | receives the vendor's Accept / Decline |
| run-timeouts | cron, every minute | timeouts, retries, and re-checks pending payments |

## Secrets
`LIPILA_SECRET_KEY`, `LIPILA_BASE_URL`, `LIPILA_WEBHOOK_SECRET`, `WHATSAPP_TOKEN`, `WHATSAPP_PHONE_ID`,
`WHATSAPP_APP_SECRET`, `WHATSAPP_VERIFY_TOKEN`, `CRON_SECRET`.
Optional: `WHATSAPP_TEMPLATE_NAME` (default `vendor_order_request`), `WHATSAPP_TEMPLATE_LANG`
(default: tries `en`, then `en_US`).
Use a permanent system-user token for `WHATSAPP_TOKEN`. A wrong or expired token gives Meta error 190.

## Lipila
- Check-status requests must NOT send a Content-Type header (Lipila answers 400). The helper handles this.
- A live key goes with `https://blz.lipila.io/api/v1`. Live payments charge real money.

## Meta / WhatsApp
- The Meta app must be **published**, or vendor replies never arrive.
- The Meta app must be **subscribed to the WhatsApp Business Account** (not only the webhook URL). If vendor
  replies do not arrive even though the webhook shows as verified, subscribe it:
  `POST https://graph.facebook.com/v21.0/<WABA_ID>/subscribed_apps` with the system-user token.
- In the webhook fields, `messages` must be switched on.
- The template `vendor_order_request` was created in language "English" (`en`), not "English (US)".
- For real vendors (not test numbers) the client must complete Business Verification, add a payment method,
  and register a real business number.

## Scheduler (run once in the SQL editor; put your real CRON_SECRET in)
```sql
create extension if not exists pg_net;
create extension if not exists pg_cron;
select cron.schedule('run-timeouts', '* * * * *', $$ select net.http_post(
  url := 'https://<PROJECT_REF>.supabase.co/functions/v1/run-timeouts',
  headers := '{"Content-Type": "application/json", "x-cron-secret": "<CRON_SECRET>"}'::jsonb,
  body := '{}'::jsonb); $$);
```
Check it with: `select status_code, left(content, 300), created from net._http_response order by created desc limit 3;`

## Database
- A vendor receives an order only if they are in the order's market AND linked to every meal in the basket
  (`vendor_meals`). Otherwise the order ends as NO_VENDOR_FOUND.
- Vendor WhatsApp numbers can be saved as `0951234567` or `260951234567`.

## Not built yet
- Automatic payouts to vendors and riders (records are created, nothing is sent).
- Automatic refunds (cancelled paid orders are marked `refund_pending`; an admin refunds and taps "Mark refunded").

## Payment flow in the app (customer)
Checkout creates the order, then opens the payment processing page (`app/payment/[id].tsx`):
a spinning plate while the customer approves on their phone, then either "Payment received" (opens the
order page) or "Payment failed" (red X, with Try again / Use a different number / Cancel order).
After 2.5 minutes without an answer it shows "taking longer than usual" with Check again.
