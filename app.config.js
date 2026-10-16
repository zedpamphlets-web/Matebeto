const { expo } = require("./app.json");

/** Baked into every build so login works even if EAS env injection fails. */
const URL = "https://lmyvvwulabezlglxjzvl.supabase.co";
const ANON = "sb_publishable_XJVKUkLgF-0OJk2Mf4N8nQ_ZhmtezXu";
const PROJECT_ID = "6c62308d-1842-493e-a0e2-360ba6662c98";

module.exports = () => ({
  ...expo,
  slug: "matebeto2027",
  owner: "matebeto2027s-team",
  extra: {
    ...(expo.extra || {}),
    eas: { projectId: PROJECT_ID },
    supabaseUrl: (process.env.EXPO_PUBLIC_SUPABASE_URL || URL).trim(),
    supabaseAnonKey: (process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || ANON).trim(),
    paymentApiUrl: (
      process.env.EXPO_PUBLIC_PAYMENT_API_URL ||
      `${URL}/functions/v1`
    ).trim(),
  },
});
