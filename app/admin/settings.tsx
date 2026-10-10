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
  const [banners, setBanners] = useState<any[]>([]);
  const [newTitle, setNewTitle] = useState("");
  const [newAmount, setNewAmount] = useState("");
  const [newImage, setNewImage] = useState<string | null>(null);

  async function load() {
    const { data } = await supabase.from("settings").select("*").eq("id", 1).single();
    if (data) {
      setPlatform(String(data.platform_fee));
      setBike(String(data.bicycle_delivery_fee));
      setMoto(String(data.motorbike_delivery_fee));
    }
    const { data: b } = await supabase.from("banners").select("*").order("sort_order");
    setBanners(b || []);
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

  async function addBanner() {
    if (!newTitle.trim()) return Alert.alert("Banner", "Title is required.");
    const { error } = await supabase.from("banners").insert({
      title: newTitle.trim(),
      amount: newAmount ? Number(newAmount) : null,
      image_url: newImage,
      sort_order: banners.length + 1,
      is_active: true,
    });
    if (error) return Alert.alert("Banner", error.message);
    setNewTitle("");
    setNewAmount("");
    setNewImage(null);
    load();
  }

  async function deleteBanner(id: string) {
    const { error } = await supabase.from("banners").delete().eq("id", id);
    if (error) Alert.alert("Banner", error.message);
    load();
  }

  return (
    <ScrollView style={{ flex: 1, backgroundColor: colors.adminBg }} contentContainerStyle={{ padding: 20, paddingBottom: 40 }}>
      <Text style={{ fontFamily: fonts.display, fontSize: 28, color: colors.adminText }}>Home & fees</Text>
      <Text style={{ color: colors.adminMuted, fontFamily: fonts.body, marginTop: 6, lineHeight: 22 }}>
        Upload the home banner food photo from your phone. Customers only see food total, platform fee and delivery fee.
      </Text>
      <View style={{ height: 16 }} />
      <Text style={{ fontFamily: fonts.title, marginBottom: 8 }}>Banners (auto-swap every 10s)</Text>
      {banners.map((b) => (
        <View key={b.id} style={{ marginBottom: 12, backgroundColor: colors.adminCard, padding: 10, borderRadius: 12 }}>
          <Text style={{ color: colors.adminText, fontFamily: fonts.title }}>{b.title} {b.amount != null ? `· ${b.amount}` : ""}</Text>
          <PrimaryButton label="Delete" onPress={() => deleteBanner(b.id)} />
        </View>
      ))}
      <Field value={newTitle} onChangeText={setNewTitle} placeholder="Banner title / text" />
      <View style={{ height: 8 }} />
      <Field value={newAmount} onChangeText={setNewAmount} placeholder="Amount (optional)" keyboardType="decimal-pad" />
      <View style={{ height: 8 }} />
      <PhotoPicker folder="banner" uri={newImage} name="Banner image" onChange={setNewImage} height={120} />
      <View style={{ height: 8 }} />
      <PrimaryButton label="Add banner" onPress={addBanner} />
      <View style={{ height: 16 }} />
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
