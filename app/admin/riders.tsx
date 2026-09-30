import { useEffect, useState } from "react";
import { Alert, Pressable, ScrollView, Text, View } from "react-native";
import { Photo } from "@/components/photo";
import { supabase } from "@/lib/supabase";
import { colors, fonts, radius } from "@/lib/theme";

function licenceUrl(row: any, side: "FRONT" | "BACK") {
  if (side === "FRONT" && row.licence_front_url) return row.licence_front_url;
  if (side === "BACK" && row.licence_back_url) return row.licence_back_url;
  const line = String(row.licence_info || "")
    .split("\n")
    .find((part: string) => part.startsWith(`${side}:`));
  return line ? line.slice(side.length + 1) : null;
}

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
    <ScrollView style={{ flex: 1, backgroundColor: colors.adminBg }} contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>
      {rows.length === 0 && <Text style={{ color: colors.adminMuted, fontFamily: fonts.body }}>No rider applications yet.</Text>}
      {rows.map((r) => (
        <View key={r.id} style={{ backgroundColor: colors.adminCard, borderWidth: 1, borderColor: colors.adminCardBorder, borderRadius: radius.md, padding: 14, marginBottom: 10, flexDirection: "row", gap: 12 }}>
          <View style={{ borderRadius: 16, overflow: "hidden" }}>
            <Photo uri={r.photo_url} name={r.full_name} height={72} width={72} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={{ fontFamily: fonts.title, color: colors.adminText }}>{r.full_name}</Text>
            <Text style={{ color: colors.adminMuted, fontFamily: fonts.body }}>
              {r.phone} · {r.vehicle_type} · {r.status}
              {r.is_online ? " · online" : ""}
            </Text>
            {r.address_text ? <Text style={{ fontFamily: fonts.body, marginTop: 4 }}>{r.address_text}</Text> : null}
            {(licenceUrl(r, "FRONT") || licenceUrl(r, "BACK")) && (
              <View style={{ flexDirection: "row", gap: 8, marginTop: 10 }}>
                {licenceUrl(r, "FRONT") ? (
                  <View style={{ flex: 1, borderRadius: 10, overflow: "hidden" }}>
                    <Photo uri={licenceUrl(r, "FRONT")} name="Front" height={72} />
                  </View>
                ) : null}
                {licenceUrl(r, "BACK") ? (
                  <View style={{ flex: 1, borderRadius: 10, overflow: "hidden" }}>
                    <Photo uri={licenceUrl(r, "BACK")} name="Back" height={72} />
                  </View>
                ) : null}
              </View>
            )}
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
        </View>
      ))}
    </ScrollView>
  );
}

function chip(bg: string) {
  return { backgroundColor: bg, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10 };
}
