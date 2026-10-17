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
import { SpinPressable } from "@/components/spin-pressable";

export default function Welcome() {
  const [ready, setReady] = useState(false);
  const [offline, setOffline] = useState(false);
  const [going, setGoing] = useState(false);
  const [splashDone, setSplashDone] = useState(false);
  const doneRef = useRef(false);
  const navRef = useRef<null | (() => void)>(null);

  // never leave the opening animation half-way: wait for it to finish before moving on
  function navigate(fn: () => void) {
    if (doneRef.current) fn();
    else navRef.current = fn;
  }
  function onSplashFinished() {
    doneRef.current = true;
    setSplashDone(true);
    navRef.current?.();
    navRef.current = null;
  }

  useEffect(() => {
    let cancelled = false;

    (async () => {
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

      withTimeout(currentProfile())
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

  if (!ready || !splashDone) {
    return <BrandSplash onFinished={onSplashFinished} />;
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
            source={require("../assets/logo-wordmark-cropped.png")}
            style={{ width: 280, height: 121 }}
            contentFit="contain"
          />
          <Text style={styles.tag}>Good food, closer to you.</Text>
        </View>
        <View style={styles.actions}>
          <RoleButton
            filled
            icon="person"
            label="I'm a customer"
            onPress={() => {
              setGoing(true);
              setTimeout(() => router.push({ pathname: "/auth/phone", params: { mode: "customer" } }), 600);
            }}
          />
          <RoleButton
            icon="bicycle"
            label="I'm a rider"
            onPress={() => {
              setGoing(true);
              setTimeout(() => router.push({ pathname: "/auth/phone", params: { mode: "rider" } }), 600);
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
  const fg = filled ? "#FFFFFF" : "#D6263A";
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
    backgroundColor: "#D6263A",
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
  roleFilled: { backgroundColor: "#D6263A" },
  roleOutline: { backgroundColor: "#FFFFFF", borderWidth: 1.5, borderColor: "#D6263A" },
  roleLabel: { fontFamily: fonts.title, fontSize: 16 },
});
