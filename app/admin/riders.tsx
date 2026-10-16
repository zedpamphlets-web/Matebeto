import { useEffect, useState } from "react";
import { ListSkeleton } from "@/components/skeleton";
import { Alert, Pressable, ScrollView, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
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
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState<string | null>(null);
  const load = () =>
    supabase
      .from("riders")
      .select("*")
      .order("created_at", { ascending: false })
      .then(({ data }) => { setRows(data || []); setLoading(false); });
  useEffect(() => {
    load();
  }, []);

  async function setStatus(id: string, status: string) {
    const { error } = await supabase.from("riders").update({ status }).eq("id", id);
    if (error) Alert.alert("Rider", error.message);
    load();
  }

  function confirmDelete(id: string, name: string) {
    Alert.alert("Delete rider", `Are you sure you want to delete ${name}?`, [
      { text: "No", style: "cancel" },
      { text: "Yes", style: "destructive", onPress: async () => {
        const { error } = await supabase.from("riders").delete().eq("id", id);
        if (error) Alert.alert("Rider", error.message);
        load();
      }},
    ]);
  }

  if (loading && rows.length === 0) return <View style={{ flex: 1, backgroundColor: colors.adminBg, padding: 16 }}><ListSkeleton /></View>;

  return (
    <ScrollView style={{ flex: 1, backgroundColor: colors.adminBg }} contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>
      {rows.length === 0 && <Text style={{ color: colors.adminMuted, fontFamily: fonts.body }}>No rider applications yet.</Text>}
      {rows.map((r) => {
        const expanded = open === r.id;
        const pending = String(r.status || "").toUpperCase() === "PENDING" || !r.status;
        return (
          <View key={r.id} style={{ backgroundColor: "#fff", borderWidth: 1, borderColor: colors.adminCardBorder, borderRadius: 14, padding: 12, marginBottom: 10 }}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
              <View style={{ width: 44, height: 44, borderRadius: 10, overflow: "hidden", backgroundColor: "#F5D0A9" }}>
                <Photo uri={r.photo_url} name={r.full_name} height={44} width={44} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontFamily: fonts.title, color: colors.adminText, fontSize: 15 }}>{r.full_name}</Text>
                <Text style={{ color: colors.adminMuted, fontFamily: fonts.body, fontSize: 12 }}>
                  {r.vehicle_type} · {r.phone}
                </Text>
              </View>
              {pending ? (
                <View style={{ backgroundColor: "#F4B400", paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 }}>
                  <Text style={{ fontFamily: fonts.bodySemi, fontSize: 11, color: "#1C1B26" }}>Pending</Text>
                </View>
              ) : (
                <Text style={{ fontFamily: fonts.bodySemi, fontSize: 11, color: colors.adminMuted }}>{r.status}</Text>
              )}
              <Pressable onPress={() => setOpen(expanded ? null : r.id)} hitSlop={8}>
                <Ionicons name={expanded ? "eye-off" : "eye"} size={22} color={colors.adminText} />
              </Pressable>
            </View>
            {expanded ? (
              <View style={{ marginTop: 12 }}>
                {r.address_text ? <Text style={{ fontFamily: fonts.body, marginBottom: 6 }}>{r.address_text}</Text> : null}
                {(licenceUrl(r, "FRONT") || licenceUrl(r, "BACK")) && (
                  <View style={{ flexDirection: "row", gap: 8, marginBottom: 10 }}>
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
                <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
                  <Pressable onPress={() => setStatus(r.id, "APPROVED")} style={chip(colors.customer)}>
                    <Text style={{ color: "#fff", fontFamily: fonts.bodySemi, fontSize: 13 }}>Approve</Text>
                  </Pressable>
                  <Pressable onPress={() => setStatus(r.id, "REJECTED")} style={chip(colors.danger)}>
                    <Text style={{ color: "#fff", fontFamily: fonts.bodySemi, fontSize: 13 }}>Reject</Text>
                  </Pressable>
                  <Pressable onPress={() => setStatus(r.id, "SUSPENDED")} style={chip(colors.ink)}>
                    <Text style={{ color: "#fff", fontFamily: fonts.bodySemi, fontSize: 13 }}>Suspend</Text>
                  </Pressable>
                  <Pressable onPress={() => confirmDelete(r.id, r.full_name)} style={chip("#6B6A78")}>
                    <Text style={{ color: "#fff", fontFamily: fonts.bodySemi, fontSize: 13 }}>Delete</Text>
                  </Pressable>
                </View>
              </View>
            ) : null}
          </View>
        );
      })}
    </ScrollView>
  );
}

function chip(bg: string) {
  return { backgroundColor: bg, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10 };
}
