const { expo } = require("./app.json");

/** Baked into every build so login works even if EAS env injection fails. */
const URL = "https://lmyvvwulabezlglxjzvl.supabase.co";
const ANON = "sb_publishable_XJVKUkLgF-0OJk2Mf4N8nQ_ZhmtezXu";

module.exports = () => ({
  ...expo,
  extra: {
    ...(expo.extra || {}),
    supabaseUrl: (process.env.EXPO_PUBLIC_SUPABASE_URL || URL).trim(),
    supabaseAnonKey: (process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || ANON).trim(),
    paymentApiUrl: (
      process.env.EXPO_PUBLIC_PAYMENT_API_URL ||
      `${URL}/functions/v1`
    ).trim(),
  },
});
