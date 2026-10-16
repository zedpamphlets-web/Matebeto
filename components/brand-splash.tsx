import { useEffect, useState } from "react";
import { Image, StyleSheet, Text, View } from "react-native";
import { CitrusSpinner } from "@/components/citrus-spinner";
import { fonts } from "@/lib/theme";

/**
 * Yango-style open:
 * 1. Full screen brand (black + yellow Matebeto)
 * 2. Swap to white splash
 * 3. Spinner appears
 */
export function BrandSplash({ message, offline, whiteOnly }: { message?: string; offline?: boolean; whiteOnly?: boolean }) {
  const [phase, setPhase] = useState<"brand" | "white">("brand");

  useEffect(() => {
    const t = setTimeout(() => setPhase("white"), 1600);
    return () => clearTimeout(t);
  }, []);

  if (phase === "brand" && !offline && !whiteOnly) {
    return (
      <View style={styles.brand}>
        <Image
          source={require("../assets/logo-black.png")}
          style={{ width: 320, height: 160 }}
          resizeMode="contain"
        />
      </View>
    );
  }

  return (
    <View style={styles.white}>
      <Image
        source={require("../assets/logo-white-splash.png")}
        style={{ width: 300, height: 120 }}
        resizeMode="contain"
      />
      {offline ? (
        <>
          <Text style={styles.offlineTitle}>No internet connection</Text>
          <Text style={styles.offlineSub}>Connect to the internet to use Matebeto.</Text>
        </>
      ) : (
        <View style={styles.spin}>
          <CitrusSpinner />
        </View>
      )}
      {message ? <Text style={styles.msg}>{message}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  brand: {
    flex: 1,
    backgroundColor: "#000000",
    alignItems: "center",
    justifyContent: "center",
  },
  white: {
    flex: 1,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
  },
  spin: { marginTop: 36 },
  offlineTitle: { fontFamily: fonts.title, color: "#1C1B26", fontSize: 18, marginTop: 16 },
  offlineSub: { fontFamily: fonts.body, color: "#6B6A78", marginTop: 6 },
  msg: { fontFamily: fonts.body, color: "#6B6A78", marginTop: 12 },
});
