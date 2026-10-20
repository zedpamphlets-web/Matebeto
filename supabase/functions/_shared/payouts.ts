import { lipilaFetch } from "./lipila.ts";

// Sends pending payouts (vendor and rider) to their mobile money through Lipila.
// Each payout is claimed (PENDING -> PROCESSING) before sending, so it can never be sent twice.
// A payout that fails is marked FAILED and shown to the admin, who can tap "Retry payout".

function msisdn(raw: unknown): string {
  let d = String(raw || "").replace(/\D/g, "");
  if (d.startsWith("00")) d = d.slice(2);
  if (d.startsWith("0")) d = "260" + d.slice(1);
  if (d.length === 9) d = "260" + d;
  return d.length === 12 && d.startsWith("260") ? d : "";
}

export async function sendPendingPayouts(db: any, orderId?: string) {
  const { data: settings } = await db.from("settings").select("payouts_enabled").limit(1).maybeSingle();
  if (!settings?.payouts_enabled) return { skipped: "PAYOUTS_DISABLED" };

  let q = db.from("payouts").select("*").eq("status", "PENDING").order("created_at").limit(20);
  if (orderId) q = q.eq("order_id", orderId);
  const { data: list } = await q;

  const webhookSecret = Deno.env.get("LIPILA_WEBHOOK_SECRET") || "";
  const callbackUrl = webhookSecret
    ? `${Deno.env.get("SUPABASE_URL")}/functions/v1/lipila-webhook?token=${encodeURIComponent(webhookSecret)}`
    : "";

  let sent = 0;
  let failed = 0;
  for (const p of list || []) {
    // claim it; if another run already took it, skip
    const { data: claimed } = await db
      .from("payouts")
      .update({ status: "PROCESSING", updated_at: new Date().toISOString() })
      .eq("id", p.id)
      .eq("status", "PENDING")
      .select("id");
    if (!claimed?.length) continue;

    try {
      const { data: order } = await db.from("orders").select("order_number, status").eq("id", p.order_id).maybeSingle();
      if (!order || order.status !== "COMPLETED") throw new Error("Order is not completed");

      let number = "";
      if (p.payee_type === "vendor") {
        const { data: v } = await db.from("vendors").select("payout_number, phone, whatsapp").eq("id", p.payee_id).maybeSingle();
        number = msisdn(v?.payout_number) || msisdn(v?.phone) || msisdn(v?.whatsapp);
      } else {
        const { data: r } = await db.from("riders").select("payout_number, phone").eq("id", p.payee_id).maybeSingle();
        number = msisdn(r?.payout_number) || msisdn(r?.phone);
      }
      if (!number) throw new Error("No valid mobile money number for this " + p.payee_type);
      if (!(Number(p.amount) > 0)) throw new Error("Amount is zero");

      const res = await lipilaFetch(
        "/disbursements/mobile-money",
        {
          referenceId: p.reference,
          amount: Number(p.amount),
          narration: `Matebeto order ${order.order_number} ${p.payee_type}`,
          accountNumber: number,
          currency: "ZMW",
        },
        callbackUrl ? { callbackUrl } : {},
      );
      const status = String((res.json as any)?.status || "").toLowerCase();
      const rejected = !res.ok || status === "failed" || status === "rejected";
      await db
        .from("payouts")
        .update({ status: rejected ? "FAILED" : "SENT", lipila_response: res.json, updated_at: new Date().toISOString() })
        .eq("id", p.id);
      rejected ? failed++ : sent++;
    } catch (e) {
      failed++;
      await db
        .from("payouts")
        .update({ status: "FAILED", lipila_response: { error: String((e as Error).message || e) }, updated_at: new Date().toISOString() })
        .eq("id", p.id);
    }
  }
  return { sent, failed };
}
