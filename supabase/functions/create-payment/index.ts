import { corsHeaders, requireUser, serviceClient, loadOwnedOrder, lipilaFetch, json } from "../_shared/lipila.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const userId = await requireUser(req);
    if (!userId) return json({ error: "Not signed in." }, 401);
    const body = await req.json();
    const orderId = body.orderId;
    const phone = body.phone;
    if (!orderId || !phone) return json({ error: "Missing orderId or phone." }, 400);
    const db = serviceClient();
    const order = await loadOwnedOrder(db, orderId, userId);
    if (!order) return json({ error: "Order not found." }, 404);
    if (order.payment_status === "paid") return json({ error: "This order is already paid." }, 409);
    const { ok, json: lipilaBody } = await lipilaFetch("/collections/mobile-money", {
      referenceId: order.id,
      amount: Number(order.total),
      narration: `Matebeto order ${order.order_number}`,
      accountNumber: phone,
      currency: "ZMW",
    });
    if (!ok) return json({ error: lipilaBody?.message || "Could not start payment." }, 502);
    await db.from("orders").update({ payment_status: "pending" }).eq("id", order.id);
    return json({ status: "pending", ...lipilaBody });
  } catch (e) {
    return json({ error: e instanceof Error ? e.message : "Unexpected error." }, 500);
  }
});
