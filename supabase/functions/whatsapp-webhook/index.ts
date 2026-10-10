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

async function verifySignature(req: Request, rawBody: string): Promise<boolean> {
  const secret = Deno.env.get("WHATSAPP_APP_SECRET");
  if (!secret) return false;
  const signature = req.headers.get("X-Hub-Signature-256") || "";
  if (!signature.startsWith("sha256=")) return false;
  const expected = signature.slice(7);
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(rawBody));
  const hex = Array.from(new Uint8Array(sig)).map((b) => b.toString(16).padStart(2, "0")).join("");
  return hex === expected;
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

  const rawBody = await req.text();
  if (!(await verifySignature(req, rawBody))) {
    return new Response("invalid signature", { status: 401 });
  }

  // Answer Meta quickly
  const ack = json({ ok: true });

  try {
    const payload = JSON.parse(rawBody);
    const messages = extractMessages(payload);
    if (!messages.length) return ack;

    const db = serviceClient();

    for (const msg of messages) {
      const buttonId = String(msg.interactive?.button_reply?.id || msg.button?.payload || "");
      const accept = buttonId.startsWith("accept:");
      const decline = buttonId.startsWith("decline:");
      if (!accept && !decline) continue;

      const orderId = buttonId.split(":")[1];
      if (!orderId) continue;

      const { data: order } = await db.from("orders").select("*").eq("id", orderId).maybeSingle();
      if (!order || !order.vendor_id) continue;

      // Only the currently offered vendor may reply
      const from = digits(msg.from || "");
      const { data: vendor } = await db.from("vendors").select("id,whatsapp,phone").eq("id", order.vendor_id).maybeSingle();
      const vendorNum = digits(vendor?.whatsapp || vendor?.phone || "");
      if (!vendorNum || !(vendorNum === from || vendorNum.endsWith(from.slice(-9)) || from.endsWith(vendorNum.slice(-9)))) {
        continue;
      }

      // Ignore duplicates (already accepted or declined)
      const { data: attempt } = await db
        .from("vendor_attempts")
        .select("status")
        .eq("order_id", orderId)
        .eq("vendor_id", order.vendor_id)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (attempt && attempt.status !== "OFFERED") continue;

      const resp = await db.rpc("respond_vendor", { p_order: orderId, p_accept: accept });
      if (!resp.data?.changed) continue;

      if (accept) {
        await db.rpc("offer_next_rider", { p_order: orderId });
      } else {
        // Decline → next vendor + WhatsApp message
        const next = await db.rpc("offer_next_vendor", { p_order: orderId });
        if (next.data?.ok) {
          const notifyUrl = `${Deno.env.get("SUPABASE_URL")}/functions/v1/notify-vendor`;
          await fetch(notifyUrl, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`,
            },
            body: JSON.stringify({ orderId }),
          }).catch(() => null);
        }
      }
    }
  } catch {
    // still return 200 so Meta does not retry forever
  }

  return ack;
});
