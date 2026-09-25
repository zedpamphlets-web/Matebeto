import { CREATE_PAYMENT_URL, VERIFY_PAYMENT_URL } from "@/lib/config";
import { supabase, SUPABASE_ANON_KEY } from "@/lib/supabase";
import type { LipilaProvider } from "@/lib/lipila";
import { toZambianMsisdn } from "@/lib/lipila";

async function authHeaders() {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  if (!token) throw new Error("Not signed in.");
  if (!SUPABASE_ANON_KEY) throw new Error("Supabase key missing in this build.");
  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`,
    apikey: SUPABASE_ANON_KEY,
  };
}

export async function startLipilaPayment(opts: {
  provider: LipilaProvider;
  orderId: string;
  phone: string;
}) {
  if (!CREATE_PAYMENT_URL) throw new Error("Payment API URL is not configured.");
  const res = await fetch(CREATE_PAYMENT_URL, {
    method: "POST",
    headers: await authHeaders(),
    body: JSON.stringify({
      provider: opts.provider,
      orderId: opts.orderId,
      phone: toZambianMsisdn(opts.phone),
    }),
  });
  const text = await res.text();
  const body = text ? JSON.parse(text) : {};
  if (!res.ok) throw new Error(body?.error || `Payment start failed (${res.status})`);
  return body;
}

export async function verifyLipilaPayment(orderId: string) {
  if (!VERIFY_PAYMENT_URL) return { status: "pending", error: "Verify URL missing" };
  const res = await fetch(VERIFY_PAYMENT_URL, {
    method: "POST",
    headers: await authHeaders(),
    body: JSON.stringify({ orderId }),
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) return { status: "pending", error: body?.error };
  return body as { status: string; reason?: string; error?: string };
}
