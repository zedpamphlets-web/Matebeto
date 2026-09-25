import { useEffect, useState } from "react";
import { Alert, ScrollView, Text, View } from "react-native";
import { supabase } from "@/lib/supabase";
import { colors, radius } from "@/lib/theme";

export default function AdminRiders() {
  const [rows, setRows] = useState<any[]>([]);
  const load = () => supabase.from("riders").select("*").order("created_at", { ascending: false }).then(({ data }) => setRows(data || []));
  useEffect(() => { load(); }, []);

  async function setStatus(id: string, status: string) {
    const { error } = await supabase.from("riders").update({ status }).eq("id", id);
    if (error) Alert.alert("Rider", error.message);
    load();
  }

  return (
    <ScrollView style={{ flex: 1, backgroundColor: colors.cream }} contentContainerStyle={{ padding: 16 }}>
      {rows.map((r) => (
        <View key={r.id} style={{ backgroundColor: "#fff", borderRadius: radius.md, padding: 14, marginBottom: 10 }}>
          <Text style={{ fontWeight: "800" }}>{r.full_name}</Text>
          <Text style={{ color: colors.muted }}>{r.phone} · {r.vehicle_type} · {r.status}</Text>
          <Text onPress={() => setStatus(r.id, "APPROVED")} style={{ marginTop: 8 }}>Approve</Text>
          <Text onPress={() => setStatus(r.id, "REJECTED")}>Reject</Text>
          <Text onPress={() => setStatus(r.id, "SUSPENDED")}>Suspend</Text>
        </View>
      ))}
    </ScrollView>
  );
}
