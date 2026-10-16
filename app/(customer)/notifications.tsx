import { useCallback, useState } from "react";
import { Alert, Pressable, RefreshControl, ScrollView, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { router, useFocusEffect } from "expo-router";
import { supabase } from "@/lib/supabase";
import { fonts, ui } from "@/lib/theme";

type Note = { id: string; title: string; body: string; created_at?: string };

export default function Notifications() {
  const [items, setItems] = useState<Note[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const { data: user } = await supabase.auth.getUser();
    if (!user.user) {
      setItems([]);
      setLoading(false);
      return;
    }
    const { data } = await supabase
      .from("user_notifications")
      .select("id, title, body, created_at")
      .eq("user_id", user.user.id)
      .order("created_at", { ascending: false })
      .limit(50);
    setItems(data || []);
    setLoading(false);
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  function remove(id: string) {
    Alert.alert("Delete notification", "Remove this card?", [
      { text: "No", style: "cancel" },
      { text: "Yes", style: "destructive", onPress: async () => {
        setItems((list) => list.filter((x) => x.id !== id));
        await supabase.from("user_notifications").delete().eq("id", id);
      }},
    ]);
  }

  return (
    <View style={{ flex: 1, backgroundColor: "#FFF0E6" }}>
      <View style={{ flexDirection: "row", alignItems: "center", padding: 16, gap: 10 }}>
        <Pressable onPress={() => router.back()} hitSlop={10}>
          <Ionicons name="chevron-back" size={24} color={ui.ink} />
        </Pressable>
        <Text style={{ fontFamily: fonts.title, fontSize: 20, color: ui.ink }}>Notifications</Text>
      </View>
      <ScrollView
        contentContainerStyle={{ padding: 16 }}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={load} />}
      >
        {items.length === 0 && !loading ? (
          <Text style={{ fontFamily: fonts.body, color: ui.sub }}>No notifications yet.</Text>
        ) : (
          items.map((n) => (
            <Pressable
              key={n.id}
              onLongPress={() => remove(n.id)}
              style={{ backgroundColor: "#fff", borderRadius: 14, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: "#EEEDF0" }}
            >
              <Text style={{ fontFamily: fonts.title, fontSize: 16, color: ui.ink }}>{n.title}</Text>
              <Text style={{ fontFamily: fonts.body, color: ui.sub, marginTop: 4 }}>{n.body}</Text>
              <Text style={{ fontFamily: fonts.body, fontSize: 11, color: ui.hint, marginTop: 8 }}>Hold to delete</Text>
            </Pressable>
          ))
        )}
      </ScrollView>
    </View>
  );
}
