import { useEffect, useState } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import { router } from "expo-router";
import { Photo } from "@/components/photo";
import { supabase } from "@/lib/supabase";
import { colors, fonts, radius } from "@/lib/theme";

export default function Markets() {
  const [markets, setMarkets] = useState<any[]>([]);
  useEffect(() => {
    supabase.from("markets").select("*").eq("is_active", true).order("sort_order").then(({ data }) => setMarkets(data || []));
  }, []);

  return (
    <ScrollView style={{ flex: 1, backgroundColor: colors.wash }} contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>
      {markets.length === 0 && (
        <Text style={{ color: colors.muted, fontFamily: fonts.body }}>No markets yet. Admin adds them from the back office.</Text>
      )}
      {markets.map((m) => (
        <Pressable
          key={m.id}
          onPress={() => router.push(`/(customer)/market/${m.id}`)}
          style={{ marginBottom: 14, borderRadius: radius.lg, overflow: "hidden", height: 168 }}
        >
          <Photo uri={m.image_url} name={m.name} height={168} />
          <View
            style={{
              position: "absolute",
              left: 0,
              right: 0,
              bottom: 0,
              padding: 18,
              backgroundColor: "rgba(0,0,0,0.35)",
            }}
          >
            <Text style={{ color: "#fff", fontSize: 30, fontFamily: fonts.display }}>{m.name}</Text>
          </View>
        </Pressable>
      ))}
    </ScrollView>
  );
}
