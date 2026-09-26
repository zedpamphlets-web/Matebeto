import { useEffect, useState } from "react";
import { Pressable, ScrollView, Text } from "react-native";
import { router } from "expo-router";
import { Photo } from "@/components/photo";
import { AppHeader, DarkScreen } from "@/components/app-shell";
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
    <DarkScreen>
      <AppHeader title="Choose Your Market" onMenu={() => router.push("/(customer)/menu")} />
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>
        {markets.length === 0 && (
          <Text style={{ color: "#8A8A8A", fontFamily: fonts.body }}>No markets yet. Admin adds them from the back office.</Text>
        )}
        {markets.map((m) => (
          <Pressable
            key={m.id}
            onPress={() => router.push(`/(customer)/market/${m.id}`)}
            style={{
              marginBottom: 14,
              borderRadius: radius.lg,
              overflow: "hidden",
              height: 176,
              borderWidth: 1,
              borderColor: "rgba(255,255,255,0.1)",
            }}
          >
            <Photo uri={m.image_url} name={m.name} height={176} overlay />
          </Pressable>
        ))}
      </ScrollView>
    </DarkScreen>
  );
}
