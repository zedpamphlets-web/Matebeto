import { useState } from "react";
import { Alert, View } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { Field, PrimaryButton, Screen, Sub, Title } from "@/components/ui";
import { supabase } from "@/lib/supabase";
import { currentProfile } from "@/lib/session";

export default function Otp() {
  const { phone, mode } = useLocalSearchParams<{ phone: string; mode?: string }>();
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);

  async function verify() {
    setLoading(true);
    const { error } = await supabase.auth.verifyOtp({ phone: String(phone), token: code, type: "sms" });
    setLoading(false);
    if (error) {
      Alert.alert("OTP failed", error.message);
      return;
    }
    const { rider, admin } = await currentProfile();
    if (admin) return router.replace("/admin");
    if (mode === "rider") {
      if (rider?.status === "APPROVED") return router.replace("/(rider)");
      return router.replace("/auth/rider-apply");
    }
    router.replace("/(customer)");
  }

  return (
    <Screen>
      <Title>Enter OTP</Title>
      <Sub>Code sent to {phone}</Sub>
      <View style={{ height: 22 }} />
      <Field value={code} onChangeText={setCode} placeholder="6-digit code" keyboardType="number-pad" />
      <View style={{ height: 16 }} />
      <PrimaryButton label="Verify" onPress={verify} loading={loading} />
    </Screen>
  );
}
