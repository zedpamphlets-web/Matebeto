import { useEffect, useMemo, useState } from "react";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { fonts, ui } from "@/lib/theme";
import { friendlyAuthError, isSupabaseConfigured, supabase } from "@/lib/supabase";
import { currentProfile } from "@/lib/session";
import { PREVIEW_OTP, clearPreviewSession, setPreviewSession } from "@/lib/preview";
import { AuthScreen } from "@/components/auth-ui";

const RESEND_SECONDS = 60;

export default function Otp() {
  const { phone, mode, preview } = useLocalSearchParams<{
    phone: string;
    mode?: string;
    preview?: string;
  }>();
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [secondsLeft, setSecondsLeft] = useState(RESEND_SECONDS);
  const [resending, setResending] = useState(false);
  const [cycle, setCycle] = useState(0); // bumped on every resend to restart the countdown below

  // Real path whenever Supabase is in the build — ignore leftover preview=1
  const usePreview = !isSupabaseConfigured;

  const boxes = useMemo(() => Array.from({ length: 6 }, (_, i) => code[i] || ""), [code]);

  // Countdown starts as soon as the OTP screen opens (a code was just sent), and
  // restarts cleanly whenever the code is resent (via `cycle`).
  useEffect(() => {
    const id = setInterval(() => {
      setSecondsLeft((s) => (s <= 1 ? 0 : s - 1));
    }, 1000);
    return () => clearInterval(id);
  }, [cycle]);

  const timerLabel = `00:${String(secondsLeft).padStart(2, "0")}`;

  async function resend() {
    if (secondsLeft > 0 || resending) return;
    setResending(true);
    setError("");
    try {
      if (!usePreview) {
        const { error: resendError } = await supabase.auth.signInWithOtp({
          phone: String(phone),
          options: { shouldCreateUser: true, channel: "sms" },
        });
        if (resendError) {
          setError(friendlyAuthError(resendError.message) || "Could not resend the code.");
          setResending(false);
          return;
        }
      }
      setCode("");
      setSecondsLeft(RESEND_SECONDS);
      setCycle((c) => c + 1);
    } finally {
      setResending(false);
    }
  }

  async function goIn() {
    const { rider, admin } = await currentProfile();
    if (admin) return router.replace("/admin");
    if (mode === "rider") {
      if (rider?.status === "APPROVED") return router.replace("/(rider)");
      return router.replace("/auth/rider-apply");
    }
    // plate loader ("Finding what to eat"), then Home
    router.replace({ pathname: "/finding", params: { next: "/(customer)" } });
  }

  async function verify() {
    const token = code.replace(/\D/g, "");
    if (token.length !== 6) {
      setError("Enter the 6-digit code");
      return;
    }
    setLoading(true);
    setError("");

    // Offline / missing env only
    if (usePreview) {
      if (token === PREVIEW_OTP) {
        await setPreviewSession({
          mode: mode === "rider" ? "rider" : "customer",
          phone: String(phone),
        });
        await goIn();
        return;
      }
      setLoading(false);
      setError("Wrong code. Try again.");
      return;
    }

    // Live: verify with Supabase (SMS from Africa's Talking)
    await clearPreviewSession();
    const { error: otpError } = await supabase.auth.verifyOtp({
      phone: String(phone),
      token,
      type: "sms",
    });
    if (otpError) {
      setLoading(false);
      setError(friendlyAuthError(otpError.message) || "Invalid code. Try again.");
      return;
    }
    await goIn();
  }

  return (
    <AuthScreen
      heading="Enter your code"
      sub={`Code sent to ${phone}`}
      onBack={() => router.back()}
      buttonLabel="Verify"
      onPress={verify}
      loading={loading}
      disabled={code.length < 6}
      footer={
        <View style={styles.resendRow}>
          {secondsLeft > 0 ? (
            <Text style={styles.resendWait}>Resend code in {timerLabel}</Text>
          ) : (
            <Pressable onPress={resend} disabled={resending} hitSlop={8}>
              <Text style={styles.resendLink}>{resending ? "Resending…" : "Resend code"}</Text>
            </Pressable>
          )}
        </View>
      }
    >
      <View style={styles.row}>
        {boxes.map((d, i) => (
          <View key={i} style={[styles.box, code.length === i && styles.boxOn, !!error && styles.boxBad]}>
            <Text style={styles.digit}>{d}</Text>
          </View>
        ))}
        <TextInput
          value={code}
          onChangeText={(t) => setCode(t.replace(/\D/g, "").slice(0, 6))}
          keyboardType="number-pad"
          maxLength={6}
          autoFocus
          caretHidden
          style={styles.hidden}
        />
      </View>
      {usePreview ? <Text style={styles.hint}>Test mode. Use code 123456.</Text> : null}
      {error ? <Text style={styles.errorText}>{error}</Text> : null}
    </AuthScreen>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", gap: 8, position: "relative" },
  box: {
    flex: 1,
    height: 60,
    borderRadius: 16,
    backgroundColor: "#FFFFFF",
    borderWidth: 2,
    borderColor: "#E3E2E8",
    alignItems: "center",
    justifyContent: "center",
  },
  boxOn: { borderColor: "#1C1B26" },
  boxBad: { borderColor: ui.red },
  digit: { color: "#1C1B26", fontFamily: fonts.display, fontSize: 24 },
  hidden: { ...StyleSheet.absoluteFillObject, opacity: 0 },
  hint: { color: ui.sub, fontFamily: fonts.bodySemi, fontSize: 13, marginTop: 14 },
  resendRow: { alignItems: "center", paddingBottom: 4 },
  resendWait: { color: "#8E8D99", fontFamily: fonts.bodySemi, fontSize: 14 },
  resendLink: { color: ui.red, fontFamily: fonts.bodySemi, fontSize: 14 },
  errorText: { fontFamily: fonts.bodySemi, fontSize: 13.5, color: ui.red, marginTop: 14 },
});
