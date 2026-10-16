import { corsHeaders, serviceClient, requireServer, json } from "../_shared/lipila.ts";

const CUSTOMER: Record<string, { title: string; body: string }> = {
  VENDOR_OFFERED: {
    title: "Vendor offered",
    body: "A food partner has been offered your order.",
  },
  VENDOR_ACCEPTED: {
    title: "Vendor accepted",
    body: "A vendor accepted your order and is preparing it.",
  },
  RIDER_ASSIGNED: {
    title: "Rider found",
    body: "A rider is going to collect your order.",
  },
  OUT_FOR_DELIVERY: {
    title: "Rider on the way",
    body: "Your rider is on the way with your order.",
  },
  COMPLETED: {
    title: "Delivered",
    body: "Your order has been delivered.",
  },
  CANCELLED: {
    title: "Order cancelled",
    body: "Your order was cancelled.",
  },
  NO_VENDOR_FOUND: {
    title: "No vendor",
    body: "No vendor could take your order.",
  },
  NO_RIDER_AVAILABLE: {
    title: "No rider yet",
    body: "No rider is free right now. We will keep trying.",
  },
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (!requireServer(req)) return json({ error: "Unauthorized" }, 401);

  try {
    const payload = await req.json().catch(() => ({}));
    const db = serviceClient();
    const orderId = String(payload.orderId || "");
    let userIds: string[] = [];
    let title = "Matebeto";
    let body = "You have an update.";
    let path = orderId ? `/order/${orderId}` : "/(customer)/orders";

    if (payload.kind === "rider_offer") {
      const { data: rider } = await db.from("riders").select("user_id").eq("id", payload.riderId).maybeSingle();
      if (!rider?.user_id) return json({ ok: true, sent: 0, reason: "NO_RIDER_USER" });
      userIds = [rider.user_id];
      title = "New delivery";
      body = "A delivery has been offered to you.";
      path = orderId ? `/(rider)/job/${orderId}` : "/(rider)";
    } else {
      const { data: order } = await db
        .from("orders")
        .select("id, customer_id, status, order_number")
        .eq("id", orderId)
        .maybeSingle();
      if (!order) return json({ ok: false, reason: "NO_ORDER" });
      const status = String(payload.status || order.status || "");
      const copy = CUSTOMER[status];
      if (!copy) return json({ ok: true, skipped: status });
      userIds = [order.customer_id];
      title = copy.title;
      body = `Order ${order.order_number}. ${copy.body}`;
      path = `/order/${order.id}`;
    }

    const { data: rows } = await db.from("push_tokens").select("token").in("user_id", userIds);
    const tokens = (rows || []).map((row) => row.token).filter(Boolean);
    if (!tokens.length) return json({ ok: true, sent: 0 });

    const messages = tokens.map((token) => ({
      to: token,
      title,
      body,
      sound: "default",
      priority: "high",
      channelId: "orders",
      data: { orderId, path },
    }));

    const res = await fetch("https://exp.host/--/api/v2/push/send", {
      method: "POST",
      headers: { Accept: "application/json", "Content-Type": "application/json" },
      body: JSON.stringify(messages),
    });
    const result = await res.json().catch(() => ({}));
    const tickets = Array.isArray(result?.data) ? result.data : [];
    for (let i = 0; i < tickets.length; i++) {
      if (tickets[i]?.details?.error === "DeviceNotRegistered" && tokens[i]) {
        await db.from("push_tokens").delete().eq("token", tokens[i]);
      }
    }

    return json({ ok: res.ok, sent: tokens.length });
  } catch (error) {
    console.error("send-push", error);
    return json({ ok: false, error: "Push failed" }, 500);
  }
});
