import { corsHeaders, serviceClient, requireUser, lipilaFetch, json } from "../_shared/lipila.ts";

// Admin taps "Refund customer": the order's total goes back to the mobile money number the customer
// paid with, through Lipila (same way vendor and rider payouts are sent).
// Deploy with "Verify JWT" ON. Only a signed-in platform admin may call it.

function msisdn(raw: unknown): string {
  let d = String(raw || "").replace(/\D/g, "");
  if (d.startsWith("00")) d = d.slice(2);
  if (d.startsWith("0")) d = "260" + d.slice(1);
  if (d.length === 9) d = "260" + d;
  return d.length === 12 && d.startsWith("260") ? d : "";
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const userId = await requireUser(req);
    if (!userId) return json({ error: "Not signed in." }, 401);
    const db = serviceClient();
    const { data: admin } = await db.from("platform_admins").select("user_id").eq("user_id", userId).maybeSingle();
    if (!admin) return json({ error: "Admin only." }, 403);

    const body = await req.json().catch(() => ({}));
    const orderId = String(body?.orderId || "");
    if (!orderId) return json({ error: "Missing orderId." }, 400);

    const { data: order } = await db
      .from("orders")
      .select("id, order_number, total, payment_status, payment_phone, refund_status, refund_attempts")
      .eq("id", orderId)
      .maybeSingle();
    if (!order) return json({ error: "Order not found." }, 404);
    if (order.payment_status !== "refund_pending") return json({ error: "This order is not waiting for a refund." }, 409);

    const number = msisdn(order.payment_phone);
    if (!number) {
      await db.from("orders").update({ refund_status: "FAILED", refund_response: { error: "No valid mobile money number saved for this order" } }).eq("id", orderId);
      return json({ error: "No valid mobile money number for this customer. Refund by hand, then tap Mark refunded." }, 422);
    }
    if (!(Number(order.total) > 0)) return json({ error: "Order total is zero." }, 422);

    // Claim it so a double tap can never send the money twice.
    const attempt = Number(order.refund_attempts || 0) + 1;
    const { data: claimed } = await db
      .from("orders")
      .update({ refund_status: "PROCESSING", refund_attempts: attempt })
      .eq("id", orderId)
      .eq("payment_status", "refund_pending")
      .or("refund_status.is.null,refund_status.eq.FAILED")
      .eq("refund_attempts", order.refund_attempts || 0)
      .select("id");
    if (!claimed?.length) return json({ error: "A refund for this order is already being sent." }, 409);

    const webhookSecret = Deno.env.get("LIPILA_WEBHOOK_SECRET") || "";
    const callbackUrl = webhookSecret
      ? `${Deno.env.get("SUPABASE_URL")}/functions/v1/lipila-webhook?token=${encodeURIComponent(webhookSecret)}`
      : "";

    const reference = `refund-${order.id}-${attempt}`;
    const res = await lipilaFetch(
      "/disbursements/mobile-money",
      {
        referenceId: reference,
        amount: Number(order.total),
        narration: `Loko Cooks refund order ${order.order_number}`,
        accountNumber: number,
        currency: "ZMW",
      },
      callbackUrl ? { callbackUrl } : {},
    );
    const status = String((res.json as any)?.status || "").toLowerCase();
    const rejected = !res.ok || status === "failed" || status === "rejected";

    if (rejected) {
      await db.from("orders").update({ refund_status: "FAILED", refund_reference: reference, refund_response: res.json }).eq("id", orderId);
      await db.from("order_events").insert({ order_id: orderId, event: "REFUND_FAILED", detail: String((res.json as any)?.message || res.status).slice(0, 200) });
      return json({ error: `Lipila could not send the refund: ${(res.json as any)?.message || res.status}. You can tap Refund again.` }, 502);
    }

    await db
      .from("orders")
      .update({ payment_status: "refunded", refund_status: "SENT", refund_reference: reference, refund_response: res.json })
      .eq("id", orderId);
    await db.from("order_events").insert({ order_id: orderId, event: "REFUNDED", detail: `Sent K${Number(order.total)} to ${number} through Lipila` });
    return json({ ok: true, sentTo: number, amount: Number(order.total) });
  } catch (e) {
    return json({ error: e instanceof Error ? e.message : "Unexpected error." }, 500);
  }
});
