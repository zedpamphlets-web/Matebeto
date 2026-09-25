import { corsHeaders, serviceClient, json } from "../_shared/lipila.ts";

Deno.serve(async (req) => {
  if (req.method === "GET") {
    const url = new URL(req.url);
    const mode = url.searchParams.get("hub.mode");
    const token = url.searchParams.get("hub.verify_token");
    const challenge = url.searchParams.get("hub.challenge");
    if (mode === "subscribe" && token === Deno.env.get("WHATSAPP_VERIFY_TOKEN")) {
      return new Response(challenge || "", { status: 200 });
    }
    return new Response("forbidden", { status: 403 });
  }

  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const payload = await req.json().catch(() => ({}));
  const text = JSON.stringify(payload).toUpperCase();
  const match = text.match(/ORDER\s*#?\s*(\d+)/);
  if (!match) return json({ ok: true, ignored: true });

  const db = serviceClient();
  const { data: order } = await db.from("orders").select("*").eq("order_number", Number(match[1])).maybeSingle();
  if (!order) return json({ ok: false, error: "Order not found" }, 404);

  const accept = /\bACCEPT\b/.test(text);
  const decline = /\bDECLINE\b/.test(text);
  if (!accept && !decline) return json({ ok: true, pending: true });

  await db.rpc("respond_vendor", { p_order: order.id, p_accept: accept });
  return json({ ok: true, accepted: accept });
});
