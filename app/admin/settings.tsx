import { useEffect, useState } from "react";
import { Alert, View } from "react-native";
import { supabase } from "@/lib/supabase";
import { Field, PrimaryButton, Screen, Title } from "@/components/ui";

export default function Fees() {
  const [platform, setPlatform] = useState("10");
  const [bike, setBike] = useState("15");
  const [moto, setMoto] = useState("25");

  useEffect(() => {
    supabase.from("settings").select("*").eq("id", 1).single().then(({ data }) => {
      if (!data) return;
      setPlatform(String(data.platform_fee));
      setBike(String(data.bicycle_delivery_fee));
      setMoto(String(data.motorbike_delivery_fee));
    });
  }, []);

  async function save() {
    const { error } = await supabase.from("settings").update({
      platform_fee: Number(platform),
      bicycle_delivery_fee: Number(bike),
      motorbike_delivery_fee: Number(moto),
    }).eq("id", 1);
    if (error) Alert.alert("Fees", error.message);
    else Alert.alert("Saved");
  }

  return (
    <Screen>
      <Title>Fees</Title>
      <View style={{ height: 16 }} />
      <Field value={platform} onChangeText={setPlatform} placeholder="Platform fee" keyboardType="decimal-pad" />
      <View style={{ height: 10 }} />
      <Field value={bike} onChangeText={setBike} placeholder="Bicycle delivery fee" keyboardType="decimal-pad" />
      <View style={{ height: 10 }} />
      <Field value={moto} onChangeText={setMoto} placeholder="Motorbike delivery fee" keyboardType="decimal-pad" />
      <View style={{ height: 16 }} />
      <PrimaryButton label="Save fees" onPress={save} />
    </Screen>
  );
}
