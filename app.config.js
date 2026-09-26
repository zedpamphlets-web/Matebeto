const { expo } = require("./app.json");

/** Bakes EAS EXPO_PUBLIC_* values into extra so the APK can read them at runtime. */
module.exports = () => ({
  ...expo,
  extra: {
    ...(expo.extra || {}),
    supabaseUrl: process.env.EXPO_PUBLIC_SUPABASE_URL || "",
    supabaseAnonKey: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || "",
    paymentApiUrl: process.env.EXPO_PUBLIC_PAYMENT_API_URL || "",
  },
});
