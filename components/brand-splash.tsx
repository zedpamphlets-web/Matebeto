import { Image, StyleSheet, Text, View } from "react-native";
import { CitrusSpinner } from "@/components/citrus-spinner";
import { colors, fonts } from "@/lib/theme";

/** Splash like the reference: logo centered, spinner at the bottom. */
export function BrandSplash({ message, offline }: { message?: string; offline?: boolean }) {
  return (
    <View style={styles.root}>
      <View style={styles.center}>
        <Image
          source={require("../assets/logo-wordmark-clear.png")}
          style={{ width: 300, height: 110 }}
          resizeMode="contain"
        />
        <Text style={styles.tag}>Let's Eat.</Text>
        {offline ? (
          <>
            <Text style={styles.offlineTitle}>No internet connection</Text>
            <Text style={styles.offlineSub}>Connect to the internet to use Matebeto.</Text>
          </>
        ) : null}
      </View>
      <View style={styles.spin}>
        {offline ? null : <CitrusSpinner />}
        {message ? <Text style={styles.msg}>{message}</Text> : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: "#0B0B0B",
    alignItems: "center",
    justifyContent: "center",
  },
  center: { alignItems: "center" },
  tag: { color: colors.gold, fontFamily: fonts.title, marginTop: 8, letterSpacing: 1 },
  spin: { position: "absolute", bottom: 72, alignItems: "center" },
  offlineTitle: { fontFamily: fonts.title, color: "#fff", fontSize: 18, marginTop: 16 },
  offlineSub: { fontFamily: fonts.body, color: "#ccc", marginTop: 6 },
  msg: { fontFamily: fonts.body, color: "#ccc", marginTop: 12 },
});
