# Matebeto integrations — WhatsApp API + Zambia SMS

Do this after the UI is running. Do **not** put these keys in the mobile app. They live in Supabase secrets only.

## 1. WhatsApp Business Cloud API (vendor accept / decline)

The brief requires a real Business API, not a personal WhatsApp account.

The app already calls Meta Cloud API from `supabase/functions/notify-vendor`.
Vendors get **ACCEPT / DECLINE** buttons. Replies hit `whatsapp-webhook`.

`POST https://graph.facebook.com/v21.0/{PHONE_NUMBER_ID}/messages`

### On the Meta screen you opened (Matebet app)

Stay on **Integrate with API**. Do **not** click Become a Tech Provider.

1. Pick business portfolio **Apptech** (or 6images) → tick the terms → **Continue**.
2. Open **Step 1. Try it out**.
3. Meta gives you a **test WhatsApp number** and a temporary token.
4. Add up to 5 real phones you can message (your own + one vendor test number).
5. Send the test `hello_world` template once so the API is live.
6. Copy these three values from **API Setup / Quickstart**:
   - **Access token** → `WHATSAPP_TOKEN`
   - **Phone number ID** (digits, not +260…) → `WHATSAPP_PHONE_ID`
   - Invent a verify string e.g. `matebeto-wa-2026` → `WHATSAPP_VERIFY_TOKEN`
7. Later: **Step 2 Production setup** adds your dedicated Zambian business line. That number cannot already be logged into normal WhatsApp.
8. **Step 3 Business verification** is Meta company docs. Needed before messaging numbers that are not in the test list.

### Webhook (so ACCEPT / DECLINE come back into Matebeto)

Callback URL:

`https://YOUR-PROJECT.supabase.co/functions/v1/whatsapp-webhook`

Verify token: the same string as `WHATSAPP_VERIFY_TOKEN`.  
Subscribe to **messages**.

### Put the keys on Supabase

From your Meta **Step 1. Try it out** screen:

- **Phone number ID** → e.g. `1255603277647233`
- **Access token** → full token from “Copy access token” (temporary; renew or use System User later)
- **Verify token** → e.g. `matebeto-wa-2026`

```bash
supabase secrets set WHATSAPP_TOKEN="PASTE_FULL_META_TOKEN"
supabase secrets set WHATSAPP_PHONE_ID="1255603277647233"
supabase secrets set WHATSAPP_VERIFY_TOKEN="matebeto-wa-2026"
supabase functions deploy notify-vendor
supabase functions deploy whatsapp-webhook
```

Webhook callback URL in Meta:

`https://YOUR-PROJECT-REF.supabase.co/functions/v1/whatsapp-webhook`

Until those secrets exist, Admin can still accept / decline from the back office. The customer app does not fake a vendor reply.

Full checklist with your test numbers: **`docs/WHATSAPP_SETUP.md`**.

### What the vendor receives

```
MATEBETO ORDER #1042
ITEMS
2 × T-Bone Steak
SIDES
Nshima
TOTAL: K310
Tap ACCEPT or DECLINE
```

Plus two buttons: **ACCEPT** and **DECLINE**.

---

## 2. One Zambia SMS provider — Africa's Talking

Use this for customer and rider **login OTPs** (Supabase Phone Auth).

Why this one:

- Official Zambia presence (AfricaWorks Lusaka, Agora Village)
- Zambia desk: +260 76 5120740 · zambia@africastalking.com
- Routes to **MTN, Airtel, Zamtel**
- Sandbox first, then live
- Docs and API keys are straightforward

### Get the API

1. Register: https://account.africastalking.com/
2. Verify the email.
3. Create a **Team**, then a live **App** called `Matebeto`.
4. Open the app → **Settings → API Key** → request a key (link is emailed).
5. Copy:
   - App **username**
   - **API key**
6. Fund the wallet and request a Zambia **alphanumeric sender ID** such as `MATEBETO` (ZICTA / network registration can take a few days). Until that is approved, use their shared sender.
7. Test from sandbox first: username is always `sandbox` with the sandbox API key.

Docs: https://developers.africastalking.com/docs/sms/overview  
Pricing (pick Zambia): https://africastalking.com/pricing

### Connect it to Matebeto login OTPs

The function `supabase/functions/send-sms` talks to Africa's Talking.

```bash
supabase secrets set AT_USERNAME=your_app_username
supabase secrets set AT_API_KEY=your_api_key
supabase secrets set AT_FROM=MATEBETO
supabase functions deploy send-sms
```

Then in Supabase Dashboard:

**Authentication → Hooks → Send SMS hook**  
point to `send-sms`  
and enable **Phone** provider under **Authentication → Providers**.

Login flow stays: enter +260 number → Africa's Talking sends the code → user types it in the app.

If the phone screen shows **Network request failed**:

1. Confirm the project at `https://lmyvvwulabezlglxjzvl.supabase.co` is **Active**, not paused.
2. Authentication → Providers → **Phone** is on.
3. Authentication → Hooks → **Send SMS** points at the `send-sms` function.
4. Rebuild the APK after a client change (`app.json` version 1.0.4). The old APK on the phone will keep failing until you install the new one.

Do not put the Africa's Talking key in Expo / `app.json`.
