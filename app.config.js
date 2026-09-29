const { expo } = require("./app.json");

/** Matebeto Supabase project — URL always baked in. Anon key from EAS production env. */
const URL = "https://lmyvvwulabezlglxjzul.supabase.co";

module.exports = () => {
  const anon = (
    process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ||
    process.env.SUPABASE_ANON_KEY ||
    ""
  ).trim();

  return {
    ...expo,
    extra: {
      ...(expo.extra || {}),
      supabaseUrl: (process.env.EXPO_PUBLIC_SUPABASE_URL || URL).trim(),
      supabaseAnonKey: anon,
      paymentApiUrl: (
        process.env.EXPO_PUBLIC_PAYMENT_API_URL ||
        `${URL}/functions/v1`
      ).trim(),
    },
  };
};
