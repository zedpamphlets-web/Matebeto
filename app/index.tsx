import { useCallback, useEffect, useRef, useState } from "react";
import { Animated, Dimensions, Easing, Pressable, StyleSheet, Text, View } from "react-native";
import { Image } from "expo-image";
import { StatusBar } from "expo-status-bar";
import { router } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { SafeAreaView } from "react-native-safe-area-context";
import { Spinner } from "@/components/spinner";
import { fonts } from "@/lib/theme";
import { currentProfile } from "@/lib/session";
import { supabase } from "@/lib/supabase";
import { isOnline, withTimeout } from "@/lib/network";
import { writeCache } from "@/lib/offline-cache";
import { hydrateAccountCache } from "@/lib/account-cache";

const { width: W } = Dimensions.get("window");
const LOGO_W = Math.min(W * 0.64, 300);
const LOGO_H = LOGO_W * (761 / 496);
const MIN_SPLASH_MS = 1400; // the logo stays up at least this long, so the opening never looks rushed

type Phase = "checking" | "welcome" | "offline";
type Route = { kind: "go"; to: string } | { kind: "welcome" } | { kind: "offline" };

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const go = (to: string): Route => ({ kind: "go", to });

/** Decide where this phone goes next, using what is saved on the phone whenever the network is slow. */
async function decide(): Promise<Route> {
  const saved = async () => {
    const { data } = await supabase.auth.getSession().catch(() => ({ data: { session: null } }));
    return !!data?.session;
  };
  if (!(await isOnline())) return (await saved()) ? go("/(customer)") : { kind: "offline" };
  try {
    const { user, admin, rider, preview } = await withTimeout(currentProfile());
    if (admin) return go("/admin");
    if (rider?.status === "APPROVED") return go("/(rider)");
    if (preview || user) return go("/(customer)");
    return { kind: "welcome" };
  } catch {
    // A slow connection must not throw a logged-in customer back to the welcome page.
    if (await saved()) return go("/(customer)");
    return (await isOnline()) ? { kind: "welcome" } : { kind: "offline" };
  }
}

/** Saves the markets on the phone while the logo is showing, so Home opens already filled. */
async function warm() {
  try {
    const [markets, featured] = await withTimeout(
      Promise.all([
        supabase.from("markets").select("*").eq("is_active", true).order("sort_order"),
        supabase.from("meals").select("*").eq("is_featured", true).eq("is_available", true),
      ]),
      2500
    );
    if (!markets.error) await writeCache("home.markets", markets.data ?? []);
    if (!featured.error) await writeCache("home.featured", featured.data ?? []);
  } catch {
    /* slow or offline: Home shows what was saved last time */
  }
}

/**
 * One screen for the whole opening, so nothing blinks: the logo fades in once and stays where it is,
 * a small spinner shows while the phone checks the login, then either Home opens or the
 * Get started button fades in under the same logo.
 */
