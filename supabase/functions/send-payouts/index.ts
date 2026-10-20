import { corsHeaders, serviceClient, requireServer, json } from "../_shared/lipila.ts";
import { sendPendingPayouts } from "../_shared/payouts.ts";

// Called by the database right after an order completes, and by run-timeouts every minute. Server only.
// Deploy with "Verify JWT" OFF (it checks its own secret).
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (!requireServer(req)) return json({ error: "Unauthorized" }, 401);
  const body = await req.json().catch(() => ({}));
  const result = await sendPendingPayouts(serviceClient(), body?.orderId ? String(body.orderId) : undefined);
  return json({ ok: true, ...result });
});
