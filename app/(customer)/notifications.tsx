import { useCallback, useState } from "react";
import { Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "expo-router";
import { MkHeader, MkScreen } from "@/components/mk";
import { LoadingBlock } from "@/components/spinner";
import { confirmDialog } from "@/components/confirm";
import { supabase } from "@/lib/supabase";
import { fonts, ui } from "@/lib/theme";

type Note = { id: string; title: string; body: string; created_at?: string };

export default function Notifications() {
  const [items, setItems] = useState<Note[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async (pull = false) => {
    if (pull) setRefreshing(true);
    const { data: user } = await supabase.auth.getUser();
    if (!user.user) {
      setItems([]);
    } else {
      const { data } = await supabase
        .from("user_notifications")
        .select("id, title, body, created_at")
        .eq("user_id", user.user.id)
        .order("created_at", { ascending: false })
        .limit(50);
      setItems(data || []);
      if (data && data.length) supabase.rpc("mark_notifications_read").then(() => {});
    }
    setLoading(false);
    setRefreshing(false);
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  async function remove(id: string) {
    const ok = await confirmDialog({
      title: "Delete notification?",
      message: "Are you sure you want to delete this notification?",
      confirmLabel: "Delete",
      destructive: true,
    });
    if (!ok) return;
    setItems((list) => list.filter((x) => x.id !== id));
    await supabase.from("user_notifications").delete().eq("id", id);
  }

  return (
    <MkScreen>
      <MkHeader title="Notifications" />
      {loading ? (
        <LoadingBlock minHeight={400} />
      ) : (
        <ScrollView
          contentContainerStyle={{ padding: 16, flexGrow: 1 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => load(true)} />}
        >
          {items.length === 0 ? (
            <View style={s.empty}>
              <View style={s.emptyIcon}>
                <Ionicons name="notifications-outline" size={34} color={ui.red} />
              </View>
              <Text style={s.emptyTitle}>No notifications yet</Text>
            </View>
          ) : (
            items.map((n) => (
              <View key={n.id} style={s.card}>
                <View style={{ flex: 1 }}>
                  <Text style={s.title}>{n.title}</Text>
                  <Text style={s.body}>{n.body}</Text>
                </View>
                <Pressable onPress={() => remove(n.id)} hitSlop={10} accessibilityLabel="Delete notification">
                  <Ionicons name="trash-outline" size={20} color={ui.hint} />
                </Pressable>
              </View>
            ))
          )}
        </ScrollView>
      )}
    </MkScreen>
  );
}

const s = StyleSheet.create({
  empty: { flex: 1, alignItems: "center", justifyContent: "center", paddingBottom: 80 },
  emptyIcon: { width: 76, height: 76, borderRadius: 38, backgroundColor: ui.redSoft, alignItems: "center", justifyContent: "center", marginBottom: 14 },
  emptyTitle: { fontFamily: fonts.title, fontSize: 17, color: ui.ink },
  card: { flexDirection: "row", alignItems: "flex-start", gap: 10, backgroundColor: "#fff", borderRadius: 14, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: ui.line },
  title: { fontFamily: fonts.title, fontSize: 16, color: ui.ink },
  body: { fontFamily: fonts.body, fontSize: 14.5, lineHeight: 21, color: ui.sub, marginTop: 4 },
});
