import { useCallback, useState } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import { router, useFocusEffect } from "expo-router";
import { Image } from "expo-image";
import { BrandMark } from "@/components/brand";
import { Photo } from "@/components/photo";
import { supabase } from "@/lib/supabase";
import { colors, fonts, radius } from "@/lib/theme";
import { formatKw } from "@/lib/lipila";
import { loadBasket } from "@/lib/basket";

export default function Home() {
  const [markets, setMarkets] = useState<any[]>([]);
  const [featured, setFeatured] = useState<any[]>([]);
  const [banner, setBanner] = useState<string | null>(null);
  const [count, setCount] = useState(0);

  useFocusEffect(
    useCallback(() => {
      supabase
        .from("markets")
        .select("*")
        .eq("is_active", true)
        .order("sort_order")
        .then(({ data }) => setMarkets(data || []));
      supabase
        .from("meals")
        .select("*")
        .eq("is_featured", true)
        .eq("is_available", true)
        .then(({ data }) => setFeatured(data || []));
      supabase
        .from("settings")
        .select("home_banner_url")
        .eq("id", 1)
        .single()
        .then(({ data }) => setBanner(data?.home_banner_url || null));
      loadBasket().then((b) => setCount(b.items.reduce((n, i) => n + i.quantity, 0)));
    }, [])
  );

  return (
    <ScrollView style={{ flex: 1, backgroundColor: colors.wash }} contentContainerStyle={{ padding: 16, paddingTop: 54, paddingBottom: 40 }}>
      <View
        style={{
          backgroundColor: colors.customerDeep,
          borderRadius: 22,
          minHeight: 168,
          marginBottom: 18,
          overflow: "hidden",
          flexDirection: "row",
        }}
      >
        <View style={{ flex: 1.15, padding: 18, justifyContent: "flex-end", zIndex: 2 }}>
          <BrandMark size={20} tagColor="#fff" />
          <Text style={{ color: "#fff", fontSize: 24, fontFamily: fonts.display, marginTop: 12, lineHeight: 30 }}>
            Real Meals,{"\n"}Real Flavours{"\n"}Delivered
          </Text>
        </View>
        <View style={{ flex: 1, minHeight: 168 }}>
          {banner ? (
            <Image source={{ uri: banner }} style={{ width: "100%", height: "100%" }} contentFit="cover" />
          ) : (
            <View style={{ flex: 1, backgroundColor: "#0E6B2E" }} />
          )}
        </View>
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
              <Photo uri={m.image_url} name={m.name} height={96} />
              <View style={{ paddingVertical: 8, paddingHorizontal: 4, backgroundColor: "#fff" }}>
                <Text style={{ textAlign: "center", fontFamily: fonts.title, fontSize: 12 }} numberOfLines={1}>
                  {m.name}
                </Text>
              </View>
            </Pressable>
          ))}
        </View>
      )}

      <Text style={{ marginTop: 22, marginBottom: 10, fontFamily: fonts.title, fontSize: 16 }}>Featured Meals</Text>
      {featured.length === 0 ? (
        <Text style={{ color: colors.muted, fontFamily: fonts.body }}>
          No featured meals yet. Admin marks meals as featured and uploads photos from the phone.
        </Text>
      ) : (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 10 }}>
          {featured.map((meal) => (
            <Pressable
              key={meal.id}
              onPress={() => router.push({ pathname: "/(customer)/meal/[id]", params: { id: meal.id } })}
              style={{ width: 148, backgroundColor: "#fff", borderRadius: radius.md, overflow: "hidden" }}
            >
              <Photo uri={meal.image_url} name={meal.name} height={100} />
              <View style={{ padding: 10 }}>
                <Text style={{ fontFamily: fonts.title }} numberOfLines={1}>
                  {meal.name}
                </Text>
                <Text style={{ color: colors.goldDeep, fontFamily: fonts.title, marginTop: 2 }}>{formatKw(meal.price)}</Text>
              </View>
            </Pressable>
          ))}
        </ScrollView>
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
