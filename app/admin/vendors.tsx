import { useEffect, useState } from "react";
import { Alert, ScrollView, Text, View } from "react-native";
import { supabase } from "@/lib/supabase";
import { colors, radius } from "@/lib/theme";
import { Field, PrimaryButton } from "@/components/ui";

export default function Vendors() {
  const [rows, setRows] = useState<any[]>([]);
  const [markets, setMarkets] = useState<any[]>([]);
  const [name, setName] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [marketId, setMarketId] = useState("");

  async function load() {
    const { data } = await supabase.from("vendors").select("*, markets(name)").order("name");
    setRows(data || []);
    const { data: m } = await supabase.from("markets").select("*").order("sort_order");
    setMarkets(m || []);
    if (m?.[0]) setMarketId(m[0].id);
  }
  useEffect(() => { load(); }, []);

  async function add() {
    const { error } = await supabase.from("vendors").insert({
      name, whatsapp, phone: whatsapp, market_id: marketId, is_active: true, is_available: true,
    });
    if (error) return Alert.alert("Vendor", error.message);
    setName("");
    load();
  }

  async function toggle(v: any) {
    await supabase.from("vendors").update({ is_available: !v.is_available }).eq("id", v.id);
    load();
  }

  return (
    <ScrollView style={{ flex: 1, backgroundColor: colors.cream }} contentContainerStyle={{ padding: 16 }}>
      <Text style={{ fontWeight: "800", fontSize: 18 }}>Add vendor</Text>
      <Field value={name} onChangeText={setName} placeholder="Vendor name" />
      <View style={{ height: 8 }} />
      <Field value={whatsapp} onChangeText={setWhatsapp} placeholder="WhatsApp 2609..." />
      <Text style={{ marginVertical: 8, color: colors.muted }}>Market: tap a market below</Text>
      {markets.map((m) => (
        <Text key={m.id} onPress={() => setMarketId(m.id)} style={{ fontWeight: marketId === m.id ? "800" : "500", marginBottom: 4 }}>
          {m.name}
        </Text>
      ))}
      <PrimaryButton label="Save vendor" onPress={add} />
      <View style={{ height: 16 }} />
      {rows.map((v) => (
        <View key={v.id} style={{ backgroundColor: "#fff", borderRadius: radius.md, padding: 12, marginBottom: 8 }}>
          <Text style={{ fontWeight: "800" }}>{v.name}</Text>
          <Text style={{ color: colors.muted }}>{v.markets?.name} · {v.whatsapp}</Text>
          <Text onPress={() => toggle(v)} style={{ marginTop: 6 }}>{v.is_available ? "Available" : "Unavailable"}</Text>
        </View>
      ))}
    </ScrollView>
  );
}