export default function Welcome() {
  const [phase, setPhase] = useState<Phase>("checking");
  const logoFade = useRef(new Animated.Value(0)).current;
  const spinFade = useRef(new Animated.Value(1)).current;
  const btnFade = useRef(new Animated.Value(0)).current;
  const hidden = useRef(false);
  const alive = useRef(true);

  // The phone's own splash stays until the logo below is drawn, so there is never an empty frame in between.
  const showLogo = useCallback(() => {
    if (hidden.current) return;
    hidden.current = true;
    Animated.timing(logoFade, { toValue: 1, duration: 380, easing: Easing.out(Easing.cubic), useNativeDriver: true }).start();
    (SplashScreen as any).setOptions?.({ fade: true, duration: 260 });
    SplashScreen.hideAsync().catch(() => {});
  }, [logoFade]);

  useEffect(() => {
    const safety = setTimeout(showLogo, 2500); // never leave the phone's splash up if the image is slow
    return () => clearTimeout(safety);
  }, [showLogo]);

  const swap = useCallback(
    (next: Phase) => {
      setPhase(next);
      Animated.parallel([
        Animated.timing(spinFade, { toValue: next === "checking" ? 1 : 0, duration: 220, useNativeDriver: true }),
        Animated.timing(btnFade, { toValue: next === "checking" ? 0 : 1, duration: 320, delay: next === "checking" ? 0 : 120, useNativeDriver: true }),
      ]).start();
    },
    [spinFade, btnFade]
  );

  const start = useCallback(async () => {
    const started = Date.now();
    await hydrateAccountCache(); // the saved name is ready before Home draws
    const route = await decide();
    if (!alive.current) return;
    if (route.kind === "go") await warm();
    await sleep(Math.max(0, MIN_SPLASH_MS - (Date.now() - started)));
    if (!alive.current) return;
    if (route.kind === "go") router.replace(route.to as never);
    else swap(route.kind);
  }, [swap]);

  useEffect(() => {
    alive.current = true;
    start();
    return () => {
      alive.current = false;
    };
  }, [start]);

  return (
    <View style={styles.root}>
      <StatusBar style="dark" />
      <SafeAreaView style={styles.safe}>
        <Animated.View style={[styles.copy, { opacity: logoFade, transform: [{ scale: logoFade.interpolate({ inputRange: [0, 1], outputRange: [0.96, 1] }) }] }]}>
          <Image
            source={require("../assets/logo-loko-full.png")}
            style={{ width: LOGO_W, height: LOGO_H }}
            contentFit="contain"
            transition={0}
            priority="high"
            onLoad={showLogo}
            onError={showLogo}
            accessibilityLabel="Loko Cooks"
          />
          <Text style={styles.tag}>Discover. Order. Enjoy.</Text>
        </Animated.View>

        <View style={styles.bottom}>
          <Animated.View style={[styles.layer, { opacity: spinFade }]} pointerEvents="none">
            <Spinner size={34} color="#E07A1F" />
          </Animated.View>

          <Animated.View style={[styles.layer, { opacity: btnFade }]} pointerEvents={phase === "checking" ? "none" : "auto"}>
            {phase === "offline" ? (
              <>
                <Text style={styles.offlineTitle}>No internet connection</Text>
                <Text style={styles.offlineSub}>Connect to the internet to use Loko Cooks.</Text>
                <Pressable
                  onPress={() => {
                    swap("checking");
                    start();
                  }}
                  style={({ pressed }) => [styles.button, pressed && { opacity: 0.85 }]}
                >
                  <Text style={styles.buttonText}>Try again</Text>
                </Pressable>
              </>
            ) : (
              <Pressable
                onPress={() => router.push({ pathname: "/auth/phone", params: { mode: "customer" } })}
                style={({ pressed }) => [styles.button, pressed && { opacity: 0.85 }]}
              >
                <Text style={styles.buttonText}>Get started</Text>
              </Pressable>
            )}
          </Animated.View>
        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#FFFFFF" },
  safe: { flex: 1, paddingHorizontal: 20 },
  copy: { flex: 1, alignItems: "center", justifyContent: "center" },
  tag: { marginTop: 6, color: "#6B6A78", fontFamily: fonts.body, fontSize: 16 },
  bottom: { height: 150, justifyContent: "flex-end", paddingBottom: 24 },
  layer: { position: "absolute", left: 0, right: 0, bottom: 24, alignItems: "center" },
  button: { alignSelf: "stretch", height: 54, borderRadius: 14, backgroundColor: "#E07A1F", alignItems: "center", justifyContent: "center", marginTop: 14 },
  buttonText: { fontFamily: fonts.title, fontSize: 16, color: "#FFFFFF" },
  offlineTitle: { fontFamily: fonts.title, color: "#1C1B26", fontSize: 17 },
  offlineSub: { fontFamily: fonts.body, color: "#6B6A78", marginTop: 4 },
});
