import { useCallback, useEffect, useRef, useState } from "react";
import {
  Dimensions,
  NativeScrollEvent,
  NativeSyntheticEvent,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { router, useFocusEffect } from "expo-router";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";
import { BrandMark } from "@/components/brand";
import { Photo } from "@/components/photo";
import { EmptyState } from "@/components/empty-state";
import { HomeSkeleton } from "@/components/skeleton";
import { OfflineNotice } from "@/components/offline-notice";
import { supabase } from "@/lib/supabase";
import { colors, fonts } from "@/lib/theme";
import { formatKw } from "@/lib/lipila";
import { loadBasket } from "@/lib/basket";
import { isOnline, withTimeout } from "@/lib/network";

const W = Dimensions.get("window").width;
const BANNER_W = W - 28;

export default function Home() {
  const [markets, setMarkets] = useState<any[]>([]);
  const [featured, setFeatured] = useState<any[]>([]);
  const [banners, setBanners] = useState<any[]>([]);
  const [count, setCount] = useState(0);
  const [bannerIndex, setBannerIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [offline, setOffline] = useState(false);
  const bannerRef = useRef<ScrollView>(null);

  const load = useCallback(() => {
    setLoading(true);
    setOffline(false);
    withTimeout(
      Promise.all([
        supabase
          .from("markets")
          .select("*")
          .eq("is_active", true)
          .order("sort_order")
          .then(({ data }) => setMarkets(data || [])),
        supabase
          .from("meals")
          .select("*")
          .eq("is_featured", true)
          .eq("is_available", true)
          .then(({ data }) => setFeatured(data || [])),
        supabase
          .from("banners")
          .select("*")
          .eq("is_active", true)
          .order("sort_order")
          .then(({ data }) => setBanners(data || [])),
      ])
    )
      .then(() => {
        setLoading(false);
        setOffline(false);
      })
      .catch(async () => {
        const online = await isOnline();
        if (!online) {
          // Keep skeleton forever until internet returns
          setOffline(true);
          setLoading(true);
          setTimeout(load, 3000);
        } else {
          setLoading(false);
        }
      });
    loadBasket().then((b) => setCount(b.items.reduce((n, i) => n + i.quantity, 0)));
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  // Banners from admin (text + amount), auto-swap every 10s
  const slides = banners.length
    ? banners.map((b) => ({
        key: b.id,
        uri: b.image_url,
        title: b.title || "",
        amount: b.amount,
      }))
    : [
        {
          key: "fallback",
          uri: null,
          title: "Real Meals. Real Flavours.",
          amount: null,
          fallback: require("../../assets/welcome-food.jpg"),
        },
      ];

  useEffect(() => {
    if (slides.length < 2 || offline || loading) return;
    const t = setInterval(() => {
      setBannerIndex((i) => {
        const next = (i + 1) % slides.length;
        bannerRef.current?.scrollTo({ x: next * BANNER_W, animated: true });
        return next;
      });
    }, 10000);
    return () => clearInterval(t);
  }, [slides.length, offline, loading]);

  function onBannerScroll(e: NativeSyntheticEvent<NativeScrollEvent>) {
    const x = e.nativeEvent.contentOffset.x;
    setBannerIndex(Math.round(x / BANNER_W));
  }

  return (
    <View style={styles.root}>
      <SafeAreaView edges={["top"]}>
        <View style={styles.top}>
          <BrandMark size={36} align="left" />
          <Pressable onPress={() => router.push("/(customer)/menu")} style={styles.avatar}>
            <Ionicons name="person" size={18} color="#fff" />
          </Pressable>
        </View>
      </SafeAreaView>

      <ScrollView contentContainerStyle={{ paddingBottom: 96 }} showsVerticalScrollIndicator={false}>
        {/* Video-style multi banner */}
        <View style={styles.bannerWrap}>
          <ScrollView
            ref={bannerRef}
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            onScroll={onBannerScroll}
            scrollEventThrottle={16}
            decelerationRate="fast"
            snapToInterval={BANNER_W}
            contentContainerStyle={{ paddingHorizontal: 14 }}
          >
            {slides.map((s) => (
              <View key={s.key} style={[styles.banner, { width: BANNER_W - 4, marginRight: 4 }]}>
                <Image
                  source={s.uri ? { uri: s.uri } : s.fallback || require("../../assets/welcome-food.jpg")}
                  style={StyleSheet.absoluteFillObject}
                  contentFit="cover"
                />
                <LinearGradient
                  colors={["transparent", "rgba(0,0,0,0.55)"]}
                  style={StyleSheet.absoluteFill}
                />
                <View style={styles.bannerCopy}>
                  {s.title ? <Text style={styles.bannerText}>{s.title}</Text> : null}
                  {s.amount != null ? (
                    <Text style={styles.bannerMeal}>{formatKw(Number(s.amount))}</Text>
                  ) : null}
                </View>
              </View>
            ))}
          </ScrollView>
          {slides.length > 1 ? (
            <View style={styles.dots}>
              {slides.map((s, i) => (
                <View key={s.key} style={[styles.dot, i === bannerIndex && styles.dotOn]} />
              ))}
            </View>
          ) : null}
        </View>

        {/* White sheet over dark — sits on banners */}
        <View style={styles.sheet}>
          {loading || offline ? (
            <HomeSkeleton />
          ) : (
            <>
          {/* Market logo chips — horizontal like Hungry Lion / KFC row */}
          <View style={styles.sectionHead}>
            <Text style={styles.section}>Markets</Text>
            <Pressable onPress={() => router.push("/(customer)/markets")}>
              <Text style={styles.see}>See all</Text>
            </Pressable>
          </View>

          {markets.length === 0 ? (
            <EmptyState icon="storefront" color={colors.customer} title="No markets yet" />
          ) : (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.chipRow}
            >
              {markets.map((m) => (
                <Pressable
                  key={m.id}
                  onPress={() => router.push(`/(customer)/market/${m.id}`)}
                  style={styles.chip}
                >
                  <View style={styles.chipLogo}>
                    {m.image_url ? (
                      <Image
                        source={{ uri: m.image_url }}
                        style={StyleSheet.absoluteFillObject}
                        contentFit="cover"
                      />
                    ) : (
                      <Ionicons name="storefront" size={28} color={colors.customerDeep} />
                    )}
                  </View>
                  <Text style={styles.chipName} numberOfLines={2}>
                    {m.name}
                  </Text>
                  {m.area ? (
                    <Text style={styles.chipMeta} numberOfLines={1}>
                      {m.area}
                    </Text>
                  ) : null}
                </Pressable>
              ))}
            </ScrollView>
          )}

          {/* Featured — large hero + 2-column grid like the reel */}
          <View style={[styles.sectionHead, { marginTop: 22 }]}>
            <View style={styles.sectionTitleRow}>
              <View style={styles.chefBadge}>
                <Ionicons name="restaurant" size={16} color="#fff" />
              </View>
              <Text style={styles.section}>Featured Meals</Text>
            </View>
          </View>

          {featured.length === 0 ? (
            <EmptyState icon="restaurant" color={colors.gold} title="No featured meals" />
          ) : (
            <View>
              {/* Big featured hero */}
              <Pressable
                onPress={() =>
                  router.push({
                    pathname: "/(customer)/meal/[id]",
                    params: { id: featured[0].id },
                  })
                }
                style={styles.heroMeal}
              >
                <Photo uri={featured[0].image_url} name={featured[0].name} height={180} />
                <LinearGradient
                  colors={["transparent", "rgba(0,0,0,0.7)"]}
                  style={styles.heroWash}
                />
                <View style={styles.heroCopy}>
                  <Text style={styles.heroName} numberOfLines={1}>
                    {featured[0].name}
                  </Text>
                  <Text style={styles.heroPrice}>{formatKw(featured[0].price)}</Text>
                </View>
              </Pressable>

              {/* 2-column food cards */}
              <View style={styles.grid}>
                {featured.slice(1).map((meal) => (
                  <Pressable
                    key={meal.id}
                    onPress={() =>
                      router.push({
                        pathname: "/(customer)/meal/[id]",
                        params: { id: meal.id },
                      })
                    }
                    style={styles.gridCard}
                  >
                    <Photo uri={meal.image_url} name={meal.name} height={110} />
                    <View style={styles.gridBody}>
                      <Text style={styles.gridName} numberOfLines={2}>
                        {meal.name}
                      </Text>
                      <Text style={styles.gridPrice}>{formatKw(meal.price)}</Text>
                    </View>
                  </Pressable>
                ))}
              </View>
            </View>
          )}

          {count > 0 && (
            <Pressable onPress={() => router.push("/(customer)/basket")} style={styles.basketBar}>
              <Text style={{ color: "#fff", fontFamily: fonts.title }}>View basket</Text>
              <Text style={{ color: colors.gold, fontFamily: fonts.title }}>
                {count} item{count === 1 ? "" : "s"}
              </Text>
            </Pressable>
          )}
            </>
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
    paddingBottom: 8,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.14)",
    alignItems: "center",
    justifyContent: "center",
  },
  bannerWrap: { marginBottom: 4 },
  banner: {
    height: 220,
    borderRadius: 24,
    overflow: "hidden",
    backgroundColor: "#111",
  },
  bannerCopy: {
    flex: 1,
    justifyContent: "flex-end",
    padding: 18,
    maxWidth: "85%",
  },
  bannerKicker: {
    color: colors.gold,
    fontFamily: fonts.italic,
    fontSize: 16,
    marginBottom: 6,
  },
  bannerText: {
    color: "#fff",
    fontFamily: fonts.display,
    fontSize: 26,
    lineHeight: 32,
  },
  bannerMeal: {
    color: "#fff",
    fontFamily: fonts.display,
    fontSize: 22,
  },
  dots: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 6,
    marginTop: 10,
  },
  dot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: "rgba(255,255,255,0.35)",
  },
  dotOn: { backgroundColor: colors.gold, width: 18 },
  sheet: {
    marginTop: 12,
    backgroundColor: "rgba(255,255,255,0.88)",
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    paddingHorizontal: 16,
    paddingTop: 22,
    paddingBottom: 100,
    minHeight: 520,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.55)",
    shadowColor: "#000",
    shadowOpacity: 0.22,
    shadowRadius: 22,
    shadowOffset: { width: 0, height: -6 },
    elevation: 10,
  },
  sectionHead: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 14,
  },
  sectionTitleRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  chefBadge: {
    width: 28,
    height: 28,
    borderRadius: 10,
    backgroundColor: colors.gold,
    alignItems: "center",
    justifyContent: "center",
  },
  section: { fontFamily: fonts.title, fontSize: 17, color: colors.ink },
  see: { color: colors.customerDeep, fontFamily: fonts.bodySemi, fontSize: 14 },
  chipRow: { gap: 12, paddingRight: 8, paddingBottom: 4 },
  chip: {
    width: 96,
    alignItems: "center",
  },
  chipLogo: {
    width: 72,
    height: 72,
    borderRadius: 18,
    backgroundColor: "#F4F6F3",
    borderWidth: 1,
    borderColor: colors.line,
    overflow: "hidden",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
  },
  chipName: {
    fontFamily: fonts.bodySemi,
    fontSize: 12,
    color: colors.ink,
    textAlign: "center",
  },
  chipMeta: {
    fontFamily: fonts.body,
    fontSize: 10,
    color: colors.muted,
    textAlign: "center",
    marginTop: 2,
  },
  heroMeal: {
    borderRadius: 22,
    overflow: "hidden",
    marginBottom: 12,
    backgroundColor: "#111",
  },
  heroWash: {
    ...StyleSheet.absoluteFillObject,
    top: 60,
  },
  heroCopy: {
    position: "absolute",
    left: 14,
    right: 14,
    bottom: 14,
  },
  heroName: { color: "#fff", fontFamily: fonts.display, fontSize: 20 },
  heroPrice: { color: colors.gold, fontFamily: fonts.title, marginTop: 4 },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },
  gridCard: {
    width: (W - 32 - 12) / 2,
    backgroundColor: "#fff",
    borderRadius: 18,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: colors.line,
  },
  gridBody: { padding: 10 },
  gridName: { fontFamily: fonts.title, color: colors.ink, fontSize: 13, minHeight: 34 },
  gridPrice: { color: colors.goldDeep, fontFamily: fonts.title, marginTop: 4, fontSize: 13 },
  basketBar: {
    marginTop: 24,
    backgroundColor: colors.ink,
    borderRadius: 18,
    padding: 16,
    flexDirection: "row",
    justifyContent: "space-between",
  },
});
