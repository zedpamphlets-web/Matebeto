import { corsHeaders, serviceClient, requireServer, json } from "../_shared/lipila.ts";

function toWhatsApp(n: string) {
  const d = (n || "").replace(/\D/g, "");
  if (d.startsWith("260")) return d;
  if (d.startsWith("0") && d.length === 10) return `260${d.slice(1)}`;
  if (d.length === 9) return `260${d}`;
  return d;
}

// WhatsApp template variables cannot contain new lines, tabs or long runs of spaces.
const clean = (s: string) => String(s ?? "").replace(/[\r\n\t]+/g, " ").replace(/ {2,}/g, " ").trim();

async function sendTemplate(phoneId: string, token: string, to: string, order: any, itemsLine: string, sidesLine: string) {
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
              { type: "text", text: clean(itemsLine) || "None" },
              { type: "text", text: clean(sidesLine) || "None" },
              { type: "text", text: String(Number(order.food_total)) },
            ],
          },
          { type: "button", sub_type: "quick_reply", index: "0", parameters: [{ type: "payload", payload: `accept:${order.id}` }] },
          { type: "button", sub_type: "quick_reply", index: "1", parameters: [{ type: "payload", payload: `decline:${order.id}` }] },
        ],
      },
    }),
  });
  const data = await res.json().catch(() => ({}));
  return { ok: res.ok, data };
}

// Server only. Sends the vendor_order_request template for the vendor currently offered the order.
// A vendor that cannot be reached after 3 tries counts as one of the 3 vendor attempts.
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (!requireServer(req)) return json({ error: "Unauthorized" }, 401);

  try {
    const { orderId } = await req.json().catch(() => ({}));
    if (!orderId) return json({ error: "Missing orderId" }, 400);

    const token = Deno.env.get("WHATSAPP_TOKEN");
    const phoneId = Deno.env.get("WHATSAPP_PHONE_ID");
    if (!token || !phoneId) return json({ ok: false, configured: false, reason: "WhatsApp is not configured." });

    const db = serviceClient();

    for (let round = 0; round < 3; round++) {
      const { data: order } = await db
        .from("orders")
        .select("id,order_number,food_total,status,vendor_id")
        .eq("id", orderId)
        .maybeSingle();
      if (!order || order.status !== "VENDOR_OFFERED" || !order.vendor_id) return json({ ok: false, reason: "NOT_OFFERED" });

      const { data: attempt } = await db
        .from("vendor_attempts")
        .select("id,notified_at,notify_tries")
        .eq("order_id", orderId)
        .eq("vendor_id", order.vendor_id)
        .eq("status", "OFFERED")
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (!attempt) return json({ ok: false, reason: "NOT_OFFERED" });
      if (attempt.notified_at) return json({ ok: true, already: true });

      // Claim the message first, so two callers can never message the same vendor twice.
      const { data: claimed } = await db
        .from("vendor_attempts")
        .update({ notified_at: new Date().toISOString() })
        .eq("id", attempt.id)
        .is("notified_at", null)
        .select("id");
      if (!claimed?.length) return json({ ok: true, already: true });

      const { data: vendor } = await db.from("vendors").select("name,whatsapp,phone").eq("id", order.vendor_id).maybeSingle();
      const { data: items } = await db.from("order_items").select("meal_name,quantity,sides").eq("order_id", orderId);

      const itemsLine = (items || []).map((i: any) => `${i.quantity} x ${i.meal_name}`).join(", ").slice(0, 200);
      const sides = [...new Set((items || []).flatMap((i: any) => i.sides || []))];
      const sidesLine = sides.length ? sides.join(", ").slice(0, 200) : "None";

      const to = toWhatsApp(vendor?.whatsapp || vendor?.phone || "");
      let sent = false;
      let detail: unknown = "vendor has no number";
      if (to) {
        const r = await sendTemplate(phoneId, token, to, order, itemsLine, sidesLine);
        sent = r.ok;
        detail = r.data;
      }
      if (sent) return json({ ok: true });

      console.error("WhatsApp send failed", JSON.stringify(detail));
      const tries = (attempt.notify_tries || 0) + 1;

      if (to && tries < 3) {
        // release the claim; run-timeouts retries every minute
        await db.from("vendor_attempts").update({ notified_at: null, notify_tries: tries }).eq("id", attempt.id);
        return json({ ok: false, retry: true });
      }

      // give up on this vendor and move to the next one (max 3 vendors in total)
      await db.from("vendor_attempts").update({ status: "UNAVAILABLE", notify_tries: tries }).eq("id", attempt.id);
      await db.from("order_events").insert({ order_id: orderId, event: "VENDOR_UNREACHABLE", detail: vendor?.name ?? null });
      await db.from("orders").update({ vendor_id: null, status: "SEARCHING_VENDOR" }).eq("id", orderId).eq("status", "VENDOR_OFFERED");
      const next = await db.rpc("offer_next_vendor", { p_order: orderId });
      if (!next?.data?.ok) return json({ ok: false, reason: next?.data?.reason || "NO_VENDOR_FOUND" });
    }
    return json({ ok: false, reason: "gave up" });
  } catch (e) {
    return json({ error: e instanceof Error ? e.message : "Unexpected error." }, 500);
  }
});
