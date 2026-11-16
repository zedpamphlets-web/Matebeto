import { Pressable, StyleSheet, Text, View } from "react-native";
import { Image } from "expo-image";
import { StatusBar } from "expo-status-bar";
import { router } from "expo-router";
import { useEffect, useRef, useState } from "react";
import { Ionicons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";
import { BrandSplash } from "@/components/brand-splash";
import { fonts } from "@/lib/theme";
import { currentProfile } from "@/lib/session";
import { supabase } from "@/lib/supabase";
import { isOnline, withTimeout } from "@/lib/network";
import { markBootReady } from "@/lib/boot";
import { SpinPressable } from "@/components/spin-pressable";

export default function Welcome() {
  const [ready, setReady] = useState(false);
  const [offline, setOffline] = useState(false);
  const [going, setGoing] = useState(false);
  // The logo overlay (LaunchSplash in _layout) stays on top until we are ready, then fades away over the next screen.
  function navigate(fn: () => void) {
    fn();
    markBootReady();
  }

  useEffect(() => {
    let cancelled = false;

    (async () => {
      // start the account check at the same time as the internet check (saves a few seconds on slow networks)
      const profileP = withTimeout(currentProfile());
      profileP.catch(() => {});
      const online = await isOnline();
      if (cancelled) return;
      if (!online) {
        // Someone who is already logged in can still open the app and see the menu saved on the phone
        const { data } = await supabase.auth.getSession().catch(() => ({ data: { session: null } }));
        if (cancelled) return;
        if (data?.session) {
          navigate(() => router.replace({ pathname: "/finding", params: { next: "/(customer)" } }));
          return;
        }
        setOffline(true);
        setReady(true);
        return;
      }

      profileP
        .then(({ user, admin, rider, preview }) => {
          if (cancelled) return;
          if (admin) navigate(() => router.replace("/admin"));
          else if (rider?.status === "APPROVED") navigate(() => router.replace("/(rider)"));
          else if (preview || user) navigate(() => router.replace({ pathname: "/finding", params: { next: "/(customer)" } }));
          else setReady(true);
        })
        .catch(async () => {
          if (cancelled) return;
          // A stalled request (e.g. connection dropped mid-check) shouldn't leave
          // the splash spinning forever — re-check connectivity and show the
          // offline screen if it's genuinely gone, otherwise just continue in.
          const stillOnline = await isOnline();
          if (cancelled) return;
          if (!stillOnline) setOffline(true);
          setReady(true);
        });
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (ready) markBootReady();
  }, [ready]);

  if (!ready) {
    return <View style={styles.root} />;
  }

  if (offline) {
    return (
      <View style={{ flex: 1 }}>
        <BrandSplash offline />
        <View style={styles.retryWrap}>
          <SpinPressable
            spinnerColor="#fff"
            onPress={async () => {
              setReady(false);
              setOffline(false);
              const online = await isOnline();
              if (!online) {
                setOffline(true);
                setReady(true);
                return;
              }
              try {
                const { user, admin, rider, preview } = await withTimeout(currentProfile());
                if (admin) navigate(() => router.replace("/admin"));
                else if (rider?.status === "APPROVED") navigate(() => router.replace("/(rider)"));
                else if (preview || user) navigate(() => router.replace({ pathname: "/finding", params: { next: "/(customer)" } }));
                else setReady(true);
              } catch {
                const stillOnline = await isOnline();
                if (!stillOnline) {
                  setOffline(true);
                }
                setReady(true);
              }
            }}
            style={styles.retry}
          >
            <Text style={styles.retryText}>Try again</Text>
          </SpinPressable>
        </View>
      </View>
    );
  }

  if (going) return <BrandSplash whiteOnly />;

  return (
    <View style={styles.root}>
      <StatusBar style="dark" />
      <SafeAreaView style={styles.safe}>
        <View style={styles.copy}>
          <Image
            source={require("../assets/logo-loko-full.png")}
            style={{ width: 230, height: 353 }}
            contentFit="contain"
            accessibilityLabel="Loko Cooks"
          />
          <Text style={styles.tag}>Discover. Order. Enjoy.</Text>
        </View>
        <View style={styles.actions}>
          <RoleButton
            filled
            icon="restaurant"
            label="Get started"
            onPress={() => {
              setGoing(true);
              setTimeout(() => router.push({ pathname: "/auth/phone", params: { mode: "customer" } }), 600);
            }}
          />
        </View>
      </SafeAreaView>
    </View>
  );
}

function RoleButton({
  filled,
  icon,
  label,
  onPress,
}: {
  filled?: boolean;
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress: () => void;
}) {
  const fg = filled ? "#FFFFFF" : "#E07A1F";
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.role, filled ? styles.roleFilled : styles.roleOutline, pressed && { opacity: 0.85 }]}
    >
      <Ionicons name={icon} size={22} color={fg} />
      <Text style={[styles.roleLabel, { color: fg }]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  retryWrap: { position: "absolute", bottom: 56, left: 0, right: 0, alignItems: "center" },
  retry: {
    backgroundColor: "#E07A1F",
    minWidth: 150,
    height: 52,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 28,
    borderRadius: 26,
  },
  retryText: { color: "#fff", fontFamily: fonts.title, fontSize: 15 },
  root: { flex: 1, backgroundColor: "#FFFFFF" },
  safe: { flex: 1, justifyContent: "space-between", paddingHorizontal: 20, paddingBottom: 24 },
  copy: { flex: 1, alignItems: "center", justifyContent: "center" },
  tag: { marginTop: 6, color: "#6B6A78", fontFamily: fonts.body, fontSize: 16 },
  actions: { gap: 12 },
  role: { height: 54, borderRadius: 14, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 10 },
  roleFilled: { backgroundColor: "#E07A1F" },
  roleOutline: { backgroundColor: "#FFFFFF", borderWidth: 1.5, borderColor: "#E07A1F" },
  roleLabel: { fontFamily: fonts.title, fontSize: 16 },
});
