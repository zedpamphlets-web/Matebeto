import { Pressable, StyleSheet, Text, View } from "react-native";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import { useEffect, useState } from "react";
import { Ionicons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";
import { BrandSplash } from "@/components/brand-splash";
import { colors, fonts } from "@/lib/theme";
import { currentProfile } from "@/lib/session";
import { supabase } from "@/lib/supabase";
import { isOnline, withTimeout } from "@/lib/network";
import { SpinPressable } from "@/components/spin-pressable";

export default function Welcome() {
  const [ready, setReady] = useState(false);
  const [offline, setOffline] = useState(false);

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
          router.replace({ pathname: "/finding", params: { next: "/(customer)" } });
          return;
        }
        setOffline(true);
        setReady(true);
        return;
      }

      withTimeout(currentProfile())
        .then(({ user, admin, rider, preview }) => {
          if (cancelled) return;
          if (admin) router.replace("/admin");
          else if (rider?.status === "APPROVED") router.replace("/(rider)");
          else if (preview || user) router.replace({ pathname: "/finding", params: { next: "/(customer)" } });
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

  if (!ready) {
    return <BrandSplash />;
  }

  if (offline) {
    return (
      <View style={{ flex: 1 }}>
        <BrandSplash offline />
        <View style={styles.retryWrap}>
          <SpinPressable
            spinnerColor={colors.ink}
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
                if (admin) router.replace("/admin");
                else if (rider?.status === "APPROVED") router.replace("/(rider)");
                else if (preview || user) router.replace({ pathname: "/finding", params: { next: "/(customer)" } });
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

  return (
    <View style={styles.root}>
      <Image source={require("../assets/welcome-bg-full.jpg")} style={StyleSheet.absoluteFillObject} contentFit="cover" />
      <LinearGradient
        colors={["rgba(0,0,0,0.35)", "rgba(0,0,0,0.15)", "rgba(0,0,0,0.1)", "rgba(0,0,0,0.55)"]}
        locations={[0, 0.3, 0.6, 1]}
        style={StyleSheet.absoluteFill}
      />
      <SafeAreaView style={styles.safe}>
        <View style={styles.copy}>
          <Image
            source={require("../assets/logo-wordmark-clear.png")}
            style={{ width: 340, height: 130 }}
            contentFit="contain"
          />
          <Text style={styles.tag}>Let's Eat.</Text>
          <Text style={styles.one}>One App.</Text>
          <Text style={styles.two}>Two ways to use it.</Text>
        </View>
        <View style={styles.actions}>
          <RoleButton
            color={colors.gold}
            textColor={colors.brandGreen}
            icon="person"
            label="I'm a Customer"
            onPress={() => router.push({ pathname: "/auth/phone", params: { mode: "customer" } })}
          />
          <RoleButton
            color={colors.rider}
            textColor="#fff"
            icon="bicycle"
            label="I'm a Rider"
            onPress={() => router.push({ pathname: "/auth/phone", params: { mode: "rider" } })}
          />
        </View>
      </SafeAreaView>
    </View>
  );
}

function RoleButton({
  color,
  textColor,
  icon,
  label,
  onPress,
}: {
  color: string;
  textColor: string;
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress: () => void;
}) {
  return (
    <SpinPressable onPress={onPress} spinnerColor={textColor} style={[styles.role, { backgroundColor: color }]}>
      <View style={styles.roleIcon}>
        <Ionicons name={icon} size={26} color={textColor} />
      </View>
      <Text style={[styles.roleLabel, { color: textColor }]}>{label}</Text>
    </SpinPressable>
  );
}

const styles = StyleSheet.create({
  retryWrap: {
    position: "absolute",
    bottom: 56,
    left: 0,
    right: 0,
    alignItems: "center",
  },
  retry: {
    backgroundColor: colors.gold,
    minWidth: 150,
    height: 52,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 28,
    borderRadius: 28,
  },
  retryText: {
    color: colors.ink,
    fontFamily: fonts.title,
    fontSize: 15,
  },
  root: { flex: 1, backgroundColor: "#FFF0E6" },
  safe: { flex: 1, justifyContent: "space-between", paddingHorizontal: 22, paddingBottom: 28 },
  copy: { paddingTop: 40, alignItems: "center" },
  tag: {
    marginTop: 8,
    color: colors.gold,
    fontFamily: fonts.title,
    fontSize: 20,
  },
  one: {
    marginTop: 2,
    color: colors.gold,
    fontFamily: fonts.display,
    fontSize: 40,
    letterSpacing: -0.5,
    textAlign: "center",
  },
  two: {
    marginTop: 4,
    color: "#FFFFFF",
    fontFamily: fonts.bodySemi,
    fontSize: 17,
    textAlign: "center",
  },
  actions: { gap: 14, paddingBottom: 8 },
  role: {
    height: 64,
    borderRadius: 36,
    flexDirection: "row",
    alignItems: "center",
    paddingLeft: 8,
    paddingRight: 18,
  },
  roleIcon: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: "rgba(255,255,255,0.22)",
    alignItems: "center",
    justifyContent: "center",
  },
  roleLabel: {
    flex: 1,
    textAlign: "center",
    color: "#fff",
    fontFamily: fonts.title,
    fontSize: 18,
    marginRight: 42,
  },
});
