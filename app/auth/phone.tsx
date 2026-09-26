import { useState } from "react";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";
import { colors, fonts } from "@/lib/theme";
import { isSupabaseConfigured, supabase } from "@/lib/supabase";
import { toZambianMsisdn } from "@/lib/lipila";

export default function PhoneAuth() {
  const { mode } = useLocalSearchParams<{ mode?: string }>();
  const [phone, setPhone] = useState("");
  const [human, setHuman] = useState(false);
  const [loading, setLoading] = useState(false);
  const [invalid, setInvalid] = useState(false);
  const [humanError, setHumanError] = useState(false);

  const msisdn = toZambianMsisdn(phone);
  const valid = msisdn.length === 12 && msisdn.startsWith("260");

  async function next() {
    if (!valid) {
      setInvalid(true);
      return;
    }
    setInvalid(false);
    if (!human) {
      setHumanError(true);
      return;
    }
    setHumanError(false);
    setLoading(true);

    const e164 = `+${msisdn}`;
    if (isSupabaseConfigured) {
      const { error } = await supabase.auth.signInWithOtp({ phone: e164 });
      setLoading(false);
      router.push({
        pathname: "/auth/otp",
        params: { phone: e164, mode: mode || "customer", preview: error ? "1" : "0" },
      });
      return;
    }
    setLoading(false);
    router.push({
      pathname: "/auth/otp",
      params: { phone: e164, mode: mode || "customer", preview: "1" },
    });
  }

  return (
    <View style={styles.root}>
      <SafeAreaView style={{ flex: 1 }}>
        <Pressable onPress={() => router.back()} style={styles.back} hitSlop={12}>
          <Ionicons name="chevron-back" size={22} color="#fff" />
        </Pressable>

        <View style={styles.body}>
          <Text style={styles.kicker}>Log in or Sign up</Text>
          <Text style={styles.heading}>YOUR MOBILE{"\n"}NUMBER</Text>

          <TextInput
            value={phone}
            onChangeText={(t) => {
              setPhone(t);
              if (invalid) setInvalid(false);
            }}
            placeholder="Your mobile number"
            placeholderTextColor="#7A7A7A"
            keyboardType="phone-pad"
            autoFocus
            style={[styles.input, invalid && styles.inputBad]}
          />

          {invalid ? (
            <View style={styles.error}>
              <Text style={styles.errorText}>Enter a valid mobile number, example: 0970000000</Text>
            </View>
          ) : null}

          <Pressable
            onPress={() => {
              setHuman((v) => !v);
              setHumanError(false);
            }}
            style={[styles.human, humanError && styles.humanBad]}
          >
            <View style={styles.humanLeft}>
              <View style={[styles.box, human && styles.boxOn]}>
                {human ? <Ionicons name="checkmark" size={16} color={colors.ink} /> : null}
              </View>
              <Text style={styles.humanText}>I am human</Text>
            </View>
            <View style={styles.badge}>
              <View style={styles.badgeMark}>
                <Text style={styles.badgeM}>M</Text>
              </View>
              <Text style={styles.badgeName}>Matebeto</Text>
            </View>
          </Pressable>

          <Pressable onPress={next} disabled={loading} style={styles.next}>
            <Text style={styles.nextText}>{loading ? "PLEASE WAIT" : "NEXT"}</Text>
          </Pressable>
        </View>
      </SafeAreaView>
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
    lineHeight: 34,
    marginBottom: 22,
  },
  input: {
    height: 54,
    borderRadius: 10,
    backgroundColor: "#1C1C1C",
    borderWidth: 1.5,
    borderColor: "#2A2A2A",
    paddingHorizontal: 16,
    color: "#fff",
    fontFamily: fonts.body,
    fontSize: 16,
  },
  inputBad: { borderColor: colors.danger },
  error: {
    marginTop: 12,
    backgroundColor: colors.danger,
    borderRadius: 6,
    paddingVertical: 10,
    paddingHorizontal: 12,
  },
  errorText: { color: "#fff", fontFamily: fonts.bodySemi, fontSize: 13 },
  human: {
    marginTop: 16,
    backgroundColor: "#fff",
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  humanBad: { borderWidth: 2, borderColor: colors.danger },
  humanLeft: { flexDirection: "row", alignItems: "center" },
  box: {
    width: 22,
    height: 22,
    borderRadius: 3,
    borderWidth: 2,
    borderColor: "#C8C8C8",
    marginRight: 12,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#fff",
  },
  boxOn: { backgroundColor: colors.gold, borderColor: colors.gold },
  humanText: { color: "#1A1A1A", fontFamily: fonts.body, fontSize: 16 },
  badge: { alignItems: "center" },
  badgeMark: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: colors.gold,
    alignItems: "center",
    justifyContent: "center",
  },
  badgeM: { fontFamily: fonts.script, fontSize: 18, color: colors.ink, marginTop: 2 },
  badgeName: { fontSize: 8, color: "#888", marginTop: 2, fontFamily: fonts.bodySemi },
  next: {
    marginTop: 18,
    height: 52,
    borderRadius: 10,
    backgroundColor: colors.gold,
    alignItems: "center",
    justifyContent: "center",
  },
  nextText: { color: colors.ink, fontFamily: fonts.display, fontSize: 16, letterSpacing: 1 },
});
