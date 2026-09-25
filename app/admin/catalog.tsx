import { useEffect, useState } from "react";
import { Alert, ScrollView, Text, View } from "react-native";
import { supabase } from "@/lib/supabase";
import { colors, radius } from "@/lib/theme";
import { Field, PrimaryButton } from "@/components/ui";

export default function Catalog() {
  const [meals, setMeals] = useState<any[]>([]);
  const [name, setName] = useState("");
  const [price, setPrice] = useState("");
  const [desc, setDesc] = useState("");

  async function load() {
    const { data } = await supabase.from("meals").select("*").order("name");
    setMeals(data || []);
  }
  useEffect(() => { load(); }, []);

  async function add() {
    const { error } = await supabase.from("meals").insert({
      name, description: desc, price: Number(price), is_available: true,
    });
    if (error) return Alert.alert("Meal", error.message);
    setName(""); setPrice(""); setDesc("");
    load();
  }

  async function feature(m: any) {
    await supabase.from("meals").update({ is_featured: !m.is_featured }).eq("id", m.id);
    load();
  }

  return (
    <ScrollView style={{ flex: 1, backgroundColor: colors.cream }} contentContainerStyle={{ padding: 16 }}>
      <Text style={{ fontWeight: "800", fontSize: 18 }}>Add meal</Text>
      <Field value={name} onChangeText={setName} placeholder="Meal name" />
      <View style={{ height: 8 }} />
      <Field value={price} onChangeText={setPrice} placeholder="Price K" keyboardType="decimal-pad" />
      <View style={{ height: 8 }} />
      <Field value={desc} onChangeText={setDesc} placeholder="Description" />
      <View style={{ height: 10 }} />
      <PrimaryButton label="Save meal" onPress={add} />
      <View style={{ height: 16 }} />
      {meals.map((m) => (
        <View key={m.id} style={{ backgroundColor: "#fff", borderRadius: radius.md, padding: 12, marginBottom: 8 }}>
          <Text style={{ fontWeight: "800" }}>{m.name} · K{m.price}</Text>
          <Text onPress={() => feature(m)}>{m.is_featured ? "Featured" : "Not featured"}</Text>
        </View>
      ))}
    </ScrollView>
  );
}
