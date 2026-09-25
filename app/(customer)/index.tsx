import { useCallback, useState } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import { router, useFocusEffect } from "expo-router";
import { BrandMark } from "@/components/brand";
import { Photo } from "@/components/photo";
import { supabase } from "@/lib/supabase";
import { colors, fonts, radius } from "@/lib/theme";
import { formatKw } from "@/lib/lipila";
import { loadBasket } from "@/lib/basket";

export default function Home() {
  const [markets, setMarkets] = useState<any[]>([]);
  const [featured, setFeatured] = useState<any[]>([]);
  const [count, setCount] = useState(0);

  useFocusEffect(
    useCallback(() => {
      supabase.from("markets").select("*").eq("is_active", true).order("sort_order").then(({ data }) => setMarkets(data || []));
      supabase.from("meals").select("*").eq("is_featured", true).eq("is_available", true).then(({ data }) => setFeatured(data || []));
      loadBasket().then((b) => setCount(b.items.reduce((n, i) => n + i.quantity, 0)));
    }, [])
  );

  return (
    <ScrollView style={{ flex: 1, backgroundColor: colors.wash }} contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>
      <View style={{ backgroundColor: colors.customerDeep, borderRadius: 22, padding: 18, marginBottom: 16 }}>
        <BrandMark size={22} tagColor="#fff" />
        <Text style={{ color: "#fff", fontSize: 26, fontFamily: fonts.display, marginTop: 12, lineHeight: 32 }}>
          Real Meals,{"\n"}Real Flavours{"\n"}Delivered
        </Text>
      </View>

      <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
        <Text style={{ fontFamily: fonts.title, fontSize: 16 }}>Markets</Text>
        <Pressable onPress={() => router.push("/(customer)/markets")}>
          <Text style={{ color: colors.customerDeep, fontFamily: fonts.bodySemi }}>See all</Text>
        </Pressable>
      </View>
      {markets.length === 0 ? (
        <Text style={{ color: colors.muted, fontFamily: fonts.body, marginBottom: 12 }}>
          No markets yet. Admin adds them from the back office.
        </Text>
      ) : (
        <View style={{ flexDirection: "row", gap: 10 }}>
          {markets.map((m) => (
            <Pressable
              key={m.id}
              onPress={() => router.push(`/(customer)/market/${m.id}`)}
              style={{ flex: 1, borderRadius: 16, overflow: "hidden", backgroundColor: "#fff" }}
            >
              <Photo uri={m.image_url} name={m.name} height={92} />
              <Text style={{ textAlign: "center", fontFamily: fonts.title, paddingVertical: 8, fontSize: 12 }}>
                {m.name}
              </Text>
            </Pressable>
          ))}
        </View>
      )}

      <Text style={{ marginTop: 22, marginBottom: 10, fontFamily: fonts.title, fontSize: 16 }}>Featured Meals</Text>
      {featured.length === 0 ? (
        <Text style={{ color: colors.muted, fontFamily: fonts.body }}>
          No featured meals yet. Admin marks meals as featured.
        </Text>
      ) : (
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10 }}>
          {featured.map((meal) => (
            <Pressable
              key={meal.id}
              onPress={() => router.push({ pathname: "/(customer)/meal/[id]", params: { id: meal.id } })}
              style={{ width: "48%", backgroundColor: "#fff", borderRadius: radius.md, overflow: "hidden" }}
            >
              <Photo uri={meal.image_url} name={meal.name} height={96} />
              <View style={{ padding: 10 }}>
                <Text style={{ fontFamily: fonts.title }} numberOfLines={1}>
                  {meal.name}
                </Text>
                <Text style={{ color: colors.goldDeep, fontFamily: fonts.title, marginTop: 2 }}>{formatKw(meal.price)}</Text>
              </View>
            </Pressable>
          ))}
        </View>
      )}

      {count > 0 && (
        <Pressable
          onPress={() => router.push("/(customer)/basket")}
          style={{
            marginTop: 22,
            backgroundColor: colors.ink,
            borderRadius: 16,
            padding: 16,
            flexDirection: "row",
            justifyContent: "space-between",
          }}
        >
          <Text style={{ color: "#fff", fontFamily: fonts.title }}>View basket</Text>
          <Text style={{ color: colors.gold, fontFamily: fonts.title }}>
            {count} item{count === 1 ? "" : "s"}
          </Text>
        </Pressable>
      )}
    </ScrollView>
  );
}
