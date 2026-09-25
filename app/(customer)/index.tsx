import { useEffect, useState } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import { Image } from "expo-image";
import { router } from "expo-router";
import { supabase } from "@/lib/supabase";
import { colors, radius } from "@/lib/theme";
import { formatKw } from "@/lib/lipila";

export default function Home() {
  const [markets, setMarkets] = useState<any[]>([]);
  const [featured, setFeatured] = useState<any[]>([]);

  useEffect(() => {
    supabase.from("markets").select("*").eq("is_active", true).order("sort_order").then(({ data }) => setMarkets(data || []));
    supabase.from("meals").select("*").eq("is_featured", true).eq("is_available", true).then(({ data }) => setFeatured(data || []));
  }, []);

  return (
    <ScrollView style={{ flex: 1, backgroundColor: "#F4F6F3" }} contentContainerStyle={{ padding: 16, paddingBottom: 36 }}>
      <View style={{ backgroundColor: "#128C3C", borderRadius: 22, padding: 18, marginBottom: 16 }}>
        <Text style={{ color: "#F4A300", fontWeight: "800", fontSize: 18 }}>Matebeto</Text>
        <Text style={{ color: "#fff", fontSize: 22, fontWeight: "800", marginTop: 4 }}>Real Meals,{"\n"}Real Flavours{"\n"}Delivered</Text>
      </View>

      <View style={{ flexDirection: "row", gap: 10 }}>
        {markets.map((m) => (
          <Pressable
            key={m.id}
            onPress={() => router.push(`/(customer)/market/${m.id}`)}
            style={{ flex: 1, borderRadius: 16, overflow: "hidden", backgroundColor: "#fff" }}
          >
            <Image source={{ uri: m.image_url }} style={{ height: 86, width: "100%" }} contentFit="cover" />
            <Text style={{ textAlign: "center", fontWeight: "800", paddingVertical: 8, fontSize: 12 }}>{m.name}</Text>
          </Pressable>
        ))}
      </View>

      <Text style={{ marginTop: 22, marginBottom: 10, fontWeight: "800", fontSize: 16 }}>Featured Meals</Text>
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10 }}>
        {featured.map((meal) => (
          <Pressable
            key={meal.id}
            onPress={() => router.push({ pathname: "/(customer)/meal/[id]", params: { id: meal.id } })}
            style={{ width: "48%", backgroundColor: "#fff", borderRadius: radius.md, overflow: "hidden" }}
          >
            <Image source={{ uri: meal.image_url }} style={{ height: 96, width: "100%" }} contentFit="cover" />
            <View style={{ padding: 10 }}>
              <Text style={{ fontWeight: "800" }} numberOfLines={1}>{meal.name}</Text>
              <Text style={{ color: colors.goldDeep, fontWeight: "800", marginTop: 2 }}>{formatKw(meal.price)}</Text>
            </View>
          </Pressable>
        ))}
      </View>
    </ScrollView>
  );
}
