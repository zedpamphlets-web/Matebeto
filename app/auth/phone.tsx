import { useState } from "react";
import { Alert, Text, View } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { Field, PrimaryButton, Screen, Sub, Title } from "@/components/ui";
import { supabase } from "@/lib/supabase";
import { toZambianMsisdn } from "@/lib/lipila";
import { colors } from "@/lib/theme";

export default function PhoneAuth() {
  const { mode } = useLocalSearchParams<{ mode?: string }>();
  const [phone, setPhone] = useState("");
  const [loading, setLoading] = useState(false);

  async function send() {
    const msisdn = toZambianMsisdn(phone);
    if (msisdn.length !== 12) {
      Alert.alert("Check number", "Enter a Zambian mobile number.");
      return;
    }
    setLoading(true);
    const { error } = await supabase.auth.signInWithOtp({ phone: `+${msisdn}` });
    setLoading(false);
    if (error) {
      Alert.alert("SMS not sent", error.message + "\n\nAdd your SMS provider in Supabase Auth.");
      return;
    }
    router.push({ pathname: "/auth/otp", params: { phone: `+${msisdn}`, mode: mode || "customer" } });
  }

  return (
    <Screen>
      <Title>Enter your mobile number</Title>
      <Sub>We’ll send you an OTP to verify your number.</Sub>
      <View style={{ height: 28 }} />
      <Text style={{ fontWeight: "700", marginBottom: 8, color: colors.ink }}>+260</Text>
      <Field value={phone} onChangeText={setPhone} placeholder="97 123 4567" keyboardType="phone-pad" />
      <View style={{ height: 20 }} />
      <PrimaryButton label="Send OTP" onPress={send} loading={loading} color={colors.gold} />
    </Screen>
  );
}
