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

The Android app is already linked to Firebase project `matebeto-cf767`. `google-services.json` is in the repo, and the Google Services Gradle plugin is pinned to **4.5.0** (the version from the Firebase instructions). Expo writes that as `classpath 'com.google.gms:google-services:4.5.0'` because its build file is not the new `plugins { id(...) }` style. Putting that `id(...)` line in directly would fail the build.

You still upload the FCM V1 service-account JSON in `eas credentials` (Android → Push Notifications). `google-services.json` is only the phone-side file. Then build again: `eas build --platform android --profile internal`.

The server address the database calls is `https://lmyvvwulabezlglxjzvl.supabase.co/functions/v1/send-push`.
