import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const jsonHeaders = { "Content-Type": "application/json" };
const json = (b: unknown, s = 200) => new Response(JSON.stringify(b), { status: s, headers: jsonHeaders });

const CUSTOMER: Record<string, { title: string; body: string }> = {
  VENDOR_OFFERED: { title: "Looking for Chef", body: "We are looking for a chef for your order." },
  VENDOR_ACCEPTED: { title: "Chef confirmed", body: "Your chef confirmed and is preparing your order." },
  RIDER_ASSIGNED: { title: "Rider confirmed", body: "A rider is going to collect your order." },
  PICKED_UP: { title: "Order confirmed", body: "Your rider and chef matched the order number." },
  OUT_FOR_DELIVERY: { title: "Rider coming", body: "Your rider is coming with your order." },
  COMPLETED: { title: "Delivery complete", body: "Your order has been delivered." },
  CANCELLED: { title: "Order cancelled", body: "Your order was cancelled." },
  NO_VENDOR_FOUND: { title: "Still looking for a chef", body: "We have not found a chef yet. Open the order and tap Try again." },
  NO_RIDER_AVAILABLE: { title: "Still looking for a rider", body: "No rider is free right now. Open the order and tap Try again." },
  PAYMENT_FAILED: { title: "Payment failed", body: "Your payment did not go through and you were not charged." },
};

type Batch = {
  userIds?: string[];
  everyone?: boolean;
  title: string;
  body: string;
  path: string;
  orderId?: string;
  image?: string | null;
};

async function sendBatch(db: any, batch: Batch) {
  let tokens: string[] = [];
  if (batch.everyone) {
    const { data } = await db.from("push_tokens").select("token");
    tokens = (data || []).map((r: any) => r.token);
  } else if (batch.userIds && batch.userIds.length) {
    const { data } = await db.from("push_tokens").select("token").in("user_id", batch.userIds);
    tokens = (data || []).map((r: any) => r.token);
  }
  tokens = [...new Set(tokens.filter(Boolean))];
  if (!tokens.length) return { sent: 0, ok: true };

  const messages = tokens.map((to) => ({
    to,
    title: batch.title,
    body: batch.body,
    sound: "default",
    priority: "high",
    channelId: "orders",
    data: { orderId: batch.orderId || "", path: batch.path },
    ...(batch.image ? { richContent: { image: batch.image } } : {}),
  }));

  let ok = true;
  // Expo accepts at most 100 messages per request.
  for (let start = 0; start < messages.length; start += 100) {
    const res = await fetch("https://exp.host/--/api/v2/push/send", {
      method: "POST",
      headers: { Accept: "application/json", "Content-Type": "application/json" },
      body: JSON.stringify(messages.slice(start, start + 100)),
    });
    if (!res.ok) ok = false;
    const result = await res.json().catch(() => ({}));
    console.log("expo result", JSON.stringify(result));
    const tickets = Array.isArray(result?.data) ? result.data : [];
    for (let i = 0; i < tickets.length; i++) {
      const token = tokens[start + i];
      if (tickets[i]?.details?.error === "DeviceNotRegistered" && token) {
        await db.from("push_tokens").delete().eq("token", token);
      }
    }
  }
  return { sent: tokens.length, ok };
}

