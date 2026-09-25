import { useEffect, useState } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import { Image } from "expo-image";
import { router, useLocalSearchParams } from "expo-router";
import { supabase } from "@/lib/supabase";
import { colors, radius } from "@/lib/theme";
import { formatKw } from "@/lib/lipila";

export default function Market() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [market, setMarket] = useState<any>(null);
  const [categories, setCategories] = useState<any[]>([]);
  const [active, setActive] = useState<string | null>(null);
  const [meals, setMeals] = useState<any[]>([]);

  useEffect(() => {
    supabase.from("markets").select("*").eq("id", id).single().then(({ data }) => setMarket(data));
    supabase.from("categories").select("*").order("sort_order").then(({ data }) => setCategories(data || []));
    supabase.from("meals").select("*").eq("is_available", true).then(({ data }) => setMeals(data || []));
  }, [id]);

  const shown = active ? meals.filter((m) => m.category_id === active) : [];

  return (
    <ScrollView style={{ flex: 1, backgroundColor: "#F4F6F3" }} contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>
      <Text style={{ fontSize: 24, fontWeight: "800" }}>{market?.name}</Text>
      <Text style={{ color: colors.muted, marginBottom: 14 }}>Categories</Text>
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 12 }}>
        {categories.map((c) => (
          <Pressable
            key={c.id}
            onPress={() => setActive(c.id)}
            style={{
              width: "47%",
              borderRadius: radius.md,
              overflow: "hidden",
              backgroundColor: "#fff",
              borderWidth: active === c.id ? 2 : 0,
              borderColor: colors.gold,
            }}
          >
            <Image source={{ uri: c.image_url }} style={{ height: 92, width: "100%" }} contentFit="cover" />
            <Text style={{ fontWeight: "800", padding: 10 }}>{c.name}</Text>
          </Pressable>
        ))}
      </View>
      {active && (
        <View style={{ marginTop: 18 }}>
          {shown.map((meal) => (
            <Pressable
              key={meal.id}
              onPress={() =>
                router.push({
                  pathname: "/(customer)/meal/[id]",
                  params: { id: meal.id, marketId: String(id), marketName: market?.name },
                })
              }
              style={{ flexDirection: "row", backgroundColor: "#fff", borderRadius: radius.md, overflow: "hidden", marginBottom: 12 }}
            >
              <Image source={{ uri: meal.image_url }} style={{ width: 92, height: 92 }} contentFit="cover" />
              <View style={{ flex: 1, padding: 12 }}>
                <Text style={{ fontWeight: "800" }}>{meal.name}</Text>
                <Text numberOfLines={2} style={{ color: colors.muted, marginTop: 4 }}>{meal.description}</Text>
                <Text style={{ marginTop: 6, fontWeight: "800" }}>{formatKw(meal.price)}</Text>
              </View>
            </Pressable>
          ))}
        </View>
      )}
    </ScrollView>
  );
}
