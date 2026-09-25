import { useEffect, useState } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import { Image } from "expo-image";
import { router } from "expo-router";
import { supabase } from "@/lib/supabase";
import { fonts, radius } from "@/lib/theme";

export default function Markets() {
  const [markets, setMarkets] = useState<any[]>([]);
  useEffect(() => {
    supabase.from("markets").select("*").eq("is_active", true).order("sort_order").then(({ data }) => setMarkets(data || []));
  }, []);

  return (
    <ScrollView style={{ flex: 1, backgroundColor: "#F4F6F3" }} contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>
      {markets.map((m) => (
        <Pressable
          key={m.id}
          onPress={() => router.push(`/(customer)/market/${m.id}`)}
          style={{ marginBottom: 14, borderRadius: radius.lg, overflow: "hidden", height: 168 }}
        >
          <Image source={{ uri: m.image_url }} style={{ height: 168, width: "100%" }} contentFit="cover" />
          <View
            style={{
              position: "absolute",
              left: 0,
              right: 0,
              bottom: 0,
              top: 0,
              backgroundColor: "rgba(0,0,0,0.28)",
              justifyContent: "flex-end",
              padding: 18,
            }}
          >
            <Text style={{ color: "#fff", fontSize: 30, fontFamily: fonts.display }}>{m.name}</Text>
          </View>
        </Pressable>
      ))}
    </ScrollView>
  );
}
