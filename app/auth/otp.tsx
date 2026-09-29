import { useMemo, useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";
import { colors, fonts } from "@/lib/theme";
import { friendlyAuthError, isSupabaseConfigured, supabase } from "@/lib/supabase";
import { currentProfile } from "@/lib/session";
import { PREVIEW_OTP, clearPreviewSession, setPreviewSession } from "@/lib/preview";

export default function Otp() {
  const { phone, mode, preview } = useLocalSearchParams<{
    phone: string;
    mode?: string;
    preview?: string;
  }>();
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Real path whenever Supabase is in the build — ignore leftover preview=1
  const usePreview = !isSupabaseConfigured;

  const boxes = useMemo(() => Array.from({ length: 6 }, (_, i) => code[i] || ""), [code]);

  async function goIn() {
    const { rider, admin } = await currentProfile();
    if (admin) return router.replace("/admin");
    if (mode === "rider") {
      if (rider?.status === "APPROVED") return router.replace("/(rider)");
      return router.replace("/auth/rider-apply");
    }
    router.replace("/(customer)");
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
      setError("Wrong code. This build has no Supabase keys.");
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
    <View style={styles.root}>
      <SafeAreaView style={{ flex: 1 }}>
        <Pressable onPress={() => router.back()} style={styles.back} hitSlop={12}>
          <Ionicons name="chevron-back" size={22} color="#fff" />
        </Pressable>
        <View style={styles.body}>
          <Text style={styles.kicker}>We sent a code</Text>
          <Text style={styles.heading}>ENTER OTP</Text>
          <Text style={styles.sub}>Code sent to {phone}</Text>

          <View style={styles.row}>
            {boxes.map((d, i) => (
              <View key={i} style={[styles.box, code.length === i && styles.boxOn]}>
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

          {usePreview ? (
            <Text style={styles.hint}>No Supabase in this build. Preview code: 123456</Text>
          ) : (
            <Text style={styles.live}>Enter the SMS code from Africa&apos;s Talking</Text>
          )}

          {error ? (
            <View style={styles.error}>
              <Text style={styles.errorText}>{error}</Text>
            </View>
          ) : null}

          <Pressable onPress={verify} disabled={loading} style={styles.next}>
            <Text style={styles.nextText}>{loading ? "PLEASE WAIT" : "VERIFY"}</Text>
          </Pressable>
        </View>
      </SafeAreaView>

      {loading ? (
        <View style={styles.overlay}>
          <ActivityIndicator size="large" color={colors.gold} />
          <Text style={styles.overlayText}>Opening Matebeto…</Text>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#121212" },
  back: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.12)",
    alignItems: "center",
    justifyContent: "center",
    marginLeft: 16,
    marginTop: 6,
  },
  body: { paddingHorizontal: 22, paddingTop: 28 },
  kicker: { color: "#9A9A9A", fontFamily: fonts.body, fontSize: 14, marginBottom: 10 },
  heading: {
    color: "#fff",
    fontFamily: fonts.display,
    fontSize: 28,
    letterSpacing: 0.4,
    marginBottom: 8,
  },
  sub: { color: "#9A9A9A", fontFamily: fonts.body, marginBottom: 22 },
  row: { flexDirection: "row", gap: 8, marginBottom: 16, position: "relative" },
  box: {
    flex: 1,
    height: 54,
    borderRadius: 10,
    backgroundColor: "#1C1C1C",
    borderWidth: 1.5,
    borderColor: "#2A2A2A",
    alignItems: "center",
    justifyContent: "center",
  },
  boxOn: { borderColor: colors.gold },
  digit: { color: "#fff", fontFamily: fonts.display, fontSize: 22 },
  hidden: { ...StyleSheet.absoluteFillObject, opacity: 0 },
  hint: { color: colors.gold, fontFamily: fonts.bodySemi, fontSize: 13, marginBottom: 12 },
  live: { color: colors.customer, fontFamily: fonts.bodySemi, fontSize: 13, marginBottom: 12 },
  error: {
    backgroundColor: colors.danger,
    borderRadius: 6,
    paddingVertical: 10,
    paddingHorizontal: 12,
    marginBottom: 12,
  },
  errorText: { color: "#fff", fontFamily: fonts.bodySemi, fontSize: 13 },
  next: {
    marginTop: 8,
    height: 52,
    borderRadius: 10,
    backgroundColor: colors.gold,
    alignItems: "center",
    justifyContent: "center",
  },
  nextText: { color: colors.ink, fontFamily: fonts.display, fontSize: 16, letterSpacing: 1 },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.72)",
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
  },
  overlayText: { color: "#fff", fontFamily: fonts.bodySemi, letterSpacing: 0.3 },
});
