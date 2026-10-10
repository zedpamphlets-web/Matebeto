import { lipilaFetch } from "./lipila.ts";

// Our references look like "<order uuid>-<timestamp>", so the order can always be found
// from any payment attempt, not only the latest one.
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i;

export function orderIdFromReference(ref: string): string | null {
  const m = String(ref || "").match(UUID_RE);
  return m ? m[0].toLowerCase() : null;
}

// Server-to-server call to notify-vendor. If it fails, the outbox in run-timeouts retries.
export async function notifyVendor(orderId: string) {
  const url = `${Deno.env.get("SUPABASE_URL")}/functions/v1/notify-vendor`;
  const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
  try {
    await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}`, apikey: key },
      body: JSON.stringify({ orderId }),
    });
  } catch (_e) {
    // retried by run-timeouts
  }
}

async function logEvent(db: any, orderId: string, event: string, detail: string) {
  await db.from("order_events").insert({ order_id: orderId, event, detail });
}

export type PaymentResult = { status: "paid" | "failed" | "pending" | "ignored"; detail?: string };

// Confirms one payment attempt with Lipila (we never trust a callback body) and, if it is the
// first successful payment for the order, starts the vendor search on the server.
export async function confirmPayment(db: any, referenceId: string): Promise<PaymentResult> {
  const orderId = orderIdFromReference(referenceId);
  if (!orderId) return { status: "ignored" };

  const { data: order } = await db
    .from("orders")
    .select("id,total,status,payment_status,payment_reference")
    .eq("id", orderId)
    .maybeSingle();
  if (!order) return { status: "ignored" };

  const { ok, json: s } = await lipilaFetch(
    `/collections/check-status?referenceId=${encodeURIComponent(referenceId)}`,
    null,
  );
  if (!ok) return { status: "pending", detail: "status check failed" };

  const provider = String(s?.status || "").toLowerCase();

  if (provider === "failed") {
    // only the latest attempt may mark the order failed
    if (order.payment_reference === referenceId) {
      await db
        .from("orders")
        .update({ payment_status: "failed" })
        .eq("id", orderId)
        .eq("payment_reference", referenceId)
        .in("payment_status", ["pending", "unpaid"]);
    }
    return { status: "failed" };
  }
  if (provider !== "successful" && provider !== "success") return { status: "pending" };

  // amount and currency must match what we asked for (when Lipila returns them)
  const paid = s?.amount ?? s?.Amount;
  if (paid !== undefined && paid !== null && Math.abs(Number(paid) - Number(order.total)) > 0.009) {
    await logEvent(db, orderId, "PAYMENT_AMOUNT_MISMATCH", `ref ${referenceId} paid ${paid}, expected ${order.total}`);
    return { status: "pending", detail: "amount mismatch" };
  }
  if (s?.currency && String(s.currency).toUpperCase() !== "ZMW") {
    await logEvent(db, orderId, "PAYMENT_CURRENCY_MISMATCH", `ref ${referenceId} currency ${s.currency}`);
    return { status: "pending", detail: "currency mismatch" };
  }

  // Atomic: only ONE caller can move CREATED -> PAYMENT_CONFIRMED
  const { data: won } = await db
    .from("orders")
    .update({ payment_status: "paid", status: "PAYMENT_CONFIRMED", payment_reference: referenceId })
    .eq("id", orderId)
    .eq("status", "CREATED")
    .neq("payment_status", "paid")
    .select("id");

  if (won && won.length) {
    const started = await db.rpc("offer_next_vendor", { p_order: orderId });
    if (started?.data?.ok) await notifyVendor(orderId);
    return { status: "paid" };
  }

  // We did not win: repeat callback, second payment, or the order was cancelled meanwhile.
  const { data: now } = await db
    .from("orders")
    .select("status,payment_status,payment_reference")
    .eq("id", orderId)
    .maybeSingle();

  if (now?.payment_status === "paid") {
    if (now.payment_reference !== referenceId) {
      const detail = `second payment ${referenceId} succeeded - refund needed`;
      const { data: seen } = await db
        .from("order_events")
        .select("id")
        .eq("order_id", orderId)
        .eq("event", "DUPLICATE_PAYMENT")
        .eq("detail", detail)
        .limit(1);
      if (!seen?.length) await logEvent(db, orderId, "DUPLICATE_PAYMENT", detail);
    }
    return { status: "paid" };
  }
  if (now?.status === "CANCELLED" && !["refund_pending", "refunded"].includes(now.payment_status)) {
    await db.from("orders").update({ payment_status: "refund_pending", payment_reference: referenceId }).eq("id", orderId);
    await logEvent(db, orderId, "PAID_AFTER_CANCEL", `ref ${referenceId} - refund needed`);
  }
  return { status: "paid", detail: "order was not waiting for payment" };
}
