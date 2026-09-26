import { useEffect, useState } from "react";
import { Alert, Text, View } from "react-native";
import { router } from "expo-router";
import { Field, PrimaryButton, Screen, Title } from "@/components/ui";
import { supabase } from "@/lib/supabase";
import { currentProfile, signOutApp } from "@/lib/session";
import { colors } from "@/lib/theme";

export default function Settings() {
  const [name, setName] = useState("");
  const [address, setAddress] = useState("");
  const [rider, setRider] = useState<any>(null);
  const [admin, setAdmin] = useState(false);

  useEffect(() => {
    currentProfile().then(({ profile, rider, admin }) => {
      setName(profile?.full_name || "");
      setAddress(profile?.address_text || "");
      setRider(rider);
      setAdmin(admin);
    });
  }, []);

  async function save() {
    const { data } = await supabase.auth.getUser();
    if (!data.user) return;
    const { error } = await supabase.from("profiles").update({ full_name: name, address_text: address }).eq("user_id", data.user.id);
    if (error) Alert.alert("Save failed", error.message);
    else Alert.alert("Saved");
  }

  return (
    <Screen>
      <Title>Account</Title>
      <View style={{ height: 16 }} />
      <Field value={name} onChangeText={setName} placeholder="Full name" />
      <View style={{ height: 10 }} />
      <Field value={address} onChangeText={setAddress} placeholder="Default address" />
      <View style={{ height: 16 }} />
      <PrimaryButton label="Save" onPress={save} />
      <View style={{ height: 24 }} />
      {rider?.status === "APPROVED" && (
        <PrimaryButton label="Open rider mode" color={colors.rider} textColor="#fff" onPress={() => router.push("/(rider)")} />
      )}
      {rider?.status === "PENDING" && <Text style={{ color: colors.muted }}>Rider application is pending review.</Text>}
      {!rider && (
        <PrimaryButton label="Apply to become a rider" color="#fff" onPress={() => router.push("/auth/rider-apply")} />
      )}
      <View style={{ height: 12 }} />
      {admin && <PrimaryButton label="Admin" color={colors.ink} textColor="#fff" onPress={() => router.push("/admin")} />}
      <View style={{ height: 12 }} />
      <PrimaryButton
        label="Log out"
        color="#fff"
        onPress={async () => {
          await signOutApp();
          router.replace("/");
        }}
      />
    </Screen>
  );
}
