import { useEffect, useState } from "react";
import { Alert, ScrollView, Text, View } from "react-native";
import { router } from "expo-router";
import { supabase } from "@/lib/supabase";
import { Field, PrimaryButton } from "@/components/ui";
import { PhotoPicker } from "@/components/photo-picker";
import { colors, fonts } from "@/lib/theme";

export default function Fees() {
  const [platform, setPlatform] = useState("");
  const [bike, setBike] = useState("");
  const [moto, setMoto] = useState("");
  const [banner, setBanner] = useState<string | null>(null);

  async function load() {
    const { data } = await supabase.from("settings").select("*").eq("id", 1).single();
    if (!data) return;
    setPlatform(String(data.platform_fee));
    setBike(String(data.bicycle_delivery_fee));
    setMoto(String(data.motorbike_delivery_fee));
    setBanner(data.home_banner_url || null);
  }

  useEffect(() => {
    load();
  }, []);

  async function save() {
    const { error } = await supabase
      .from("settings")
      .update({
        platform_fee: Number(platform),
        bicycle_delivery_fee: Number(bike),
        motorbike_delivery_fee: Number(moto),
        home_banner_url: banner,
      })
      .eq("id", 1);
    if (error) Alert.alert("Settings", error.message);
    else Alert.alert("Saved");
  }

  async function saveBanner(url: string | null) {
    setBanner(url);
    const { error } = await supabase.from("settings").update({ home_banner_url: url }).eq("id", 1);
    if (error) Alert.alert("Banner", error.message);
  }

  return (
    <ScrollView style={{ flex: 1, backgroundColor: colors.cream }} contentContainerStyle={{ padding: 20, paddingBottom: 40 }}>
      <Text style={{ fontFamily: fonts.display, fontSize: 28 }}>Home & fees</Text>
      <Text style={{ color: colors.muted, fontFamily: fonts.body, marginTop: 6, lineHeight: 22 }}>
        Upload the home banner food photo from your phone. Customers only see food total, platform fee and delivery fee.
      </Text>
      <View style={{ height: 16 }} />
      <Text style={{ fontFamily: fonts.title, marginBottom: 8 }}>Home banner</Text>
      <PhotoPicker folder="banner" uri={banner} name="Home banner" onChange={saveBanner} height={160} />
      <Field value={platform} onChangeText={setPlatform} placeholder="Platform fee" keyboardType="decimal-pad" />
      <View style={{ height: 10 }} />
      <Field value={bike} onChangeText={setBike} placeholder="Bicycle delivery fee" keyboardType="decimal-pad" />
      <View style={{ height: 10 }} />
      <Field value={moto} onChangeText={setMoto} placeholder="Motorbike delivery fee" keyboardType="decimal-pad" />
      <View style={{ height: 16 }} />
      <PrimaryButton label="Save fees" onPress={save} />
      <View style={{ height: 20 }} />
      <PrimaryButton
        label="Open customer app"
        color={colors.customer}
        textColor="#fff"
        onPress={() => router.push("/(customer)")}
      />
    </ScrollView>
  );
}
