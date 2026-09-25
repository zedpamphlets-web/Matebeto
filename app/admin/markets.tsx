import { useEffect, useState } from "react";
import { Alert, Pressable, ScrollView, Text, View } from "react-native";
import { supabase } from "@/lib/supabase";
import { colors, fonts, radius } from "@/lib/theme";
import { Field, PrimaryButton } from "@/components/ui";

export default function AdminMarkets() {
  const [rows, setRows] = useState<any[]>([]);
  const [name, setName] = useState("");
  const [image, setImage] = useState("");

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
      image_url: image.trim() || null,
      is_active: true,
      sort_order: rows.length + 1,
    });
    if (error) return Alert.alert("Market", error.message);
    setName("");
    setImage("");
    load();
  }

  async function toggle(m: any) {
    const { error } = await supabase.from("markets").update({ is_active: !m.is_active }).eq("id", m.id);
    if (error) Alert.alert("Market", error.message);
    load();
  }

  async function saveImage(m: any, url: string) {
    const { error } = await supabase.from("markets").update({ image_url: url.trim() || null }).eq("id", m.id);
    if (error) Alert.alert("Market", error.message);
    load();
  }

  return (
    <ScrollView style={{ flex: 1, backgroundColor: colors.cream }} contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>
      <Text style={{ fontFamily: fonts.title, fontSize: 18, marginBottom: 8 }}>Add market</Text>
      <Text style={{ color: colors.muted, fontFamily: fonts.body, marginBottom: 10 }}>
        Launch markets are Thornpark, Longacres and Olympia. Add more here when you expand. Use a real photo URL you own — not a random stock image.
      </Text>
      <Field value={name} onChangeText={setName} placeholder="Market name" />
      <View style={{ height: 8 }} />
      <Field value={image} onChangeText={setImage} placeholder="Photo URL (optional)" />
      <View style={{ height: 10 }} />
      <PrimaryButton label="Save market" onPress={add} />
      <View style={{ height: 18 }} />
      {rows.map((m) => (
        <MarketRow key={m.id} market={m} onToggle={() => toggle(m)} onSaveImage={(url) => saveImage(m, url)} />
      ))}
    </ScrollView>
  );
}

function MarketRow({
  market,
  onToggle,
  onSaveImage,
}: {
  market: any;
  onToggle: () => void;
  onSaveImage: (url: string) => void;
}) {
  const [url, setUrl] = useState(market.image_url || "");
  return (
    <View style={{ backgroundColor: "#fff", borderRadius: radius.md, padding: 12, marginBottom: 8 }}>
      <Text style={{ fontFamily: fonts.title }}>{market.name}</Text>
      <Text style={{ color: colors.muted, fontFamily: fonts.body }}>{market.is_active ? "Active" : "Hidden"}</Text>
      <View style={{ height: 8 }} />
      <Field value={url} onChangeText={setUrl} placeholder="Photo URL" />
      <View style={{ height: 8 }} />
      <PrimaryButton label="Save photo" onPress={() => onSaveImage(url)} />
      <Pressable onPress={onToggle} style={{ marginTop: 10 }}>
        <Text style={{ fontFamily: fonts.bodySemi, color: colors.customerDeep }}>
          {market.is_active ? "Hide market" : "Show market"}
        </Text>
      </Pressable>
    </View>
  );
}
