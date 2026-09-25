import { useEffect, useState } from "react";
import { Alert, Pressable, ScrollView, Text, View } from "react-native";
import { supabase } from "@/lib/supabase";
import { colors, fonts, radius } from "@/lib/theme";
import { Field, PrimaryButton } from "@/components/ui";
import { PhotoPicker } from "@/components/photo-picker";

export default function AdminMarkets() {
  const [rows, setRows] = useState<any[]>([]);
  const [name, setName] = useState("");
  const [image, setImage] = useState<string | null>(null);

  async function load() {
    const { data } = await supabase.from("markets").select("*").order("sort_order");
    setRows(data || []);
  }
  useEffect(() => {
    load();
  }, []);

  async function add() {
    if (!name.trim()) return Alert.alert("Market", "Name is required.");
    const slug = name.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-");
    const { error } = await supabase.from("markets").insert({
      name: name.trim(),
      slug,
      image_url: image,
      is_active: true,
      sort_order: rows.length + 1,
    });
    if (error) return Alert.alert("Market", error.message);
    setName("");
    setImage(null);
    load();
  }

  async function toggle(m: any) {
    const { error } = await supabase.from("markets").update({ is_active: !m.is_active }).eq("id", m.id);
    if (error) Alert.alert("Market", error.message);
    load();
  }

  async function saveImage(m: any, url: string | null) {
    const { error } = await supabase.from("markets").update({ image_url: url }).eq("id", m.id);
    if (error) Alert.alert("Market", error.message);
    load();
  }

  return (
    <ScrollView style={{ flex: 1, backgroundColor: colors.cream }} contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>
      <Text style={{ fontFamily: fonts.title, fontSize: 18, marginBottom: 8 }}>Add market</Text>
      <Text style={{ color: colors.muted, fontFamily: fonts.body, marginBottom: 10 }}>
        Launch markets are Thornpark, Longacres and Olympia. Add more here when you expand. Upload food photos from the
        phone — do not paste a random stock URL.
      </Text>
      <Field value={name} onChangeText={setName} placeholder="Market name" />
      <View style={{ height: 10 }} />
      <PhotoPicker folder="markets" uri={image} name={name || "Market"} onChange={setImage} />
      <PrimaryButton label="Save market" onPress={add} />
      <View style={{ height: 18 }} />
      {rows.map((m) => (
        <View key={m.id} style={{ backgroundColor: "#fff", borderRadius: radius.md, padding: 12, marginBottom: 10 }}>
          <Text style={{ fontFamily: fonts.title }}>{m.name}</Text>
          <Text style={{ color: colors.muted, fontFamily: fonts.body, marginBottom: 8 }}>
            {m.is_active ? "Active" : "Hidden"}
          </Text>
          <PhotoPicker folder={`markets/${m.id}`} uri={m.image_url} name={m.name} onChange={(url) => saveImage(m, url)} />
          <Pressable onPress={() => toggle(m)}>
            <Text style={{ fontFamily: fonts.bodySemi, color: colors.customerDeep }}>
              {m.is_active ? "Hide market" : "Show market"}
            </Text>
          </Pressable>
        </View>
      ))}
    </ScrollView>
  );
}
