import { corsHeaders, requireUser, serviceClient, loadOwnedOrder, json } from "../_shared/lipila.ts";
import { confirmPayment } from "../_shared/payments.ts";

// Backup for the Lipila callback: the customer taps "I've paid" and we check with Lipila.
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const userId = await requireUser(req);
    if (!userId) return json({ error: "Not signed in." }, 401);
    const body = await req.json();
    const orderId = body.orderId;
    if (!orderId) return json({ error: "Missing orderId." }, 400);

    const db = serviceClient();
    const order = await loadOwnedOrder(db, orderId, userId);
    if (!order) return json({ error: "Order not found." }, 404);
    if (order.payment_status === "paid") return json({ status: "paid" });
    if (!order.payment_reference) return json({ status: "pending" });

    const result = await confirmPayment(db, order.payment_reference);
    if (result.status === "paid") return json({ status: "paid" });
    if (result.status === "failed") return json({ status: "failed" });
    return json({ status: "pending" });
  } catch (e) {
    return json({ error: e instanceof Error ? e.message : "Unexpected error." }, 500);
  }
});
