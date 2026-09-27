import { corsHeaders, serviceClient, json } from "../_shared/lipila.ts";

function digits(n: string) {
  return (n || "").replace(/\D/g, "");
}

function extractMessages(payload: any) {
  const out: any[] = [];
  for (const entry of payload.entry || []) {
    for (const change of entry.changes || []) {
      for (const msg of change.value?.messages || []) out.push(msg);
    }
  }
  return out;
}

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
  const messages = extractMessages(payload);
  if (!messages.length) return json({ ok: true, ignored: true });

  const db = serviceClient();

  for (const msg of messages) {
    const bodyText = (
      msg.text?.body ||
      msg.interactive?.button_reply?.title ||
      msg.button?.text ||
      ""
    ).toUpperCase();
    const buttonId = String(msg.interactive?.button_reply?.id || msg.button?.payload || "");
    const accept = buttonId.startsWith("accept:") || /\bACCEPT\b/.test(bodyText);
    const decline = buttonId.startsWith("decline:") || /\bDECLINE\b/.test(bodyText);
    if (!accept && !decline) continue;

    let order: any = null;
    const idFromButton = buttonId.split(":")[1];
    if (idFromButton) {
      const { data } = await db.from("orders").select("*").eq("id", idFromButton).maybeSingle();
      order = data;
    }
    if (!order) {
      const match = `${bodyText} ${JSON.stringify(payload)}`.match(/ORDER\s*#?\s*(\d+)/);
      if (match) {
        const { data } = await db.from("orders").select("*").eq("order_number", Number(match[1])).maybeSingle();
        order = data;
      }
    }
    if (!order) {
      const from = digits(msg.from || "");
      const { data: vendors } = await db.from("vendors").select("id,whatsapp,phone");
      const vendor = (vendors || []).find((v: any) => {
        const n = digits(v.whatsapp || v.phone || "");
        return n && (n === from || n.endsWith(from.slice(-9)) || from.endsWith(n.slice(-9)));
      });
      if (vendor) {
        const { data: attempt } = await db
          .from("vendor_attempts")
          .select("order_id")
          .eq("vendor_id", vendor.id)
          .eq("status", "OFFERED")
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();
        if (attempt?.order_id) {
          const { data } = await db.from("orders").select("*").eq("id", attempt.order_id).maybeSingle();
          order = data;
        }
      }
    }
    if (!order) continue;

    await db.rpc("respond_vendor", { p_order: order.id, p_accept: accept });
    if (accept) await db.rpc("offer_next_rider", { p_order: order.id });
    else await db.rpc("offer_next_vendor", { p_order: order.id });
  }

  return json({ ok: true });
});
