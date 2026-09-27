# Matebeto — WhatsApp Cloud API setup (from your Meta screen)

**Do not put tokens in the mobile app or in Git.**  
They live only in **Supabase secrets**.

Your Meta **Step 1 – Try it out** values (from developers.facebook.com):

| Field | Value (yours) |
|--------|----------------|
| Test WhatsApp number | `+1 (555) 153-3466` |
| **Phone number ID** | `1255603277647233` |
| WhatsApp Business account ID | `1068925996009247` |
| Access token | Copy the **full** token from Meta (starts with `EAAq…`) — temporary ~24h |
| Test recipient you added | `+260 95 1849962` |

---

## 1. Set secrets on Supabase

In a terminal (logged into the Matebeto Supabase project):

```bash
# Paste the FULL access token from Meta (Copy access token)
supabase secrets set WHATSAPP_TOKEN="PASTE_FULL_TOKEN_HERE"

# Phone number ID from Meta (digits only)
supabase secrets set WHATSAPP_PHONE_ID="1255603277647233"

# Any string you choose — must match webhook verify token in Meta
supabase secrets set WHATSAPP_VERIFY_TOKEN="matebeto-wa-2026"
```

Then deploy both functions:

```bash
supabase functions deploy notify-vendor
supabase functions deploy whatsapp-webhook
```

---

## 2. Webhook on Meta (so ACCEPT / DECLINE come back)

1. Meta app → **WhatsApp → Configuration** (or API Setup → Webhook).
2. **Callback URL:**

   ```
   https://YOUR-PROJECT-REF.supabase.co/functions/v1/whatsapp-webhook
   ```

   Replace `YOUR-PROJECT-REF` with your real Supabase project ref  
   (from Supabase Dashboard → Project Settings → General → Reference ID).

3. **Verify token:** `matebeto-wa-2026` (same as `WHATSAPP_VERIFY_TOKEN`).
4. Subscribe to the field: **messages**.
5. Click **Verify and save**.

If verify succeeds, Meta can reach Matebeto.

---

## 3. Test flow (matches the official brief)

1. In Meta **Step 1**, send a test message to `+260 95 1849962` (optional API check).
2. In Matebeto Admin, ensure a **vendor** has WhatsApp/phone set to a number you added under Meta test recipients (e.g. `0951849962` or `+260951849962`).
3. Place a test order so the system offers that vendor.
4. Vendor receives:

   ```
   MATEBETO ORDER #1042
   ITEMS
   2 × T-Bone Steak
   SIDES
   Nshima
   TOTAL: K310
   Tap ACCEPT or DECLINE
   ```

   with **ACCEPT** / **DECLINE** buttons.
5. Tapping **ACCEPT** → `whatsapp-webhook` → `respond_vendor` → rider search starts.  
   **DECLINE** → next vendor offer.

Admin can still accept/decline from the back office if WhatsApp is offline.

---

## 4. Important limits (test mode)

- Temporary access tokens **expire** (often ~24 hours). Generate a new one on Meta or create a **System User** permanent token for production.
- You can only message numbers on the Meta **test recipient** list until Business verification + production number.
- Production Zambian business number: Meta **Step 2** (number must not already be on personal WhatsApp).

---

## 5. Code already in the repo (no change required)

| Function | Role |
|----------|------|
| `notify-vendor` | Builds the brief message + ACCEPT/DECLINE buttons via Graph API |
| `whatsapp-webhook` | Verifies Meta challenge; handles button replies → order status |

Both use secrets: `WHATSAPP_TOKEN`, `WHATSAPP_PHONE_ID`, `WHATSAPP_VERIFY_TOKEN`.

This satisfies **Rule 8 / Section 16** of the Matebeto V1 developer brief (WhatsApp vendor acceptance, not personal WhatsApp).
