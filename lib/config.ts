import Constants from "expo-constants";

const extra = (Constants.expoConfig?.extra ?? {}) as Record<string, string | undefined>;

export const PAYMENT_API_URL = (
  extra.paymentApiUrl ||
  process.env.EXPO_PUBLIC_PAYMENT_API_URL ||
  ""
).trim();

const base = PAYMENT_API_URL.replace(/\/$/, "");

export const CREATE_PAYMENT_URL = base ? `${base}/create-payment` : "";
export const VERIFY_PAYMENT_URL = base ? `${base}/verify-payment` : "";
export const NOTIFY_VENDOR_URL = base ? `${base}/notify-vendor` : "";
export const VERIFY_OTP_URL = base ? `${base}/verify-delivery-otp` : "";
