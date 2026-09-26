import { useEffect, useState } from "react";
import { Alert, Text, View } from "react-native";
import { router } from "expo-router";
import { AppHeader, DarkField, DarkScreen, GoldButton } from "@/components/app-shell";
import { supabase } from "@/lib/supabase";
import { currentProfile, signOutApp } from "@/lib/session";
import { colors, fonts } from "@/lib/theme";

export default function Settings() {
  const [name, setName] = useState("");
  const [address, setAddress] = useState("");
  const [phone, setPhone] = useState("");
  const [rider, setRider] = useState<any>(null);
  const [admin, setAdmin] = useState(false);
  const [preview, setPreview] = useState(false);

  useEffect(() => {
    currentProfile().then(({ user, profile, rider, admin, preview }) => {
      setName(profile?.full_name || "");
      setAddress(profile?.address_text || "");
      setPhone(String(user?.phone || profile?.phone || ""));
      setRider(rider);
      setAdmin(!!admin);
      setPreview(!!preview);
    });
  }, []);

  async function save() {
    if (preview) {
      Alert.alert("Saved", "Name and address kept on this device for preview.");
      return;
    }
    const { data } = await supabase.auth.getUser();
    if (!data.user) return;
    const { error } = await supabase.from("profiles").update({ full_name: name, address_text: address }).eq("user_id", data.user.id);
    if (error) Alert.alert("Save failed", error.message);
    else Alert.alert("Saved");
  }

  return (
    <DarkScreen>
      <AppHeader title="Account" onMenu={() => router.push("/(customer)/menu")} />
      <View style={{ padding: 20 }}>
        <Text style={{ color: "#fff", fontFamily: fonts.display, fontSize: 28 }}>Account</Text>
        {phone ? (
          <Text style={{ color: "#8A8A8A", fontFamily: fonts.body, marginTop: 6, marginBottom: 16 }}>{phone}</Text>
        ) : (
          <View style={{ height: 16 }} />
        )}
        <DarkField value={name} onChangeText={setName} placeholder="Full name" />
        <DarkField value={address} onChangeText={setAddress} placeholder="Default address" />
        <GoldButton label="Save" onPress={save} />
        <View style={{ height: 20 }} />
        {rider?.status === "APPROVED" && (
          <GoldButton label="Open rider mode" onPress={() => router.push("/(rider)")} />
        )}
        {rider?.status === "PENDING" && (
          <Text style={{ color: colors.gold, fontFamily: fonts.body, marginBottom: 12 }}>
            Rider application is pending review.
          </Text>
        )}
        {!rider && (
          <GoldButton label="Apply to become a rider" onPress={() => router.push("/auth/rider-apply")} />
        )}
        <View style={{ height: 12 }} />
        {admin && <GoldButton label="Admin" onPress={() => router.push("/admin")} />}
        <View style={{ height: 12 }} />
        <GoldButton
          label="Log out"
          onPress={async () => {
            await signOutApp();
            router.replace("/");
          }}
        />
      </View>
    </DarkScreen>
  );
}
