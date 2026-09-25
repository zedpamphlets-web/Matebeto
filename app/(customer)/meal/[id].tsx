import { useEffect, useState } from "react";
import { Alert, ScrollView, Text, View } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { supabase } from "@/lib/supabase";
import { loadBasket, saveBasket } from "@/lib/basket";
import { colors, fonts } from "@/lib/theme";
import { formatKw } from "@/lib/lipila";
import { CheckRow, PrimaryButton, QtyStepper } from "@/components/ui";
import { Photo } from "@/components/photo";

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
      : [
          ...basket.items,
          {
            meal_id: meal.id,
            name: meal.name,
            price: Number(meal.price),
            quantity: qty,
            sides: selected,
            image_url: meal.image_url,
          },
        ];
    await saveBasket({
      marketId: String(marketId || basket.marketId),
      marketName: String(marketName || basket.marketName),
      items,
    });
    router.push("/(customer)/basket");
  }

  if (!meal) return <View style={{ flex: 1, backgroundColor: colors.cream }} />;

  return (
    <ScrollView style={{ flex: 1, backgroundColor: colors.cream }} contentContainerStyle={{ paddingBottom: 32 }}>
      <Photo uri={meal.image_url} name={meal.name} height={240} />
      <View style={{ padding: 20 }}>
        <Text style={{ fontSize: 26, fontFamily: fonts.display }}>{meal.name}</Text>
        <Text style={{ fontSize: 22, fontFamily: fonts.display, color: colors.goldDeep, marginTop: 4 }}>
          {formatKw(meal.price)}
        </Text>
        <Text style={{ color: colors.muted, marginTop: 10, lineHeight: 22, fontFamily: fonts.body }}>{meal.description}</Text>
        <Text style={{ marginTop: 20, fontFamily: fonts.title, fontSize: 18 }}>Choose Your Sides (Free)</Text>
        <Text style={{ color: colors.muted, marginBottom: 8, fontFamily: fonts.body }}>
          Included with the meal. No extra charge.
        </Text>
        {sides.map((s) => (
          <CheckRow
            key={s}
            label={s}
            on={selected.includes(s)}
            onPress={() => setSelected((cur) => (cur.includes(s) ? cur.filter((x) => x !== s) : [...cur, s]))}
          />
        ))}
        <Text style={{ marginTop: 16, fontFamily: fonts.title }}>Quantity</Text>
        <QtyStepper value={qty} onChange={setQty} />
        <PrimaryButton label={`Add to Basket · ${formatKw(Number(meal.price) * qty)}`} onPress={add} />
      </View>
    </ScrollView>
  );
}