async function buildBatches(db: any, payload: any): Promise<Batch[] | { skipped: string }> {
  const kind = String(payload.kind || "order");
  const orderId = String(payload.orderId || "");

  if (kind === "new_meal") {
    const { data: meal } = await db
      .from("meals")
      .select("id, name, image_url, is_available")
      .eq("id", String(payload.mealId || ""))
      .maybeSingle();
    if (!meal || !meal.is_available) return { skipped: "MEAL_HIDDEN" };
    return [{ everyone: true, title: "New on Matebeto", body: `${meal.name} is now on the menu.`, path: "/(customer)", image: meal.image_url || null }];
  }

  if (kind === "new_account") {
    const userId = String(payload.userId || "");
    const device = String(payload.device || "phone").slice(0, 60);
    const platform = String(payload.platform || "Android").slice(0, 20);
    const batches: Batch[] = [];
    if (userId) {
      batches.push({
        userIds: [userId],
        title: "Welcome to Matebeto",
        body: "You have a new account. Complete your account details to start ordering.",
        path: "/(customer)/settings?edit=1",
      });
    }
    const { data: admins } = await db.from("platform_admins").select("user_id");
    const adminIds = (admins || []).map((a: any) => a.user_id).filter((id: string) => id && id !== userId);
    if (adminIds.length) {
      batches.push({
        userIds: adminIds,
        title: "New account",
        body: `New ${platform} ${device} signed up to Matebeto.`,
        path: "/(customer)/notifications",
      });
    }
    return batches;
  }

  if (kind === "rider_offer") {
    const { data: rider } = await db.from("riders").select("user_id").eq("id", payload.riderId).maybeSingle();
    if (!rider?.user_id) return { skipped: "NO_RIDER_USER" };
    // Origin (market), Delivery (area), Amount (trip price): nothing else before the rider accepts
    let body = "A delivery has been offered to you.";
    try {
      const { data: o } = await db.from("orders").select("market_id, customer_id, delivery_fee, delivery_address").eq("id", orderId).maybeSingle();
      if (o) {
        const { data: m } = await db.from("markets").select("name").eq("id", o.market_id).maybeSingle();
        const { data: pr } = await db.from("profiles").select("location_area").eq("user_id", o.customer_id).maybeSingle();
        const addr = String((o.delivery_address as any)?.text || "");
        const area = String(pr?.location_area || "").trim() || addr.split(",").pop()?.trim() || "";
        const parts = [
          m?.name ? `Origin: ${m.name}` : "",
          area ? `Delivery: ${area}` : "",
          o.delivery_fee != null ? `Amount: K${Number(o.delivery_fee).toFixed(2)}` : "",
        ].filter(Boolean);
        if (parts.length) body = parts.join(" · ");
      }
    } catch {
      // keep the plain text
    }
    return [{
      userIds: [rider.user_id],
      title: "New delivery",
      body,
      path: orderId ? `/(rider)/job/${orderId}` : "/(rider)",
      orderId,
    }];
  }

  const { data: order } = await db
    .from("orders")
    .select("id, customer_id, status, order_number")
    .eq("id", orderId)
    .maybeSingle();
  if (!order) return { skipped: "NO_ORDER" };
  const status = String(payload.status || order.status || "");
  const copy = CUSTOMER[status];
  if (!copy) return { skipped: status };
  return [{
    userIds: [order.customer_id],
    title: copy.title,
    body: `Order #${order.order_number}. ${copy.body}`,
    path: status === "PAYMENT_FAILED" ? "/(customer)" : `/order/${order.id}`,
    orderId: order.id,
  }];
}

Deno.serve(async (req) => {
  const cron = Deno.env.get("CRON_SECRET") || "";
  const sentSecret = req.headers.get("x-cron-secret") || "";
  const bearer = (req.headers.get("Authorization") || "").replace(/^Bearer\s+/i, "");
  const svc = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
  if (!((cron && sentSecret === cron) || (svc && bearer === svc))) return json({ error: "Unauthorized" }, 401);

  try {
    const payload = await req.json().catch(() => ({}));
    const db = createClient(Deno.env.get("SUPABASE_URL")!, svc);
    const built = await buildBatches(db, payload);
    if (!Array.isArray(built)) return json({ ok: true, ...built });

    let sent = 0;
    let ok = true;
    for (const batch of built) {
      const r = await sendBatch(db, batch);
      sent += r.sent;
      if (!r.ok) ok = false;
    }
    return json({ ok, sent });
  } catch (e) {
    console.error("send-push", e);
    return json({ ok: false, error: "Push failed" }, 500);
  }
});
