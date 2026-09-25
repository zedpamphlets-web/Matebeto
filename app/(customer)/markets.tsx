import { useEffect, useState } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import { Image } from "expo-image";
import { router } from "expo-router";
import { supabase } from "@/lib/supabase";
import { radius } from "@/lib/theme";

export default function Markets() {
  const [markets, setMarkets] = useState<any[]>([]);
  useEffect(() => {
    supabase.from("markets").select("*").eq("is_active", true).order("sort_order").then(({ data }) => setMarkets(data || []));
  }, []);

  return (
    <ScrollView style={{ flex: 1, backgroundColor: "#F4F6F3" }} contentContainerStyle={{ padding: 16 }}>
      <Text style={{ fontSize: 24, fontWeight: "800", marginBottom: 14 }}>Choose Your Market</Text>
      {markets.map((m) => (
        <Pressable
          key={m.id}
          onPress={() => router.push(`/(customer)/market/${m.id}`)}
          style={{ marginBottom: 14, borderRadius: radius.lg, overflow: "hidden" }}
        >
          <Image source={{ uri: m.image_url }} style={{ height: 150, width: "100%" }} contentFit="cover" />
          <View style={{ position: "absolute", left: 16, bottom: 16 }}>
            <Text style={{ color: "#fff", fontSize: 28, fontWeight: "800" }}>{m.name}</Text>
          </View>
        </Pressable>
      ))}
    </ScrollView>
  );
}
