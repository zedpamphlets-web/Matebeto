import { corsHeaders, serviceClient, lipilaFetch, json } from "../_shared/lipila.ts";

// Protected webhook. Lipila calls this when a payment finishes.
// We do NOT trust the payload — we re-query Lipila for the real status.
// URL must include ?token=YOUR_LIPILA_WEBHOOK_SECRET

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const url = new URL(req.url);
  const token = url.searchParams.get("token");
  const expected = Deno.env.get("LIPILA_WEBHOOK_SECRET");
  if (!expected || token !== expected) {
    return json({ error: "Unauthorized" }, 401);
  }

  try {
    const payload = await req.json().catch(() => ({}));
    const referenceId = payload.referenceId || payload.reference_id;
    if (!referenceId) return json({ ok: true, ignored: "no reference" });

    const db = serviceClient();

    // Find order by the payment reference we stored
    const { data: order } = await db
      .from("orders")
      .select("*")
      .eq("payment_reference", referenceId)
      .maybeSingle();

    if (!order) return json({ ok: true, ignored: "order not found" });
    if (order.payment_status === "paid") return json({ ok: true, already: "paid" });

    // Re-query Lipila — do not trust the webhook body
    const { ok, json: statusBody } = await lipilaFetch(
      `/collections/check-status?referenceId=${encodeURIComponent(referenceId)}`,
      null
    );
    if (!ok) return json({ ok: false, reason: "status check failed" }, 502);

    const providerStatus = String(statusBody?.status || "").toLowerCase();
    if (providerStatus === "successful" || providerStatus === "success") {
      await db.from("orders").update({
        payment_status: "paid",
        status: "PAYMENT_CONFIRMED",
      }).eq("id", order.id);

      // Start vendor search on the server
      await db.rpc("offer_next_vendor", { p_order: order.id });

      // Message the vendor (server-to-server call)
      const notifyUrl = `${Deno.env.get("SUPABASE_URL")}/functions/v1/notify-vendor`;
      await fetch(notifyUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`,
          apikey: Deno.env.get("SUPABASE_ANON_KEY") || "",
        },
        body: JSON.stringify({ orderId: order.id }),
      }).catch(() => null);

      return json({ ok: true, status: "paid" });
    }

    if (providerStatus === "failed") {
      await db.from("orders").update({ payment_status: "failed" }).eq("id", order.id);
      return json({ ok: true, status: "failed" });
    }

    return json({ ok: true, status: "pending" });
  } catch (e) {
    return json({ error: e instanceof Error ? e.message : "error" }, 500);
  }
});
