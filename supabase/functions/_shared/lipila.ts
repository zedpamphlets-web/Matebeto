import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

export const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, apikey, content-type",
};

const LIPILA_BASE_URL = Deno.env.get("LIPILA_BASE_URL") || "https://blz.lipila.io/api/v1";
const LIPILA_SECRET_KEY = Deno.env.get("LIPILA_SECRET_KEY") || "";

export function serviceClient() {
  return createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
}

export async function requireUser(req: Request): Promise<string | null> {
  const auth = req.headers.get("Authorization") || "";
  const token = auth.replace(/^Bearer\s+/i, "");
  if (!token) return null;
  const anon = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, {
    global: { headers: { Authorization: `Bearer ${token}` } },
  });
  const { data, error } = await anon.auth.getUser(token);
  if (error || !data.user) return null;
  return data.user.id;
}

export async function loadOwnedOrder(db: ReturnType<typeof serviceClient>, orderId: string, userId: string) {
  const { data: order } = await db
    .from("orders")
    .select("id, customer_id, total, payment_status, status, order_number")
    .eq("id", orderId)
    .maybeSingle();
  if (!order) return null;
  if (order.customer_id === userId) return order;
  const { data: admin } = await db.from("platform_admins").select("user_id").eq("user_id", userId).maybeSingle();
  return admin ? order : null;
}

export async function lipilaFetch(path: string, body: unknown) {
  if (!LIPILA_SECRET_KEY) throw new Error("LIPILA_SECRET_KEY is not set");
  const res = await fetch(`${LIPILA_BASE_URL}${path}`, {
    method: path.includes("check-status") ? "GET" : "POST",
    headers: { "Content-Type": "application/json", "x-api-key": LIPILA_SECRET_KEY },
    body: path.includes("check-status") ? undefined : JSON.stringify(body),
  });
  const json = await res.json().catch(() => ({}));
  return { ok: res.ok, json };
}

export function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
