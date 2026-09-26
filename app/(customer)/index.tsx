import { useCallback, useState } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import { router, useFocusEffect } from "expo-router";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { BrandMark } from "@/components/brand";
import { Photo } from "@/components/photo";
import { DarkScreen } from "@/components/app-shell";
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
    <DarkScreen>
      <ScrollView contentContainerStyle={{ paddingBottom: 40 }}>
        <View style={{ paddingHorizontal: 16, paddingBottom: 12, flexDirection: "row", alignItems: "center" }}>
          <View style={{ flex: 1 }}>
            <BrandMark size={28} align="left" showTag={false} />
          </View>
          <Pressable onPress={() => router.push("/(customer)/menu")} style={{
            width: 40, height: 40, borderRadius: 20,
            backgroundColor: "rgba(255,255,255,0.1)",
            alignItems: "center", justifyContent: "center",
          }}>
            <Ionicons name="person" size={20} color="#fff" />
          </Pressable>
        </View>

        <View style={{ marginHorizontal: 16, borderRadius: 22, overflow: "hidden", height: 210, marginBottom: 20 }}>
          {banner ? (
            <Image source={{ uri: banner }} style={{ width: "100%", height: "100%" }} contentFit="cover" />
          ) : (
            <View style={{ flex: 1, backgroundColor: "#0B1A10" }} />
          )}
          <LinearGradient
            colors={["rgba(0,0,0,0.15)", "rgba(0,0,0,0.72)"]}
            style={{ position: "absolute", left: 0, right: 0, top: 0, bottom: 0 }}
          />
          <View style={{ position: "absolute", left: 16, right: 16, bottom: 16 }}>
            <Text style={{ color: colors.gold, fontFamily: fonts.italic, marginBottom: 6 }}>Let's Eat.</Text>
            <Text style={{ color: "#fff", fontFamily: fonts.display, fontSize: 26, lineHeight: 30 }}>
              Real Meals.{"\n"}Real Flavours.{"\n"}Delivered.
            </Text>
          </View>
        </View>

        <View style={{ paddingHorizontal: 16, flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
          <Text style={{ color: "#fff", fontFamily: fonts.title, fontSize: 18 }}>Markets</Text>
          <Pressable onPress={() => router.push("/(customer)/markets")}>
            <Text style={{ color: colors.gold, fontFamily: fonts.bodySemi }}>See all</Text>
          </Pressable>
        </View>

        {markets.length === 0 ? (
          <Text style={{ color: "#8A8A8A", fontFamily: fonts.body, paddingHorizontal: 16, marginBottom: 12 }}>
            No markets yet. Admin adds them from the back office.
          </Text>
        ) : (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 16, gap: 10 }}>
            {markets.map((m) => (
              <Pressable
                key={m.id}
                onPress={() => router.push(`/(customer)/market/${m.id}`)}
                style={{ width: 132, borderRadius: 16, overflow: "hidden", backgroundColor: "#111" }}
              >
                <Photo uri={m.image_url} name={m.name} height={118} overlay />
              </Pressable>
            ))}
          </ScrollView>
        )}

        <Text style={{ color: "#fff", fontFamily: fonts.title, fontSize: 18, marginTop: 22, marginBottom: 12, paddingHorizontal: 16 }}>
          Featured Meals
        </Text>
        {featured.length === 0 ? (
          <Text style={{ color: "#8A8A8A", fontFamily: fonts.body, paddingHorizontal: 16 }}>
            No featured meals yet. Admin marks meals as featured and uploads photos from the phone.
          </Text>
        ) : (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 16, gap: 10 }}>
            {featured.map((meal) => (
              <Pressable
                key={meal.id}
                onPress={() => router.push({ pathname: "/(customer)/meal/[id]", params: { id: meal.id } })}
                style={{ width: 148, backgroundColor: "#141414", borderRadius: radius.md, overflow: "hidden", borderWidth: 1, borderColor: "rgba(255,255,255,0.08)" }}
              >
                <Photo uri={meal.image_url} name={meal.name} height={100} />
                <View style={{ padding: 10 }}>
                  <Text style={{ fontFamily: fonts.title, color: "#fff" }} numberOfLines={1}>
                    {meal.name}
                  </Text>
                  <Text style={{ color: colors.gold, fontFamily: fonts.title, marginTop: 2 }}>{formatKw(meal.price)}</Text>
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
              marginHorizontal: 16,
              backgroundColor: colors.gold,
              borderRadius: 16,
              padding: 16,
              flexDirection: "row",
              justifyContent: "space-between",
            }}
          >
            <Text style={{ color: colors.ink, fontFamily: fonts.title }}>View basket</Text>
            <Text style={{ color: colors.ink, fontFamily: fonts.title }}>
              {count} item{count === 1 ? "" : "s"}
            </Text>
          </Pressable>
        )}
      </ScrollView>
    </DarkScreen>
  );
}
