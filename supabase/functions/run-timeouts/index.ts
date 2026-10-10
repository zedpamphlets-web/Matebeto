import { corsHeaders, serviceClient, requireServer, json } from "../_shared/lipila.ts";
import { confirmPayment, notifyVendor } from "../_shared/payments.ts";

// Run every minute (see docs/FIXES_AND_SETUP.md). Server only.
//   1. process_timeouts(): vendor/rider timeouts, stuck orders, customer-not-home wait
//   2. outbox: message any vendor who was offered an order but has not been messaged yet
//   3. payment safety net: re-check payments that are still pending (callback never arrived)
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (!requireServer(req)) return json({ error: "Unauthorized" }, 401);

  const db = serviceClient();
  const out: Record<string, unknown> = {};

  const t = await db.rpc("process_timeouts");
  out.timeouts = t.error ? `error: ${t.error.message}` : "ok";

  const { data: waiting } = await db
    .from("vendor_attempts")
    .select("order_id")
    .eq("status", "OFFERED")
    .is("notified_at", null)
    .lt("notify_tries", 3)
    .limit(20);
  const orderIds: string[] = [...new Set<string>((waiting || []).map((w: any) => String(w.order_id)))];
  for (const id of orderIds) await notifyVendor(id);
  out.vendors_notified = orderIds.length;

  const since = new Date(Date.now() - 60 * 60 * 1000).toISOString();
  const { data: pending } = await db
    .from("orders")
    .select("payment_reference")
    .eq("payment_status", "pending")
    .eq("status", "CREATED")
    .not("payment_reference", "is", null)
    .gt("updated_at", since)
    .limit(20);
  let checked = 0;
  for (const p of pending || []) {
    try {
      await confirmPayment(db, p.payment_reference);
      checked++;
    } catch (_e) {
      // try again next minute
    }
  }
  out.payments_checked = checked;

  return json({ ok: true, ...out });
});
