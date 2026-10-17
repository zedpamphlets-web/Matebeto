import { useState } from "react";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { fonts, ui } from "@/lib/theme";
import { friendlyAuthError, isSupabaseConfigured, pingSupabase, supabase } from "@/lib/supabase";
import { toZambianMsisdn } from "@/lib/lipila";
import { clearPreviewSession } from "@/lib/preview";
import { AuthScreen } from "@/components/auth-ui";

export default function PhoneAuth() {
  const { mode } = useLocalSearchParams<{ mode?: string }>();
  const [phone, setPhone] = useState("");
  const [loading, setLoading] = useState(false);
  const [invalid, setInvalid] = useState(false);
  const [sendError, setSendError] = useState("");

  const msisdn = toZambianMsisdn(phone);
  const valid = msisdn.length === 12 && msisdn.startsWith("260");

  async function next() {
    if (!valid) {
      setInvalid(true);
      return;
    }
    setInvalid(false);
    setSendError("");
    setLoading(true);

    const e164 = `+${msisdn}`;

    if (isSupabaseConfigured) {
      await clearPreviewSession();
      const ping = await pingSupabase();
      if (!ping.ok) {
        setLoading(false);
        setSendError(friendlyAuthError(ping.detail));
        return;
      }
      const { error } = await supabase.auth.signInWithOtp({
        phone: e164,
        options: { shouldCreateUser: true, channel: "sms" },
      });
      setLoading(false);
      if (error) {
        setSendError(friendlyAuthError(error.message));
        return;
      }
      router.push({ pathname: "/auth/otp", params: { phone: e164, mode: mode || "customer", preview: "0" } });
      return;
    }

    setLoading(false);
    router.push({ pathname: "/auth/otp", params: { phone: e164, mode: mode || "customer", preview: "1" } });
  }

  return (
    <AuthScreen
      heading="Enter your phone number"
      sub="We will send a confirmation code to it"
      onBack={() => (router.canGoBack() ? router.back() : router.replace("/"))}
      buttonLabel="Continue"
      onPress={next}
      loading={loading}
      disabled={!phone.trim()}
      footer={
        <Text style={s.terms}>
          By continuing, I accept the terms of the <Text style={s.link}>User Agreement</Text> and consent to the
          processing of my personal information in accordance with the terms of the <Text style={s.link}>Privacy Policy</Text>.
        </Text>
      }
    >
      <View style={[s.inputRow, invalid && s.inputBad]}>
        <View style={s.flagWrap}>
          <Text style={s.flag}>🇿🇲</Text>
        </View>
        <Text style={s.code}>+260</Text>
        <TextInput
          value={phone}
          onChangeText={(t) => {
            setPhone(t);
            if (invalid) setInvalid(false);
            if (sendError) setSendError("");
          }}
          placeholder="000 000 000"
          placeholderTextColor="#9C9CA6"
          keyboardType="phone-pad"
          autoFocus
          style={s.input}
        />
        {phone ? (
          <Pressable onPress={() => setPhone("")} hitSlop={12} style={s.clear} accessibilityLabel="Clear number">
            <Ionicons name="close" size={26} color="#1C1B26" />
          </Pressable>
        ) : null}
      </View>

      {invalid ? <Text style={s.error}>Enter a valid mobile number, for example 097 000 0000</Text> : null}
      {sendError ? <Text style={s.error}>{sendError}</Text> : null}
      {!isSupabaseConfigured ? (
        <Text style={s.error}>This build has no Supabase key. Set EXPO_PUBLIC_SUPABASE_ANON_KEY and build again.</Text>
      ) : null}
    </AuthScreen>
  );
}

const s = StyleSheet.create({
  inputRow: {
    height: 64,
    borderRadius: 32,
    borderWidth: 2,
    borderColor: "#1C1B26",
    flexDirection: "row",
    alignItems: "center",
    paddingLeft: 4,
    paddingRight: 14,
    backgroundColor: "#FFFFFF",
  },
  inputBad: { borderColor: ui.red },
  flagWrap: { width: 54, height: 54, borderRadius: 27, backgroundColor: "#F3F5F7", alignItems: "center", justifyContent: "center" },
  flag: { fontSize: 26 },
  code: { fontFamily: fonts.body, fontSize: 21, color: "#1C1B26", marginLeft: 14 },
  input: { flex: 1, height: 60, marginLeft: 6, fontFamily: fonts.body, fontSize: 21, color: "#1C1B26", letterSpacing: 0.5 },
  clear: { width: 32, height: 32, alignItems: "center", justifyContent: "center" },
  error: { fontFamily: fonts.bodySemi, fontSize: 13.5, color: ui.red, marginTop: 12, marginLeft: 6 },
  terms: { fontFamily: fonts.body, fontSize: 13.5, lineHeight: 19, color: "#8E8D99" },
  link: { color: ui.red },
});
