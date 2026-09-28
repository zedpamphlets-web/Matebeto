import { useEffect, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { router } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";
import { Photo } from "@/components/photo";
import { supabase } from "@/lib/supabase";
import { colors, fonts, radius } from "@/lib/theme";

export default function Markets() {
  const [markets, setMarkets] = useState<any[]>([]);
  useEffect(() => {
    supabase
      .from("markets")
      .select("*")
      .eq("is_active", true)
      .order("sort_order")
      .then(({ data }) => setMarkets(data || []));
  }, []);

  return (
    <View style={styles.root}>
      <LinearGradient colors={["#1B5E20", "#2E7D32", "#81C784"]} style={StyleSheet.absoluteFill} />
      <SafeAreaView edges={["top"]} style={{ flex: 1 }}>
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} style={styles.menuBtn}>
            <Ionicons name="arrow-back" size={22} color="#fff" />
          </Pressable>
          <Text style={styles.title}>Choose Your Market</Text>
          <Pressable onPress={() => router.push("/(customer)/menu")} style={styles.menuBtn}>
            <Ionicons name="person" size={20} color="#fff" />
          </Pressable>
        </View>

        <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 48 }}>
          {markets.length === 0 && (
            <View style={styles.empty}>
              <Text style={styles.emptyText}>
                No markets yet. Admin adds Thornpark, Longacres and Olympia from the back office.
              </Text>
            </View>
          )}
          {markets.map((m) => (
            <Pressable
              key={m.id}
              onPress={() => router.push(`/(customer)/market/${m.id}`)}
              style={styles.card}
            >
              <Photo uri={m.image_url} name={m.name} height={168} overlay />
              <View style={styles.cardFooter}>
                <Text style={styles.cardName}>{m.name}</Text>
                {m.area ? <Text style={styles.cardArea}>{m.area}</Text> : null}
              </View>
            </Pressable>
          ))}
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 14,
    paddingBottom: 10,
  },
  menuBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(0,0,0,0.25)",
    alignItems: "center",
    justifyContent: "center",
  },
  title: { color: "#fff", fontFamily: fonts.title, fontSize: 18 },
  empty: {
    backgroundColor: "rgba(255,255,255,0.92)",
    borderRadius: radius.lg,
    padding: 18,
  },
  emptyText: { color: colors.muted, fontFamily: fonts.body, lineHeight: 22 },
  card: {
    marginBottom: 14,
    borderRadius: radius.lg,
    overflow: "hidden",
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.4)",
  },
  cardFooter: {
    backgroundColor: "#fff",
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  cardName: { fontFamily: fonts.display, fontSize: 16, color: colors.ink },
  cardArea: { fontFamily: fonts.body, fontSize: 13, color: colors.muted, marginTop: 2 },
});
