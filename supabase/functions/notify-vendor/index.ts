import { corsHeaders, requireUser, serviceClient, json } from "../_shared/lipila.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const userId = await requireUser(req);
    if (!userId) return json({ error: "Not signed in." }, 401);
    const { orderId } = await req.json();
    const db = serviceClient();
    const { data: order } = await db.from("orders").select("*").eq("id", orderId).maybeSingle();
    if (!order) return json({ error: "Order not found." }, 404);
    const { data: vendor } = await db.from("vendors").select("*").eq("id", order.vendor_id).maybeSingle();
    const { data: items } = await db.from("order_items").select("*").eq("order_id", orderId);
    const sides = [...new Set((items || []).flatMap((i: any) => i.sides || []))];
    const message = [
      `MATEBETO ORDER #${order.order_number}`,
      "ITEMS",
      ...(items || []).map((i: any) => `${i.quantity} × ${i.meal_name}`),
      "SIDES",
      ...sides,
      `TOTAL: K${order.food_total}`,
      "ACCEPT / DECLINE",
    ].join("\n");

    const token = Deno.env.get("WHATSAPP_TOKEN");
    const phoneId = Deno.env.get("WHATSAPP_PHONE_ID");
    if (!token || !phoneId || !vendor?.whatsapp) {
      return json({
        ok: false,
        configured: false,
        preview: message,
        reason: "WhatsApp API keys are not set yet. Admin can accept/decline from the back office.",
      });
    }

    const res = await fetch(`https://graph.facebook.com/v20.0/${phoneId}/messages`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        to: vendor.whatsapp,
        type: "text",
        text: { body: message },
      }),
    });
    const body = await res.json().catch(() => ({}));
    if (!res.ok) return json({ ok: false, error: body }, 502);
    return json({ ok: true, configured: true, provider: body });
  } catch (e) {
    return json({ error: e instanceof Error ? e.message : "Unexpected error." }, 500);
  }
});
