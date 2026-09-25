import { useEffect, useState } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { Photo } from "@/components/photo";
import { supabase } from "@/lib/supabase";
import { colors, fonts, radius } from "@/lib/theme";
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
    <ScrollView style={{ flex: 1, backgroundColor: colors.wash }} contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>
      <Text style={{ fontSize: 13, fontFamily: fonts.bodySemi, color: colors.muted }}>FOOD CATEGORIES</Text>
      <Text style={{ fontSize: 24, fontFamily: fonts.display, marginBottom: 14 }}>{market?.name}</Text>
      {categories.length === 0 && (
        <Text style={{ color: colors.muted, fontFamily: fonts.body }}>No categories yet. Admin adds them.</Text>
      )}
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 12 }}>
        {categories.map((c) => (
          <Pressable
            key={c.id}
            onPress={() => setActive(c.id)}
            style={{
              width: "47%",
              borderRadius: radius.md,
              overflow: "hidden",
              backgroundColor: colors.ink,
              borderWidth: active === c.id ? 3 : 0,
              borderColor: colors.gold,
            }}
          >
            <Photo uri={c.image_url} name={c.name} height={118} overlay />
          </Pressable>
        ))}
      </View>
      {active && shown.length === 0 && (
        <Text style={{ marginTop: 18, color: colors.muted, fontFamily: fonts.body }}>No meals in this category yet.</Text>
      )}
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
              <Photo uri={meal.image_url} name={meal.name} height={92} width={92} />
              <View style={{ flex: 1, padding: 12 }}>
                <Text style={{ fontFamily: fonts.title }}>{meal.name}</Text>
                <Text numberOfLines={2} style={{ color: colors.muted, marginTop: 4, fontFamily: fonts.body }}>
                  {meal.description}
                </Text>
                <Text style={{ marginTop: 6, fontFamily: fonts.title }}>{formatKw(meal.price)}</Text>
              </View>
            </Pressable>
          ))}
        </View>
      )}
    </ScrollView>
  );
}
