# Matebeto V1

Food marketplace for Lusaka. Customer chooses food. Matebeto chooses the vendor. OTP completes the order.

## Stack

Expo SDK 52 + React Native 0.76.3 + Supabase + Lipila.

Same EAS versions as the previous working Marketplace repo so Android preview builds do not fail on Kotlin / SDK mismatch.

## Expo project

Linked in `app.json` to the Expo org **matebetos-team**:

| Field | Value |
| --- | --- |
| name | Matebeto |
| slug | matebeto-team |
| owner | matebetos-team |
| extra.eas.projectId | 70c2c6ad-a0e0-4a4b-8f69-136bcb7e001a |

That is what EAS uses to find the project when you run `eas build`. You do not need `eas init` again.

## What is real

- Phone OTP through Supabase Auth (needs your SMS provider)
- Orders, vendors, riders, fees in Supabase
- Lipila collections through Edge Functions
- Delivery OTP hashed in the database
- WhatsApp send/webhook ready when you add tokens

Nothing here marks an order paid or delivered unless Lipila or the customer OTP says so.

## Setup

1. Create a Supabase project.
2. Run `supabase/schema.sql` then `supabase/seed.sql`.
3. Enable Phone auth. Add SMS later.
4. Copy `.env.example` to `.env` with your project URL and anon key.
5. Deploy functions:

```bash
supabase functions deploy create-payment
supabase functions deploy verify-payment
supabase functions deploy notify-vendor
supabase functions deploy whatsapp-webhook
supabase secrets set LIPILA_SECRET_KEY=...
supabase secrets set LIPILA_BASE_URL=https://blz.lipila.io/api/v1
```

6. Make yourself admin after first login:

```sql
insert into public.platform_admins (user_id) values ('YOUR-USER-UUID');
```

7. Replace vendor WhatsApp numbers in Admin with real partners.
8. `npm install` then `npx expo start`
9. `eas build --platform android --profile preview`

## Later (you said you will send these)

```bash
supabase secrets set WHATSAPP_TOKEN=...
supabase secrets set WHATSAPP_PHONE_ID=...
supabase secrets set WHATSAPP_VERIFY_TOKEN=...
```

Until those exist, vendors are offered in the database and an admin can accept/decline. The app does not invent an acceptance.

## Locked rules implemented

- One app, two modes
- Customer does not pick the vendor
- One order = one vendor
- Max three vendor attempts
- Permanent order number
- Bicycle and motorbike kept separate
- Sides included / free
- Checkout shows food + platform + delivery only
- Delivery OTP required
- No rider force-complete
- OTP triggers COMPLETED
- Markets are rows, not hard-coded screens
