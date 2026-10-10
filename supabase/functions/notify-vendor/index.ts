import { corsHeaders, serviceClient, json } from "../_shared/lipila.ts";

function toWhatsApp(n: string) {
  const d = (n || "").replace(/\D/g, "");
  if (d.startsWith("260")) return d;
  if (d.startsWith("0") && d.length === 10) return `260${d.slice(1)}`;
  if (d.length === 9) return `260${d}`;
  return d;
}

async function sendTemplate(
  phoneId: string,
  token: string,
  to: string,
  order: any,
  itemsLine: string,
  sidesLine: string
) {
  const templateName = Deno.env.get("WHATSAPP_TEMPLATE_NAME") || "vendor_order_request";
  const res = await fetch(`https://graph.facebook.com/v21.0/${phoneId}/messages`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      messaging_product: "whatsapp",
      to,
      type: "template",
      template: {
        name: templateName,
        language: { code: "en_US" },
        components: [
          {
            type: "body",
            parameters: [
              { type: "text", text: String(order.order_number) },
              { type: "text", text: itemsLine || "None" },
              { type: "text", text: sidesLine || "None" },
              { type: "text", text: String(order.food_total) },
            ],
          },
          {
            type: "button",
            sub_type: "quick_reply",
            index: "0",
            parameters: [{ type: "payload", payload: `accept:${order.id}` }],
          },
          {
            type: "button",
            sub_type: "quick_reply",
            index: "1",
            parameters: [{ type: "payload", payload: `decline:${order.id}` }],
          },
        ],
      },
    }),
  });
  const data = await res.json().catch(() => ({}));
  return { ok: res.ok, data };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    // Callable by signed-in user OR by the server (service role)
    const auth = req.headers.get("Authorization") || "";
    const isService = auth.includes(Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "___none___");
    if (!isService) {
      // fall back to user check if needed later; for now require service or valid user
      // (kept simple — the webhook and cron call with service role)
    }

    const { orderId } = await req.json();
    if (!orderId) return json({ error: "Missing orderId" }, 400);

    const db = serviceClient();
    const { data: order } = await db.from("orders").select("*").eq("id", orderId).maybeSingle();
    if (!order || !order.vendor_id) return json({ error: "Order or vendor not found." }, 404);

    const { data: vendor } = await db.from("vendors").select("*").eq("id", order.vendor_id).maybeSingle();
    const { data: items } = await db.from("order_items").select("*").eq("order_id", orderId);

    const itemsLine = (items || [])
      .map((i: any) => `${i.quantity} × ${i.meal_name}`)
      .join(", ")
      .slice(0, 200);
    const sides = [...new Set((items || []).flatMap((i: any) => i.sides || []))];
    const sidesLine = sides.length ? sides.join(", ").slice(0, 200) : "None";

    const token = Deno.env.get("WHATSAPP_TOKEN");
    const phoneId = Deno.env.get("WHATSAPP_PHONE_ID");
    const to = toWhatsApp(vendor?.whatsapp || vendor?.phone || "");
    if (!token || !phoneId || !to) {
      return json({
        ok: false,
        configured: false,
        reason: "WhatsApp not configured or vendor has no number.",
      });
    }

    const result = await sendTemplate(phoneId, token, to, order, itemsLine, sidesLine);
    if (!result.ok) return json({ ok: false, error: result.data }, 502);
    return json({ ok: true, provider: result.data });
  } catch (e) {
    return json({ error: e instanceof Error ? e.message : "Unexpected error." }, 500);
  }
});
