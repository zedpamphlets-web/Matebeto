# Matebeto integrations — WhatsApp API + Zambia SMS

Do this after the UI is running. Do **not** put these keys in the mobile app. They live in Supabase secrets only.

## 1. WhatsApp Business Cloud API (vendor accept / decline)

The brief requires a real Business API, not a personal WhatsApp account.

The app already calls Meta Cloud API from `supabase/functions/notify-vendor`:

`POST https://graph.facebook.com/v20.0/{PHONE_NUMBER_ID}/messages`

### Get the API

1. Create / log in to a Meta account: https://developers.facebook.com/async/registration/
2. Open the app dashboard: https://developers.facebook.com/apps
3. **Create App** → name it `Matebeto` → use case **Connect with customers through WhatsApp**.
4. Attach or create a **Meta Business Portfolio** for 6images Advertising.
5. In the app: **WhatsApp → API Setup → Start using the API**.
6. Create a WhatsApp Business Account and add a **new phone number**.
   - The number must be able to receive SMS or a voice call.
   - It **cannot** already be logged into normal WhatsApp or WhatsApp Business app. Delete it from those apps first.
   - A dedicated Zambian business line (+260) is best.
7. Send the test `hello_world` template to your own phone to confirm the API works.
8. Create a **permanent System User token** (temporary tokens expire):
   - https://business.facebook.com/latest/settings → **System users** → Add
   - Assign the app + WhatsApp account with full control
   - Generate token with `whatsapp_business_messaging` and `whatsapp_business_management`
9. Copy:
   - **Access token** → `WHATSAPP_TOKEN`
   - **Phone number ID** (not the display number) → `WHATSAPP_PHONE_ID`
10. Set a webhook verify string you invent → `WHATSAPP_VERIFY_TOKEN`
11. Webhook URL:

`https://YOUR-PROJECT.supabase.co/functions/v1/whatsapp-webhook`

Subscribe to **messages**.

12. Create a message template named something like `matebeto_order` for the first outbound vendor message. After the vendor replies, free-form text is allowed for 24 hours.

### Put the keys on Supabase

```bash
supabase secrets set WHATSAPP_TOKEN=...
supabase secrets set WHATSAPP_PHONE_ID=...
supabase secrets set WHATSAPP_VERIFY_TOKEN=...
supabase functions deploy notify-vendor
supabase functions deploy whatsapp-webhook
```

Until those secrets exist, Admin can still accept / decline an order from the back office. The customer app does not fake a vendor reply.

### What the vendor receives

```
MATEBETO ORDER #1042
ITEMS
2 × T-Bone Steak
SIDES
Nshima
TOTAL: K310
ACCEPT / DECLINE
```

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

Do not put the Africa's Talking key in Expo / `app.json`.
