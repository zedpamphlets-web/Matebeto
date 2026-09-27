import { corsHeaders, requireUser, serviceClient, json } from "../_shared/lipila.ts";

function toWhatsApp(n: string) {
  const d = (n || "").replace(/\D/g, "");
  if (d.startsWith("260")) return d;
  if (d.startsWith("0") && d.length === 10) return `260${d.slice(1)}`;
  if (d.length === 9) return `260${d}`;
  return d;
}

async function sendWhatsApp(phoneId: string, token: string, body: Record<string, unknown>) {
  const res = await fetch(`https://graph.facebook.com/v21.0/${phoneId}/messages`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({ messaging_product: "whatsapp", ...body }),
  });
  const data = await res.json().catch(() => ({}));
  return { ok: res.ok, data };
}

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
      ...(sides.length ? sides : ["None"]),
      `TOTAL: K${order.food_total}`,
      "Tap ACCEPT or DECLINE",
    ].join("\n");

    const token = Deno.env.get("WHATSAPP_TOKEN");
    const phoneId = Deno.env.get("WHATSAPP_PHONE_ID");
    const to = toWhatsApp(vendor?.whatsapp || vendor?.phone || "");
    if (!token || !phoneId || !to) {
      return json({
        ok: false,
        configured: false,
        preview: message,
        reason: "WhatsApp API keys are not set yet, or this vendor has no WhatsApp number. Admin can accept/decline from the back office.",
      });
    }

    const interactive = await sendWhatsApp(phoneId, token, {
      to,
      type: "interactive",
      interactive: {
        type: "button",
        body: { text: message.slice(0, 1024) },
        action: {
          buttons: [
            { type: "reply", reply: { id: `accept:${order.id}`, title: "ACCEPT" } },
            { type: "reply", reply: { id: `decline:${order.id}`, title: "DECLINE" } },
          ],
        },
      },
    });

    if (interactive.ok) {
      return json({ ok: true, configured: true, provider: interactive.data });
    }

    const text = await sendWhatsApp(phoneId, token, {
      to,
      type: "text",
      text: { body: message },
    });
    if (!text.ok) return json({ ok: false, error: text.data, interactive: interactive.data }, 502);
    return json({ ok: true, configured: true, fallback: "text", provider: text.data });
  } catch (e) {
    return json({ error: e instanceof Error ? e.message : "Unexpected error." }, 500);
  }
});
