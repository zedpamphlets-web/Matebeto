import { useCallback, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { router, useFocusEffect } from "expo-router";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";
import { BrandMark } from "@/components/brand";
import { Photo } from "@/components/photo";
import { EmptyState } from "@/components/empty-state";
import { supabase } from "@/lib/supabase";
import { colors, fonts } from "@/lib/theme";
import { formatKw } from "@/lib/lipila";
import { loadBasket } from "@/lib/basket";

const MARKET_WASH = ["#148C38", "#C62828", "#B71C1C", "#E65100"];

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
    <View style={styles.root}>
      <SafeAreaView edges={["top"]}>
        <View style={styles.top}>
          <BrandMark size={34} align="left" />
          <Pressable onPress={() => router.push("/(customer)/menu")} style={styles.avatar}>
            <Ionicons name="person" size={18} color="#fff" />
          </Pressable>
        </View>
      </SafeAreaView>

      <ScrollView contentContainerStyle={{ paddingBottom: 8 }} showsVerticalScrollIndicator={false}>
        <View style={styles.banner}>
          <Image
            source={banner ? { uri: banner } : require("../../assets/welcome-food.jpg")}
            style={StyleSheet.absoluteFillObject}
            contentFit="cover"
          />
          <LinearGradient
            colors={["rgba(0,0,0,0.72)", "rgba(0,0,0,0.18)", "transparent"]}
            start={{ x: 0, y: 0.5 }}
            end={{ x: 1, y: 0.5 }}
            style={StyleSheet.absoluteFill}
          />
          <View style={styles.bannerCopy}>
            <Text style={styles.bannerText}>
              Real Meals.{"\n"}Real Flavours.{"\n"}Delivered.
            </Text>
          </View>
        </View>

        <View style={styles.sheet}>
          <View style={styles.sectionHead}>
            <Text style={styles.section}>Markets</Text>
            <Pressable onPress={() => router.push("/(customer)/markets")}>
              <Text style={styles.see}>See all</Text>
            </Pressable>
          </View>

          {markets.length === 0 ? (
            <EmptyState
              icon="storefront"
              color={colors.customer}
              title="No markets yet"
              hint="Admin adds Thornpark, Longacres and Olympia from the back office."
            />
          ) : (
            <View style={styles.marketRow}>
              {markets.slice(0, 3).map((m, i) => (
                <Pressable
                  key={m.id}
                  onPress={() => router.push(`/(customer)/market/${m.id}`)}
                  style={styles.marketCard}
                >
                  <Photo uri={m.image_url} name={m.name} height={108} dark />
                  <LinearGradient
                    colors={["transparent", MARKET_WASH[i % MARKET_WASH.length]]}
                    style={styles.marketWash}
                  />
                  <Text style={styles.marketName} numberOfLines={1}>
                    {m.name}
                  </Text>
                </Pressable>
              ))}
            </View>
          )}

          <View style={[styles.sectionHead, { marginTop: 22 }]}>
            <Text style={styles.section}>Featured Meals</Text>
          </View>

          {featured.length === 0 ? (
            <EmptyState
              icon="restaurant"
              color={colors.gold}
              title="No featured meals"
              hint="When Admin marks a meal as featured, it shows here with its photo."
            />
          ) : (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 10 }}>
              {featured.map((meal) => (
                <Pressable
                  key={meal.id}
                  onPress={() => router.push({ pathname: "/(customer)/meal/[id]", params: { id: meal.id } })}
                  style={styles.mealCard}
                >
                  <Photo uri={meal.image_url} name={meal.name} height={100} />
                  <View style={{ padding: 10 }}>
                    <Text style={{ fontFamily: fonts.title }} numberOfLines={1}>
                      {meal.name}
                    </Text>
                    <Text style={{ color: colors.goldDeep, fontFamily: fonts.title, marginTop: 2 }}>
                      {formatKw(meal.price)}
                    </Text>
                  </View>
                </Pressable>
              ))}
            </ScrollView>
          )}

          {count > 0 && (
            <Pressable onPress={() => router.push("/(customer)/basket")} style={styles.basketBar}>
              <Text style={{ color: "#fff", fontFamily: fonts.title }}>View basket</Text>
              <Text style={{ color: colors.gold, fontFamily: fonts.title }}>
                {count} item{count === 1 ? "" : "s"}
              </Text>
            </Pressable>
          )}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#000" },
  top: {
    paddingHorizontal: 18,
    paddingBottom: 10,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.12)",
    alignItems: "center",
    justifyContent: "center",
  },
  banner: {
    height: 210,
    marginHorizontal: 16,
    borderRadius: 22,
    overflow: "hidden",
    backgroundColor: "#111",
  },
  bannerCopy: { flex: 1, justifyContent: "flex-end", padding: 18, maxWidth: "72%" },
  bannerText: {
    color: "#fff",
    fontFamily: fonts.display,
    fontSize: 26,
    lineHeight: 32,
  },
  sheet: {
    marginTop: 16,
    backgroundColor: "rgba(255,255,255,0.97)",
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 16,
    paddingTop: 18,
    paddingBottom: 36,
    minHeight: 460,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.5)",
  },
  sectionHead: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 12 },
  section: { fontFamily: fonts.title, fontSize: 16, color: colors.ink },
  see: { color: colors.customerDeep, fontFamily: fonts.bodySemi },
  marketRow: { flexDirection: "row", gap: 10 },
  marketCard: { flex: 1, borderRadius: 16, overflow: "hidden", backgroundColor: "#111" },
  marketWash: { ...StyleSheet.absoluteFillObject, top: 40 },
  marketName: {
    position: "absolute",
    left: 6,
    right: 6,
    bottom: 10,
    color: "#fff",
    fontFamily: fonts.display,
    fontSize: 13,
    textAlign: "center",
  },
  mealCard: {
    width: 148,
    backgroundColor: "#fff",
    borderRadius: 18,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: colors.line,
  },
  basketBar: {
    marginTop: 22,
    backgroundColor: colors.ink,
    borderRadius: 16,
    padding: 16,
    flexDirection: "row",
    justifyContent: "space-between",
  },
});
