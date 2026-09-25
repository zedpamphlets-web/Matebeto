import { ImageBackground, StyleSheet, Text, View } from "react-native";
import { router } from "expo-router";
import { useEffect, useState } from "react";
import { PrimaryButton } from "@/components/ui";
import { colors } from "@/lib/theme";
import { currentProfile } from "@/lib/session";

export default function Welcome() {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    currentProfile().then(({ user, admin }) => {
      if (admin) router.replace("/admin");
      else if (user) router.replace("/(customer)");
      setReady(true);
    });
  }, []);

  if (!ready) return <View style={{ flex: 1, backgroundColor: "#0B0B0B" }} />;

  return (
    <View style={styles.wrap}>
      <ImageBackground
        source={{ uri: "https://images.unsplash.com/photo-1555939594-58d7cb561ad1?w=1400" }}
        style={styles.hero}
        imageStyle={{ opacity: 0.55 }}
      >
        <View style={styles.heroDim}>
          <Text style={styles.brand}>Matebeto</Text>
          <Text style={styles.tag}>Let's Eat.</Text>
          <Text style={styles.line}>One App.{"\n"}Two Ways to Serve You.</Text>
        </View>
      </ImageBackground>
      <View style={styles.sheet}>
        <PrimaryButton
          label="I'm a Customer"
          color={colors.customer}
          textColor="#fff"
          onPress={() => router.push({ pathname: "/auth/phone", params: { mode: "customer" } })}
        />
        <View style={{ height: 12 }} />
        <PrimaryButton
          label="I'm a Rider"
          color={colors.rider}
          textColor="#fff"
          onPress={() => router.push({ pathname: "/auth/phone", params: { mode: "rider" } })}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, backgroundColor: "#0B0B0B" },
  hero: { flex: 1 },
  heroDim: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.45)",
    padding: 28,
    justifyContent: "flex-end",
    paddingBottom: 36,
  },
  brand: { color: colors.gold, fontSize: 44, fontWeight: "800" },
  tag: { color: "#fff", fontSize: 20, marginTop: 2, fontWeight: "700" },
  line: { color: "#F3E6C8", marginTop: 14, fontSize: 16, lineHeight: 22 },
  sheet: { padding: 22, paddingBottom: 40, backgroundColor: "#0B0B0B" },
});
