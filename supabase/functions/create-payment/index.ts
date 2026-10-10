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
    if (order.status !== "CREATED") return json({ error: "Order is no longer waiting for payment." }, 409);
    if (order.payment_status === "paid") return json({ error: "This order is already paid." }, 409);

    // A payment is already waiting for approval on the customer's phone: do not charge twice.
    if (order.payment_status === "pending" && order.payment_reference) {
      const last = Number(String(order.payment_reference).split("-").pop());
      if (Number.isFinite(last) && Date.now() - last < 3 * 60 * 1000) {
        return json(
          { error: "A payment is already waiting for approval on your phone. Approve it, or wait 3 minutes and try again." },
          409,
        );
      }
    }

    // Fresh reference for every attempt: "<order id>-<timestamp>"
    const paymentReference = `${order.id}-${Date.now()}`;

    // Record the attempt BEFORE asking Lipila, so a fast callback can never be overwritten.
    const { data: marked } = await db
      .from("orders")
      .update({ payment_status: "pending", payment_reference: paymentReference })
      .eq("id", order.id)
      .eq("status", "CREATED")
      .neq("payment_status", "paid")
      .select("id");
    if (!marked?.length) return json({ error: "Order is no longer waiting for payment." }, 409);

    const webhookSecret = Deno.env.get("LIPILA_WEBHOOK_SECRET") || "";
    const callbackUrl = webhookSecret
      ? `${Deno.env.get("SUPABASE_URL")}/functions/v1/lipila-webhook?token=${encodeURIComponent(webhookSecret)}`
      : "";

    // callbackUrl is sent as BOTH a header and a body field. Check in the Lipila sandbox which one
    // Lipila uses and remove the other once confirmed (see docs/FIXES_AND_SETUP.md).
    const { ok, json: lipilaBody } = await lipilaFetch(
      "/collections/mobile-money",
      {
        referenceId: paymentReference,
        amount: Number(order.total), // always from the database, never from the app
        narration: `Matebeto order ${order.order_number}`,
        accountNumber: phone,
        currency: "ZMW",
        ...(callbackUrl ? { callbackUrl } : {}),
      },
      callbackUrl ? { callbackUrl } : {},
    );

    if (!ok) {
      await db
        .from("orders")
        .update({ payment_status: "failed" })
        .eq("id", order.id)
        .eq("payment_reference", paymentReference)
        .eq("payment_status", "pending");
      return json({ error: lipilaBody?.message || "Could not start payment." }, 502);
    }

    return json({ status: "pending", reference: paymentReference, ...lipilaBody });
  } catch (e) {
    return json({ error: e instanceof Error ? e.message : "Unexpected error." }, 500);
  }
});
