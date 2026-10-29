import { useEffect, useRef, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { supabase } from "@/lib/supabase";
import { useCachedLoad } from "@/lib/offline-cache";
import { DetailSkeleton } from "@/components/skeleton";
import { OfflineNotice } from "@/components/offline-notice";
import { confirmDialog } from "@/components/confirm";
import { EMPTY_BASKET, loadBasket, saveBasket } from "@/lib/basket";
import { DEFAULT_SIDES, loadRestaurantMenu, MAX_SIDES, NSHIMA_LINE, type MenuMeal } from "@/lib/restaurants";
import { fonts, ui } from "@/lib/theme";
import { kwShort } from "@/lib/format";
import { Photo } from "@/components/photo";
import { Checkbox, MkHeader, MkScreen, MkStepper, RedButton } from "@/components/mk";

const clean = (v: any) => (v && v !== "null" && v !== "undefined" ? String(v) : null);

/** Screen 4: meal detail. Add to Order, then Continue Shopping or Continue to Checkout. */
export default function MealDetail() {
  const { id, vendorId, vendorName, marketId, marketName } = useLocalSearchParams<{
    id: string;
    vendorId?: string;
    vendorName?: string;
    marketId?: string;
    marketName?: string;
  }>();
  const vendor = clean(vendorId);
  const [selected, setSelected] = useState<string[]>([]);
  const [qty, setQty] = useState(1);
  const [added, setAdded] = useState(false);
  const scroller = useRef<ScrollView>(null);

  // The restaurant's own price and photo come from its menu; a meal with no restaurant falls back to the main meal.
  const menuQ = useCachedLoad<MenuMeal[]>(`restaurant.${vendor}.menu`, () =>
    vendor ? loadRestaurantMenu(vendor) : Promise.resolve({ data: [] as MenuMeal[], error: null })
  );
  const baseQ = useCachedLoad<any>(`meal.${id}`, () => supabase.from("meals").select("*").eq("id", id).maybeSingle());
  const sidesQ = useCachedLoad<any[]>(`meal.${id}.sides`, () => supabase.from("meal_sides").select("name").eq("meal_id", id));

  const fromMenu = (menuQ.data || []).find((m) => m.meal_id === id);
  const base = baseQ.data;
  const meal = fromMenu
    ? { name: fromMenu.name, price: Number(fromMenu.price), image_url: fromMenu.image_url }
    : base
      ? { name: base.name, price: Number(base.price), image_url: base.image_url }
      : null;

  const sideNames: string[] = (sidesQ.data || []).map((x: any) => x.name);
  const sides = (sideNames.length ? sideNames : DEFAULT_SIDES).slice(0, MAX_SIDES);
  const sidesKey = sides.join("|");
  useEffect(() => {
    setSelected(sides);
  }, [sidesKey]);

  function toggleSide(name: string) {
    setAdded(false);
    setSelected((cur) => (cur.includes(name) ? cur.filter((x) => x !== name) : cur.length >= MAX_SIDES ? cur : [...cur, name]));
  }

  async function add() {
    if (!meal) return;
    let basket = await loadBasket();
    const mk = clean(marketId) || clean(basket.marketId);
    if (!vendor || !mk) {
      router.replace("/(customer)");
      return;
    }
    // One restaurant per order
    if (basket.items.length && clean(basket.vendorId) && basket.vendorId !== vendor) {
      const ok = await confirmDialog({
        title: "One restaurant per order",
        message: `Your basket has meals from ${basket.vendorName || "another restaurant"}. Finish that order first, or clear it to order from ${clean(vendorName) || "this restaurant"}.`,
        confirmLabel: "Clear basket",
        cancelLabel: "Keep order",
        destructive: true,
      });
      if (!ok) return;
      basket = { ...EMPTY_BASKET };
    }
    const sidesNow = [...selected];
    const existing = basket.items.find((i) => i.meal_id === id && i.sides.join() === sidesNow.join());
    const items = existing
      ? basket.items.map((i) => (i === existing ? { ...i, price: meal.price, quantity: i.quantity + qty } : i))
      : [...basket.items, { meal_id: String(id), name: meal.name, price: meal.price, quantity: qty, sides: sidesNow, image_url: meal.image_url || undefined }];
    await saveBasket({
      marketId: mk,
      marketName: clean(marketName) || basket.marketName || null,
      vendorId: vendor,
      vendorName: clean(vendorName) || basket.vendorName || null,
      items,
    });
    setAdded(true);
    setTimeout(() => scroller.current?.scrollToEnd({ animated: true }), 120);
  }

  if ((menuQ.failed && baseQ.failed) || (!meal && baseQ.failed)) {
    return (
      <MkScreen>
        <MkHeader title="Meal" />
        <OfflineNotice onRetry={() => { menuQ.reload(); baseQ.reload(); }} />
      </MkScreen>
    );
  }
  if (!meal) {
    return (
      <MkScreen>
        <MkHeader title="Meal" />
        <DetailSkeleton />
      </MkScreen>
    );
  }

  const total = meal.price * qty;

  return (
    <MkScreen>
      <ScrollView ref={scroller} contentContainerStyle={{ paddingBottom: 20 }} showsVerticalScrollIndicator={false}>
        <View>
          <Photo uri={meal.image_url} name={meal.name} height={250} hideLabel />
          <Pressable onPress={() => router.back()} style={s.backFab} hitSlop={10} accessibilityLabel="Go back">
            <Ionicons name="chevron-back" size={22} color={ui.ink} />
          </Pressable>
        </View>

        <View style={{ paddingHorizontal: 16 }}>
          <View style={s.titleRow}>
            <Text style={s.name}>{meal.name}</Text>
            <Text style={s.price}>{kwShort(meal.price)}</Text>
          </View>
          <Text style={s.desc}>{NSHIMA_LINE}</Text>

          <View style={s.rule} />
          <Text style={s.h}>Choose your sides ({MAX_SIDES})</Text>
          <Text style={s.hint}>Select up to {MAX_SIDES} sides. No extra charge.</Text>
          {sides.map((name) => {
            const on = selected.includes(name);
            return (
              <Pressable key={name} onPress={() => toggleSide(name)} style={s.sideRow}>
                <Checkbox on={on} />
                <Text style={s.sideText}>{name}</Text>
              </Pressable>
            );
          })}

          <View style={s.qtyRow}>
            <Text style={s.h}>Quantity</Text>
            <MkStepper
              value={qty}
              onChange={(n) => {
                setAdded(false);
                setQty(n);
              }}
            />
          </View>
          <View style={s.totalRow}>
            <Text style={s.totalLabel}>Total</Text>
            <Text style={s.totalValue}>{kwShort(total)}</Text>
          </View>

          <RedButton label="Add to Order" icon="bag-handle-outline" onPress={add} />

          {added ? (
            <View>
              <View style={s.added}>
                <Ionicons name="checkmark-circle" size={20} color="#1F9D55" />
                <Text style={s.addedText}>
                  {qty} × {meal.name} added to your order
                </Text>
              </View>
              <Pressable onPress={() => router.back()} style={s.outline}>
                <Ionicons name="arrow-back" size={17} color={ui.red} />
                <Text style={s.outlineText}>Continue Shopping</Text>
              </Pressable>
              <RedButton label="Continue to Checkout" chevron onPress={() => router.push("/(customer)/basket")} style={{ marginTop: 10 }} />
            </View>
          ) : null}
        </View>
      </ScrollView>
    </MkScreen>
  );
}

const s = StyleSheet.create({
  backFab: { position: "absolute", top: 10, left: 14, width: 38, height: 38, borderRadius: 19, backgroundColor: "rgba(255,255,255,0.92)", alignItems: "center", justifyContent: "center" },
  titleRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 16 },
  name: { fontFamily: fonts.display, fontSize: 22, color: ui.ink, flex: 1, paddingRight: 10 },
  price: { fontFamily: fonts.display, fontSize: 20, color: ui.red },
  desc: { fontFamily: fonts.body, fontSize: 13, lineHeight: 19, color: ui.sub, marginTop: 6 },
  rule: { height: 1, backgroundColor: ui.line, marginVertical: 16 },
  h: { fontFamily: fonts.title, fontSize: 15, color: ui.ink },
  hint: { fontFamily: fonts.body, fontSize: 12, color: ui.sub, marginTop: 3, marginBottom: 6 },
  sideRow: { flexDirection: "row", alignItems: "center", paddingVertical: 11, paddingHorizontal: 12, borderRadius: 12, borderWidth: 1, borderColor: ui.line, marginTop: 8 },
  sideText: { fontFamily: fonts.bodySemi, fontSize: 14, color: ui.ink, marginLeft: 14 },
  qtyRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 20 },
  totalRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 14, marginBottom: 14 },
  totalLabel: { fontFamily: fonts.title, fontSize: 16, color: ui.ink },
  totalValue: { fontFamily: fonts.display, fontSize: 18, color: ui.ink },
  added: { flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: "#EAF7EF", borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, marginTop: 14, marginBottom: 12 },
  addedText: { fontFamily: fonts.bodySemi, fontSize: 13, color: "#14663A", flex: 1 },
  outline: { height: 54, borderRadius: 14, borderWidth: 1.5, borderColor: ui.red, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8 },
  outlineText: { fontFamily: fonts.title, fontSize: 15, color: ui.red },
});
