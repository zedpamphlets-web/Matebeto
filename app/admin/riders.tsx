import { useEffect, useState } from "react";
import { Alert, Pressable, ScrollView, Text, View } from "react-native";
import { supabase } from "@/lib/supabase";
import { colors, fonts, radius } from "@/lib/theme";

export default function AdminRiders() {
  const [rows, setRows] = useState<any[]>([]);
  const load = () =>
    supabase
      .from("riders")
      .select("*")
      .order("created_at", { ascending: false })
      .then(({ data }) => setRows(data || []));
  useEffect(() => {
    load();
  }, []);

  async function setStatus(id: string, status: string) {
    const { error } = await supabase.from("riders").update({ status }).eq("id", id);
    if (error) Alert.alert("Rider", error.message);
    load();
  }

  return (
    <ScrollView style={{ flex: 1, backgroundColor: colors.cream }} contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>
      <Text style={{ color: colors.muted, fontFamily: fonts.body, marginBottom: 12 }}>
        Only approved riders can go online and receive jobs. Applications come from the rider form in the app.
      </Text>
      {rows.length === 0 && <Text style={{ color: colors.muted, fontFamily: fonts.body }}>No rider applications yet.</Text>}
      {rows.map((r) => (
        <View key={r.id} style={{ backgroundColor: "#fff", borderRadius: radius.md, padding: 14, marginBottom: 10 }}>
          <Text style={{ fontFamily: fonts.title }}>{r.full_name}</Text>
          <Text style={{ color: colors.muted, fontFamily: fonts.body }}>
            {r.phone} · {r.vehicle_type} · {r.status}
            {r.is_online ? " · online" : ""}
          </Text>
          {r.address_text ? <Text style={{ fontFamily: fonts.body, marginTop: 4 }}>{r.address_text}</Text> : null}
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 10 }}>
            <Pressable onPress={() => setStatus(r.id, "APPROVED")} style={chip(colors.customer)}>
              <Text style={{ color: "#fff", fontFamily: fonts.bodySemi }}>Approve</Text>
            </Pressable>
            <Pressable onPress={() => setStatus(r.id, "REJECTED")} style={chip(colors.danger)}>
              <Text style={{ color: "#fff", fontFamily: fonts.bodySemi }}>Reject</Text>
            </Pressable>
            <Pressable onPress={() => setStatus(r.id, "SUSPENDED")} style={chip(colors.ink)}>
              <Text style={{ color: "#fff", fontFamily: fonts.bodySemi }}>Suspend</Text>
            </Pressable>
          </View>
        </View>
      ))}
    </ScrollView>
  );
}

function chip(bg: string) {
  return { backgroundColor: bg, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10 };
}
