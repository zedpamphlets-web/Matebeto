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
import { isOnline, withTimeout } from "@/lib/network";

export default function Welcome() {
  const [ready, setReady] = useState(false);
  const [offline, setOffline] = useState(false);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      const online = await isOnline();
      if (cancelled) return;
      if (!online) {
        setOffline(true);
        setReady(true);
        return;
      }

      withTimeout(currentProfile())
        .then(({ user, admin, rider, preview }) => {
          if (cancelled) return;
          if (admin) router.replace("/admin");
          else if (rider?.status === "APPROVED") router.replace("/(rider)");
          else if (preview || user) router.replace("/(customer)");
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
          <Pressable
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
                else if (preview || user) router.replace("/(customer)");
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
          </Pressable>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.root}>
      <Image source={require("../assets/welcome-food-new.jpg")} style={StyleSheet.absoluteFillObject} contentFit="cover" />
      <LinearGradient
        colors={["rgba(0,0,0,0.05)", "rgba(0,0,0,0.05)", "rgba(0,0,0,0.18)", "rgba(0,0,0,0.68)"]}
        locations={[0, 0.5, 0.75, 1]}
        style={StyleSheet.absoluteFill}
      />
      <SafeAreaView style={styles.safe}>
        <View />
        <View style={styles.actions}>
          <RoleButton
            color={colors.customer}
            icon="person"
            label="I'm a Customer"
            onPress={() => router.push({ pathname: "/auth/phone", params: { mode: "customer" } })}
          />
          <RoleButton
            color={colors.rider}
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
  icon,
  label,
  onPress,
}: {
  color: string;
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress: () => void;
}) {
  return (
    <Pressable onPress={onPress} style={[styles.role, { backgroundColor: color }]}>
      <View style={styles.roleIcon}>
        <Ionicons name={icon} size={26} color="#fff" />
      </View>
      <Text style={styles.roleLabel}>{label}</Text>
    </Pressable>
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
    paddingHorizontal: 28,
    paddingVertical: 14,
    borderRadius: 28,
  },
  retryText: {
    color: colors.ink,
    fontFamily: fonts.title,
    fontSize: 15,
  },
  root: { flex: 1, backgroundColor: "#000" },
  safe: { flex: 1, justifyContent: "space-between", paddingHorizontal: 22, paddingBottom: 28 },
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
