import { corsHeaders, serviceClient, timingSafeEqual, json } from "../_shared/lipila.ts";
import { confirmPayment } from "../_shared/payments.ts";

// Lipila calls this when a payment finishes. The URL must carry ?token=LIPILA_WEBHOOK_SECRET.
// We never trust the callback body: confirmPayment asks Lipila for the real status.
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const token = new URL(req.url).searchParams.get("token") || "";
  const expected = Deno.env.get("LIPILA_WEBHOOK_SECRET") || "";
  if (!expected || !timingSafeEqual(token, expected)) return json({ error: "Unauthorized" }, 401);

  try {
    const payload = await req.json().catch(() => ({}));
    const referenceId = payload.referenceId || payload.reference_id || payload.ReferenceId;
    if (!referenceId) return json({ ok: true, ignored: "no reference" });

    const result = await confirmPayment(serviceClient(), String(referenceId));
    // 502 makes Lipila retry later when its status check was not available
    if (result.detail === "status check failed") return json({ ok: false, reason: "status check failed" }, 502);
    return json({ ok: true, status: result.status });
  } catch (e) {
    return json({ error: e instanceof Error ? e.message : "error" }, 500);
  }
});
