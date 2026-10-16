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
import { router } from "expo-router";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { Photo } from "@/components/photo";
import { EmptyState } from "@/components/empty-state";
import { HomeSkeleton } from "@/components/skeleton";
import { OfflineNotice } from "@/components/offline-notice";
import { OfflineBanner } from "@/components/offline-banner";
import { MkScreen } from "@/components/mk";
import { supabase } from "@/lib/supabase";
import { fonts, ui } from "@/lib/theme";
import { formatKw } from "@/lib/lipila";
import { useCachedLoad } from "@/lib/offline-cache";

const W = Dimensions.get("window").width;
const PAD = 16;
const GAP = 12;
const BANNER_W = W - PAD * 2;
const CARD_W = (W - PAD * 2 - GAP) / 2;
const DEFAULT_TAGLINE = "Good Food. Closer to You.";
const DEFAULT_CITY = "Lusaka";
const DEFAULT_MARKETS_TITLE = "Food Markets Near You";
const DEFAULT_PROMO_TITLE = "Great food. Great places.";
const DEFAULT_BANNER = {
  title: "Delicious\nMeals from\nYour Favourite\nFood Markets",
  subtitle: "Fresh. Tasty. Local.",
};

export default function Home() {
  const [bannerIndex, setBannerIndex] = useState(0);
  const bannerRef = useRef<ScrollView>(null);

  // Each list keeps a saved copy on the phone, so with no internet the menu still shows.
  const marketsQ = useCachedLoad<any[]>("home.markets", () =>
    supabase.from("markets").select("*").eq("is_active", true).order("sort_order")
  );
  const bannersQ = useCachedLoad<any[]>("home.banners", () =>
    supabase.from("banners").select("*").eq("is_active", true).order("sort_order")
  );

  const settingsQ = useCachedLoad<any>("home.settings", () =>
    supabase.from("settings").select("*").eq("id", 1).maybeSingle()
  );

  const markets = marketsQ.data || [];
  const banners = bannersQ.data || [];
  const cfg = settingsQ.data || {};
  const tagline: string = cfg.home_tagline || DEFAULT_TAGLINE;
  const city: string = cfg.home_city || DEFAULT_CITY;
  const marketsTitle: string = cfg.home_markets_title || DEFAULT_MARKETS_TITLE;
  const promoOn = cfg.promo_enabled !== false;
  const promoTitle: string = cfg.promo_title || DEFAULT_PROMO_TITLE;
  const promoSub: string = cfg.promo_subtitle || `Your favourite food markets in ${city}.`;
  const loading = marketsQ.loading;
  const offline = marketsQ.stale; // showing the saved copy
  const failed = marketsQ.failed; // nothing saved and no internet

  const retry = useCallback(() => {
    marketsQ.reload();
    bannersQ.reload();
    settingsQ.reload();
  }, [marketsQ.reload, bannersQ.reload, settingsQ.reload]);

  // Banners are managed in Admin (Home tab). With none set, the approved Matebeto banner shows.
  const slides: { key: string; uri: string | null; title: string; subtitle: string; amount: any }[] = banners.length
    ? banners.map((b) => ({
        key: b.id,
        uri: b.image_url,
        title: b.title || "",
        subtitle: b.subtitle || "",
        amount: b.amount,
      }))
    : [{ key: "default", uri: null, title: DEFAULT_BANNER.title, subtitle: DEFAULT_BANNER.subtitle, amount: null }];

  useEffect(() => {
    if (slides.length < 2 || loading) return;
    const t = setInterval(() => {
      setBannerIndex((i) => {
        const next = (i + 1) % slides.length;
        bannerRef.current?.scrollTo({ x: next * BANNER_W, animated: true });
        return next;
      });
    }, 10000);
    return () => clearInterval(t);
  }, [slides.length, loading]);

  function onBannerScroll(e: NativeSyntheticEvent<NativeScrollEvent>) {
    setBannerIndex(Math.round(e.nativeEvent.contentOffset.x / BANNER_W));
  }

  return (
    <MkScreen>
      <ScrollView contentContainerStyle={{ paddingBottom: 24 }} showsVerticalScrollIndicator={false}>
        {/* Header: logo + tagline, bell */}
        <View style={styles.top}>
          <View>
            <Image
              source={require("../../assets/logo-matebeto.png")}
              style={styles.logo}
              contentFit="contain"
              accessibilityLabel="Matebeto"
            />
            <Text style={styles.tagline}>{tagline}</Text>
          </View>
          <Pressable
            onPress={() => router.push("/(customer)/orders")}
            hitSlop={12}
            accessibilityLabel="Your orders"
          >
            <Ionicons name="notifications" size={24} color={ui.amber} />
          </Pressable>
        </View>

        {/* Banner */}
        <View>
          <ScrollView
            ref={bannerRef}
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            onScroll={onBannerScroll}
            scrollEventThrottle={16}
            decelerationRate="fast"
            snapToInterval={BANNER_W}
            contentContainerStyle={{ paddingHorizontal: PAD }}
          >
            {slides.map((sl) => (
              <View key={sl.key} style={[styles.banner, { width: BANNER_W, backgroundColor: ui.banner }]}>
                {sl.uri ? (
                  <>
                    <Image source={{ uri: sl.uri }} style={styles.bannerFood} contentFit="cover" />
                    <LinearGradient
                      colors={[ui.banner, "rgba(64,20,43,0)"]}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 0 }}
                      style={styles.bannerFade}
                    />
                  </>
                ) : null}
                <View style={styles.bannerCopy}>
                  {sl.title ? <Text style={styles.bannerTitle}>{sl.title}</Text> : null}
                  {sl.amount != null ? <Text style={styles.bannerAmount}>{formatKw(Number(sl.amount))}</Text> : null}
                  {sl.subtitle ? <Text style={styles.bannerSub}>{sl.subtitle}</Text> : null}
                  <View style={styles.bannerRule} />
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

        {/* Markets */}
        <View style={{ paddingHorizontal: PAD }}>
          <Text style={styles.section}>{marketsTitle}</Text>
          <View style={styles.where}>
            <Ionicons name="location-sharp" size={15} color={ui.amber} />
            <Text style={styles.whereText}>{city}</Text>
          </View>

          {failed ? (
            <OfflineNotice onRetry={retry} />
          ) : loading ? (
            <HomeSkeleton />
          ) : (
            <>
              {offline ? <OfflineBanner /> : null}
              {markets.length === 0 ? (
                <EmptyState icon="storefront" color={ui.red} title="No markets yet" />
              ) : (
                <View style={styles.grid}>
                  {markets.map((m) => (
                    <Pressable
                      key={m.id}
                      onPress={() => router.push(`/(customer)/market/${m.id}`)}
                      style={styles.card}
                    >
                      <Photo
                        uri={m.image_url}
                        name={m.name}
                        height={Math.round(CARD_W * 0.5)}
                      />
                      <View style={styles.cardBody}>
                        <View style={{ flex: 1 }}>
                          <Text style={styles.cardName} numberOfLines={1}>
                            {m.name}
                          </Text>
                          <Text style={styles.cardMeta}>Food Market</Text>
                          {m.distance_km != null ? (
                            <Text style={styles.cardMeta}>{Number(m.distance_km).toFixed(1)} km</Text>
                          ) : null}
                        </View>
                        <Ionicons name="chevron-forward" size={14} color={ui.ink} />
                      </View>
                    </Pressable>
                  ))}
                </View>
              )}

              {promoOn ? (
                <Pressable onPress={() => router.push("/(customer)/markets")} style={styles.promo}>
                  <MaterialCommunityIcons name="chef-hat" size={34} color={ui.amber} />
                  <View style={{ flex: 1, marginLeft: 12 }}>
                    <Text style={styles.promoTitle}>{promoTitle}</Text>
                    <Text style={styles.promoSub}>{promoSub}</Text>
                  </View>
                  <Ionicons name="chevron-forward" size={18} color={ui.amber} />
                </Pressable>
              ) : null}
            </>
          )}
        </View>
      </ScrollView>
    </MkScreen>
  );
}

const styles = StyleSheet.create({
  top: {
    paddingHorizontal: PAD,
    paddingTop: 6,
    paddingBottom: 12,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  logo: { width: 118, height: 52 },
  tagline: { fontFamily: fonts.body, fontSize: 10.5, color: ui.sub, marginTop: 1 },
  banner: { height: 140, borderRadius: 14, overflow: "hidden" },
  bannerFood: { position: "absolute", top: 0, right: 0, bottom: 0, width: "56%" },
  bannerFade: { position: "absolute", top: 0, bottom: 0, left: "40%", width: 60 },
  bannerCopy: { flex: 1, justifyContent: "center", paddingHorizontal: 16, maxWidth: "58%" },
  bannerTitle: { color: "#fff", fontFamily: fonts.title, fontSize: 17, lineHeight: 21 },
  bannerSub: { color: "#F3E7EC", fontFamily: fonts.body, fontSize: 10, marginTop: 10 },
  bannerRule: { width: 38, height: 3, borderRadius: 2, backgroundColor: ui.amber, marginTop: 6 },
  bannerAmount: { color: ui.amber, fontFamily: fonts.title, fontSize: 15, marginTop: 6 },
  dots: { flexDirection: "row", justifyContent: "center", gap: 6, marginTop: 10 },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: ui.checkOff },
  dotOn: { backgroundColor: ui.red, width: 16 },
  section: { fontFamily: fonts.title, fontSize: 17, color: ui.ink, marginTop: 18 },
  where: { flexDirection: "row", alignItems: "center", gap: 4, marginTop: 6, marginBottom: 14 },
  whereText: { fontFamily: fonts.bodySemi, fontSize: 13, color: ui.ink },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: GAP },
  card: {
    width: CARD_W,
    backgroundColor: "#fff",
    borderRadius: 12,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: ui.line,
    shadowColor: "#1C1B26",
    shadowOpacity: 0.06,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
    elevation: 2,
  },
  cardBody: { flexDirection: "row", alignItems: "center", paddingHorizontal: 10, paddingVertical: 9 },
  cardName: { fontFamily: fonts.title, fontSize: 12.5, color: ui.ink },
  cardMeta: { fontFamily: fonts.body, fontSize: 10.5, color: ui.sub, marginTop: 1 },
  promo: {
    marginTop: 18,
    backgroundColor: ui.promo,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 14,
    flexDirection: "row",
    alignItems: "center",
  },
  promoTitle: { fontFamily: fonts.title, fontSize: 13.5, color: ui.ink },
  promoSub: { fontFamily: fonts.body, fontSize: 11, color: ui.sub, marginTop: 2 },
});
