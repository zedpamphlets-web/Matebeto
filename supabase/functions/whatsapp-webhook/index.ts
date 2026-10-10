import { corsHeaders, serviceClient, timingSafeEqual, json } from "../_shared/lipila.ts";
import { notifyVendor } from "../_shared/payments.ts";

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
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(rawBody));
  const hex = Array.from(new Uint8Array(sig)).map((b) => b.toString(16).padStart(2, "0")).join("");
  return timingSafeEqual(hex, signature.slice(7));
}

Deno.serve(async (req) => {
  if (req.method === "GET") {
    const url = new URL(req.url);
    const mode = url.searchParams.get("hub.mode");
    const token = url.searchParams.get("hub.verify_token") || "";
    const challenge = url.searchParams.get("hub.challenge");
    const expected = Deno.env.get("WHATSAPP_VERIFY_TOKEN") || "";
    if (mode === "subscribe" && expected && timingSafeEqual(token, expected)) {
      return new Response(challenge || "", { status: 200 });
    }
    return new Response("forbidden", { status: 403 });
  }

  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const rawBody = await req.text();
  if (!(await verifySignature(req, rawBody))) return new Response("invalid signature", { status: 401 });

  try {
    const payload = JSON.parse(rawBody);
    const messages = extractMessages(payload);
    const db = serviceClient();

    for (const msg of messages) {
      const buttonId = String(msg.interactive?.button_reply?.id || msg.button?.payload || "");
      const accept = buttonId.startsWith("accept:");
      const decline = buttonId.startsWith("decline:");
      if (!accept && !decline) continue;

      const orderId = buttonId.split(":")[1];
      if (!orderId) continue;

      const { data: order } = await db.from("orders").select("id,status,vendor_id").eq("id", orderId).maybeSingle();
      if (!order || !order.vendor_id || order.status !== "VENDOR_OFFERED") continue;

      // Only the vendor currently offered this order may reply (compare the last 9 digits)
      const from = digits(msg.from || "");
      const { data: vendor } = await db.from("vendors").select("whatsapp,phone").eq("id", order.vendor_id).maybeSingle();
      const vendorNum = digits(vendor?.whatsapp || vendor?.phone || "");
      if (from.length < 9 || vendorNum.length < 9 || from.slice(-9) !== vendorNum.slice(-9)) continue;

      // respond_vendor only works while the order is waiting for this vendor, so duplicates and
      // late replies are rejected by the database itself.
      const replied = await db.rpc("respond_vendor", { p_order: orderId, p_accept: accept });
      if (replied.error) continue;

      if (accept) {
        await db.rpc("offer_next_rider", { p_order: orderId });
      } else {
        const next = await db.rpc("offer_next_vendor", { p_order: orderId });
        if (next.data?.ok) await notifyVendor(orderId);
      }
    }
  } catch (e) {
    console.error("whatsapp-webhook error", e);
    // still return 200 so Meta does not retry forever
  }

  return json({ ok: true });
});
