import { useState } from "react";
import { Alert, Pressable, ScrollView, Text, View } from "react-native";
import { router } from "expo-router";
import { Field, PrimaryButton, Screen, Sub, Title } from "@/components/ui";
import { supabase } from "@/lib/supabase";
import { colors, radius } from "@/lib/theme";

export default function RiderApply() {
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [vehicle, setVehicle] = useState<"bicycle" | "motorbike">("bicycle");
  const [licence, setLicence] = useState("");
  const [ownership, setOwnership] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit() {
    if (!fullName || !phone) {
      Alert.alert("Missing details", "Name and phone are required.");
      return;
    }
    setLoading(true);
    const { error } = await supabase.rpc("apply_rider", {
      p_full_name: fullName,
      p_phone: phone,
      p_address: address,
      p_vehicle: vehicle,
      p_licence: licence,
      p_ownership: ownership,
    });
    setLoading(false);
    if (error) return Alert.alert("Could not submit", error.message);
    Alert.alert("Submitted", "Your rider account is pending review.");
    router.replace("/(customer)");
  }

  return (
    <Screen style={{ padding: 0 }}>
      <ScrollView contentContainerStyle={{ padding: 24, paddingBottom: 40 }}>
        <Title>Rider application</Title>
        <Sub>Approved riders can go online and receive jobs. Customers can also apply later.</Sub>
        <View style={{ height: 18 }} />
        <Field value={fullName} onChangeText={setFullName} placeholder="Full name" />
        <View style={{ height: 10 }} />
        <Field value={phone} onChangeText={setPhone} placeholder="Mobile number" keyboardType="phone-pad" />
        <View style={{ height: 10 }} />
        <Field value={address} onChangeText={setAddress} placeholder="Residential address" />
        <View style={{ height: 16 }} />
        <Text style={{ fontWeight: "700", marginBottom: 8 }}>Vehicle type</Text>
        <View style={{ flexDirection: "row", gap: 10 }}>
          {(["bicycle", "motorbike"] as const).map((v) => (
            <Pressable
              key={v}
              onPress={() => setVehicle(v)}
              style={{
                flex: 1,
                borderRadius: radius.md,
                padding: 14,
                borderWidth: 2,
                borderColor: vehicle === v ? colors.gold : colors.line,
                backgroundColor: "#fff",
              }}
            >
              <Text style={{ fontWeight: "800", textTransform: "capitalize" }}>{v}</Text>
            </Pressable>
          ))}
        </View>
        <View style={{ height: 10 }} />
        <Field value={licence} onChangeText={setLicence} placeholder="Licence / ID information" />
        <View style={{ height: 10 }} />
        <Field value={ownership} onChangeText={setOwnership} placeholder="Proof of ownership or permission" />
        <View style={{ height: 20 }} />
        <PrimaryButton label="Submit for review" onPress={submit} loading={loading} />
      </ScrollView>
    </Screen>
  );
}
