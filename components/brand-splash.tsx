import { ActivityIndicator, Image, StyleSheet, Text, View } from "react-native";
import { colors, fonts } from "@/lib/theme";

/** Loading splash: logo + spinner. Offline message only when offline=true. */
export function BrandSplash({ message, offline }: { message?: string; offline?: boolean }) {
  return (
    <View style={styles.root}>
      <View style={styles.center}>
        <Image
          source={require("../assets/logo-wordmark.png")}
          style={{ width: 280, height: 100 }}
          resizeMode="contain"
        />
        {offline ? (
          <>
            <Text style={styles.offlineTitle}>No internet connection</Text>
            <Text style={styles.offlineSub}>Connect to the internet to use Matebeto.</Text>
          </>
        ) : null}
      </View>
      {!offline && (
        <View style={styles.spin}>
          <ActivityIndicator size="large" color={colors.gold} />
          {message ? <Text style={styles.msg}>{message}</Text> : null}
        </View>
      )}
      <View style={styles.footer}>
        <Text style={styles.version}>v1.0.0</Text>
        <Text style={styles.powered}>Powered by Six Images</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: "#0B2B1A",
    alignItems: "center",
    justifyContent: "center",
  },
  center: {
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 48,
    paddingHorizontal: 28,
  },
  offlineTitle: {
    marginTop: 28,
    color: "#fff",
    fontFamily: fonts.title,
    fontSize: 20,
    textAlign: "center",
  },
  offlineSub: {
    marginTop: 8,
    color: "#B0B0B0",
    fontFamily: fonts.body,
    fontSize: 14,
    textAlign: "center",
  },
  spin: {
    position: "absolute",
    bottom: 56,
    alignItems: "center",
  },
  msg: {
    marginTop: 12,
    color: "#9A9A9A",
    fontFamily: fonts.bodySemi,
    fontSize: 14,
  },
  footer: {
    position: "absolute",
    bottom: 24,
    alignItems: "center",
  },
  version: {
    color: "#9A9A9A",
    fontFamily: fonts.body,
    fontSize: 12,
  },
  powered: {
    color: "#B0B0B0",
    fontFamily: fonts.body,
    fontSize: 11,
    marginTop: 2,
  },
});
