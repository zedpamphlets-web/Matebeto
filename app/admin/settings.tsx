import { useEffect, useState } from "react";
import { Alert, Text, View } from "react-native";
import { router } from "expo-router";
import { supabase } from "@/lib/supabase";
import { Field, PrimaryButton, Screen, Sub, Title } from "@/components/ui";
import { colors } from "@/lib/theme";

export default function Fees() {
  const [platform, setPlatform] = useState("");
  const [bike, setBike] = useState("");
  const [moto, setMoto] = useState("");

  useEffect(() => {
    supabase
      .from("settings")
      .select("*")
      .eq("id", 1)
      .single()
      .then(({ data }) => {
        if (!data) return;
        setPlatform(String(data.platform_fee));
        setBike(String(data.bicycle_delivery_fee));
        setMoto(String(data.motorbike_delivery_fee));
      });
  }, []);

  async function save() {
    const { error } = await supabase
      .from("settings")
      .update({
        platform_fee: Number(platform),
        bicycle_delivery_fee: Number(bike),
        motorbike_delivery_fee: Number(moto),
      })
      .eq("id", 1);
    if (error) Alert.alert("Fees", error.message);
    else Alert.alert("Saved");
  }

  return (
    <Screen>
      <Title>Fees</Title>
      <Sub>These are the only amounts a customer sees besides food: platform fee and delivery fee.</Sub>
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
    </Screen>
  );
}
