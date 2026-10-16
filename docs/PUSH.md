# Phone notifications when Matebeto is closed

The phone shows these on the lock screen. The app does not have to be open.

| When | Who sees it |
| --- | --- |
| A vendor is offered the order | Customer |
| A vendor accepts | Customer |
| A rider is assigned | Customer |
| The rider is on the way | Customer |
| Delivered, cancelled, no vendor, no rider | Customer |
| A delivery is offered | That rider |

## 1. Run the SQL

Run `supabase/migrations/20261016010000_push_notifications.sql` in the Supabase SQL editor.

Then set the hook secret to the same value as `CRON_SECRET`:

```sql
update public.push_hook set secret = 'YOUR_CRON_SECRET' where id = 1;
```

## 2. Deploy the API

Deploy `send-push`. Turn **Verify JWT** off. It checks `x-cron-secret` itself, the same way `run-timeouts` does.

No new secret name. It uses `CRON_SECRET`, which is already on the functions.

## 3. Android closed-app delivery

Expo needs a Firebase Cloud Messaging key or the phone will not show anything after the app is closed.

1. Firebase console, same Android package `com.siximages.matebeto`.
2. Download the FCM V1 service account JSON.
3. `eas credentials` → Android → Push Notifications → upload that JSON.
4. Build again: `eas build --platform android --profile internal`.
5. Install that APK, sign in, and allow notifications.

The server address the database calls is `https://lmyvvwulabezlglxjzvl.supabase.co/functions/v1/send-push`.
