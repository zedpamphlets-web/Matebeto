import { corsHeaders, serviceClient, lipilaFetch, json } from "../_shared/lipila.ts";

// Protected webhook. Lipila calls this when a payment finishes.
// We do NOT trust the payload — we re-query Lipila for the real status.
// URL must include ?token=YOUR_LIPILA_WEBHOOK_SECRET
// callbackUrl is sent as a HEADER (see Lipila docs).

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

    // Look up via payment_attempts so earlier attempts are never lost
    const { data: attempt } = await db
      .from("payment_attempts")
      .select("*, orders(*)")
      .eq("reference", referenceId)
      .maybeSingle();

    if (!attempt) return json({ ok: true, ignored: "attempt not found" });
    const order = attempt.orders;
    if (!order) return json({ ok: true, ignored: "order missing" });

    // Re-query Lipila — do not trust the webhook body
    const { ok, json: statusBody } = await lipilaFetch(
      `/collections/check-status?referenceId=${encodeURIComponent(referenceId)}`,
      null
    );
    if (!ok) return json({ ok: false, reason: "status check failed" }, 502);

    const providerStatus = String(statusBody?.status || "").toLowerCase();
    const returnedAmount = Number(statusBody?.amount);
    const returnedCurrency = String(statusBody?.currency || "ZMW");

    if (providerStatus === "successful" || providerStatus === "success") {
      // Amount / currency check when Lipila returns them
      if (returnedAmount && Math.abs(returnedAmount - Number(order.total)) > 0.01) {
        await db.from("orders").update({ payment_status: "refund_pending" }).eq("id", order.id);
        await db.from("payment_attempts").update({ status: "amount_mismatch" }).eq("id", attempt.id);
        return json({ ok: false, reason: "amount mismatch — marked for refund" });
      }
      if (returnedCurrency && returnedCurrency !== "ZMW") {
        await db.from("orders").update({ payment_status: "refund_pending" }).eq("id", order.id);
        return json({ ok: false, reason: "currency mismatch" });
      }

      // Atomic: only the caller that gets a row continues
      const { data: updated } = await db
        .from("orders")
        .update({ payment_status: "paid", status: "PAYMENT_CONFIRMED" })
        .eq("id", order.id)
        .neq("payment_status", "paid")
        .select("id")
        .maybeSingle();

      if (!updated) {
        // Already paid — second successful payment must be refunded
        await db.from("orders").update({ payment_status: "refund_pending" }).eq("id", order.id);
        await db.from("payment_attempts").update({ status: "duplicate_paid" }).eq("id", attempt.id);
        return json({ ok: true, status: "already_paid_marked_refund" });
      }

      await db.from("payment_attempts").update({ status: "paid" }).eq("id", attempt.id);

      // Start vendor search
      const offer = await db.rpc("offer_next_vendor", { p_order: order.id });
      if (offer.data?.ok) {
        const notifyUrl = `${Deno.env.get("SUPABASE_URL")}/functions/v1/notify-vendor`;
        await fetch(notifyUrl, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`,
          },
          body: JSON.stringify({ orderId: order.id }),
        }).catch(() => null);
      }

      return json({ ok: true, status: "paid" });
    }

    if (providerStatus === "failed") {
      await db.from("payment_attempts").update({ status: "failed" }).eq("id", attempt.id);
      await db.from("orders").update({ payment_status: "failed" }).eq("id", order.id);
      return json({ ok: true, status: "failed" });
    }

    return json({ ok: true, status: "pending" });
  } catch (e) {
    return json({ error: e instanceof Error ? e.message : "error" }, 500);
  }
});
