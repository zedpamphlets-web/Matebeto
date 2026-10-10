import { corsHeaders, serviceClient, json } from "../_shared/lipila.ts";

// Service-role only. Protected by secret query param.
// Calls process_timeouts then notifies vendors for newly offered orders.
// Schedule with pg_cron every minute (see comments at bottom).

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let out = 0;
  for (let i = 0; i < a.length; i++) out |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return out === 0;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const url = new URL(req.url);
  const token = url.searchParams.get("token");
  const expected = Deno.env.get("TIMEOUT_SECRET") || Deno.env.get("LIPILA_WEBHOOK_SECRET") || "";
  if (!expected || !timingSafeEqual(token || "", expected)) {
    return json({ error: "Unauthorized" }, 401);
  }

  try {
    const db = serviceClient();
    const { data: newlyOffered, error } = await db.rpc("process_timeouts");
    if (error) return json({ error: error.message }, 500);

    const notifyUrl = `${Deno.env.get("SUPABASE_URL")}/functions/v1/notify-vendor`;
    const auth = `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`;
    for (const row of newlyOffered || []) {
      await fetch(notifyUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: auth },
        body: JSON.stringify({ orderId: row.order_id }),
      }).catch(() => null);
    }

    return json({ ok: true, notified: (newlyOffered || []).length });
  } catch (e) {
    return json({ error: e instanceof Error ? e.message : "error" }, 500);
  }
});

/*
Schedule every minute with pg_cron (run once in SQL editor as superuser):

select cron.schedule(
  'matebeto-timeouts',
  '* * * * *',
  $$
  select net.http_post(
    url := 'https://YOUR-PROJECT.supabase.co/functions/v1/run-timeouts?token=YOUR_TIMEOUT_SECRET',
    headers := '{"Content-Type":"application/json"}'::jsonb,
    body := '{}'::jsonb
  );
  $$
);

Or use Supabase dashboard Cron Jobs if available.
*/
