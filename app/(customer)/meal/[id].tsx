import { useEffect, useState } from "react";
import { Alert, Pressable, ScrollView, Text, View } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { supabase } from "@/lib/supabase";
import { loadBasket, saveBasket } from "@/lib/basket";
import { colors, fonts } from "@/lib/theme";
import { formatKw } from "@/lib/lipila";
import { QtyStepper } from "@/components/ui";
import { Photo } from "@/components/photo";
import { AppHeader, DarkScreen, GoldButton } from "@/components/app-shell";

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

  if (!meal) return <DarkScreen />;

  return (
    <DarkScreen>
      <AppHeader title="Meal" back />
      <ScrollView contentContainerStyle={{ paddingBottom: 32 }}>
        <Photo uri={meal.image_url} name={meal.name} height={240} />
        <View style={{ padding: 20 }}>
          <Text style={{ fontSize: 26, fontFamily: fonts.display, color: "#fff" }}>{meal.name}</Text>
          <Text style={{ fontSize: 22, fontFamily: fonts.display, color: colors.gold, marginTop: 4 }}>
            {formatKw(meal.price)}
          </Text>
          <Text style={{ color: "#B3B3B3", marginTop: 10, lineHeight: 22, fontFamily: fonts.body }}>{meal.description}</Text>
          <Text style={{ marginTop: 20, fontFamily: fonts.title, fontSize: 18, color: "#fff" }}>Included Sides (Free)</Text>
          <Text style={{ color: "#8A8A8A", marginBottom: 8, fontFamily: fonts.body }}>
            Included with the meal. No extra charge.
          </Text>
          {sides.map((s) => {
            const on = selected.includes(s);
            return (
              <Pressable
                key={s}
                onPress={() => setSelected((cur) => (cur.includes(s) ? cur.filter((x) => x !== s) : [...cur, s]))}
                style={{ flexDirection: "row", alignItems: "center", paddingVertical: 10 }}
              >
                <View
                  style={{
                    width: 24,
                    height: 24,
                    borderRadius: 6,
                    marginRight: 12,
                    backgroundColor: on ? colors.customer : "transparent",
                    borderWidth: 1.5,
                    borderColor: on ? colors.customer : "rgba(255,255,255,0.25)",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  {on ? <Ionicons name="checkmark" size={16} color="#fff" /> : null}
                </View>
                <Text style={{ fontFamily: fonts.bodySemi, fontSize: 16, color: "#fff" }}>{s}</Text>
              </Pressable>
            );
          })}
          <Text style={{ marginTop: 16, fontFamily: fonts.title, color: "#fff" }}>Quantity</Text>
          <QtyStepper value={qty} onChange={setQty} />
          <GoldButton label={`Add to Basket · ${formatKw(Number(meal.price) * qty)}`} onPress={add} />
        </View>
      </ScrollView>
    </DarkScreen>
  );
}
