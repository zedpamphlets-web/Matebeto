import { useState } from "react";
import { Alert, Text, TextInput, View } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { PrimaryButton, Screen, Sub, Title } from "@/components/ui";
import { supabase } from "@/lib/supabase";
import { toZambianMsisdn } from "@/lib/lipila";
import { colors, fonts, radius } from "@/lib/theme";

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
      <Sub>We'll send you an OTP to verify your number. Account activated after that.</Sub>
      <View style={{ height: 28 }} />
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          backgroundColor: "#fff",
          borderRadius: radius.md,
          borderWidth: 1,
          borderColor: colors.line,
          paddingHorizontal: 14,
          height: 54,
        }}
      >
        <Text style={{ fontFamily: fonts.title, color: colors.ink, marginRight: 10 }}>+260</Text>
        <TextInput
          value={phone}
          onChangeText={setPhone}
          placeholder="97 123 4567"
          placeholderTextColor={colors.muted}
          keyboardType="phone-pad"
          style={{ flex: 1, fontSize: 16, fontFamily: fonts.body, color: colors.ink }}
        />
      </View>
      <View style={{ height: 20 }} />
      <PrimaryButton label="Send OTP" onPress={send} loading={loading} color={colors.gold} />
    </Screen>
  );
}
