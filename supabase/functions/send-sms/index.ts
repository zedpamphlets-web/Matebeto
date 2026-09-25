import { corsHeaders, json } from "../_shared/lipila.ts";

/**
 * Supabase Auth Send SMS hook → Africa's Talking.
 * Enable under Authentication → Hooks after deploying this function.
 */
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const payload = await req.json();
    const phone = payload?.user?.phone || payload?.phone;
    const otp = payload?.sms?.otp || payload?.otp;
    if (!phone || !otp) return json({ error: "Missing phone or otp" }, 400);

    const username = Deno.env.get("AT_USERNAME");
    const apiKey = Deno.env.get("AT_API_KEY");
    const from = Deno.env.get("AT_FROM") || "";
    if (!username || !apiKey) {
      return json({ error: "Africa's Talking secrets are not set." }, 500);
    }

    const body = new URLSearchParams();
    body.set("username", username);
    body.set("to", String(phone));
    body.set("message", `Matebeto code: ${otp}. Let's Eat.`);
    if (from) body.set("from", from);

    const res = await fetch("https://api.africastalking.com/version1/messaging", {
      method: "POST",
      headers: {
        apiKey,
        Accept: "application/json",
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body,
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) return json({ error: data }, 502);
    return json({ ok: true, provider: "africastalking", data });
  } catch (e) {
    return json({ error: e instanceof Error ? e.message : "Unexpected error." }, 500);
  }
});
