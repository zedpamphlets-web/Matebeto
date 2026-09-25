import { useEffect, useState } from "react";
import { Alert, Pressable, ScrollView, Text, View } from "react-native";
import { Image } from "expo-image";
import { router, useLocalSearchParams } from "expo-router";
import { supabase } from "@/lib/supabase";
import { loadBasket, saveBasket } from "@/lib/basket";
import { colors, radius } from "@/lib/theme";
import { formatKw } from "@/lib/lipila";
import { PrimaryButton } from "@/components/ui";

export default function MealDetail() {
  const { id, marketId, marketName } = useLocalSearchParams<{ id: string; marketId?: string; marketName?: string }>();
  const [meal, setMeal] = useState<any>(null);
  const [sides, setSides] = useState<string[]>([]);
  const [selected, setSelected] = useState<string[]>([]);
  const [qty, setQty] = useState(1);

  useEffect(() => {
    supabase.from("meals").select("*").eq("id", id).single().then(({ data }) => setMeal(data));
    supabase.from("meal_sides").select("name").eq("meal_id", id).then(({ data }) => {
      const names = (data || []).map((s) => s.name);
      setSides(names);
      setSelected(names);
    });
  }, [id]);

  async function add() {
    if (!meal) return;
    const basket = await loadBasket();
    if (basket.marketId && marketId && basket.marketId !== marketId && basket.items.length) {
      Alert.alert("One market per order", "Clear the basket to order from a different market.");
      return;
    }
    const existing = basket.items.find((i) => i.meal_id === meal.id && i.sides.join() === selected.join());
    const items = existing
      ? basket.items.map((i) => (i === existing ? { ...i, quantity: i.quantity + qty } : i))
      : [...basket.items, { meal_id: meal.id, name: meal.name, price: Number(meal.price), quantity: qty, sides: selected, image_url: meal.image_url }];
    await saveBasket({ marketId: String(marketId || basket.marketId), marketName: String(marketName || basket.marketName), items });
    router.push("/(customer)/basket");
  }

  if (!meal) return <View style={{ flex: 1, backgroundColor: colors.cream }} />;

  return (
    <ScrollView style={{ flex: 1, backgroundColor: colors.cream }} contentContainerStyle={{ paddingBottom: 32 }}>
      <Image source={{ uri: meal.image_url }} style={{ height: 240, width: "100%" }} contentFit="cover" />
      <View style={{ padding: 20 }}>
        <Text style={{ fontSize: 26, fontWeight: "800" }}>{meal.name}</Text>
        <Text style={{ fontSize: 22, fontWeight: "800", color: colors.goldDeep, marginTop: 4 }}>{formatKw(meal.price)}</Text>
        <Text style={{ color: colors.muted, marginTop: 10, lineHeight: 22 }}>{meal.description}</Text>
        <Text style={{ marginTop: 20, fontWeight: "800" }}>Included sides (free)</Text>
        <Text style={{ color: colors.muted, marginBottom: 8 }}>Sides are part of the meal price.</Text>
        {sides.map((s) => {
          const on = selected.includes(s);
          return (
            <Pressable
              key={s}
              onPress={() => setSelected((cur) => (cur.includes(s) ? cur.filter((x) => x !== s) : [...cur, s]))}
              style={{ flexDirection: "row", alignItems: "center", paddingVertical: 10 }}
            >
              <View style={{
                width: 22, height: 22, borderRadius: 6, marginRight: 10,
                backgroundColor: on ? colors.gold : "#fff", borderWidth: 1, borderColor: colors.line,
              }} />
              <Text style={{ fontWeight: "600" }}>{s}</Text>
            </Pressable>
          );
        })}
        <Text style={{ marginTop: 16, fontWeight: "800" }}>Quantity</Text>
        <View style={{ flexDirection: "row", alignItems: "center", marginVertical: 12 }}>
          <Pressable onPress={() => setQty((q) => Math.max(1, q - 1))} style={step}><Text style={{ fontSize: 22 }}>-</Text></Pressable>
          <Text style={{ marginHorizontal: 18, fontSize: 20, fontWeight: "800" }}>{qty}</Text>
          <Pressable onPress={() => setQty((q) => q + 1)} style={step}><Text style={{ fontSize: 22 }}>+</Text></Pressable>
        </View>
        <PrimaryButton label={`Add to basket · ${formatKw(Number(meal.price) * qty)}`} onPress={add} />
      </View>
    </ScrollView>
  );
}

const step = {
  width: 44,
  height: 44,
  borderRadius: radius.sm,
  backgroundColor: "#fff",
  alignItems: "center" as const,
  justifyContent: "center" as const,
  borderWidth: 1,
  borderColor: colors.line,
};
