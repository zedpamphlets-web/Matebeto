import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
import { colors, fonts } from "@/lib/theme";

/** Full-screen splash: large Matebeto + spinner. Duration is natural load, not a fixed timer. */
export function BrandSplash({ message }: { message?: string }) {
  return (
    <View style={styles.root}>
      <View style={styles.center}>
        <Text style={styles.word}>Matebeto</Text>
        <View style={styles.line} />
        <Text style={styles.tag}>Let&apos;s Eat.</Text>
      </View>
      <View style={styles.spin}>
        <ActivityIndicator size="large" color={colors.gold} />
        {message ? <Text style={styles.msg}>{message}</Text> : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: "#000",
    alignItems: "center",
    justifyContent: "center",
  },
  center: {
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 48,
  },
  word: {
    fontFamily: fonts.script,
    fontSize: 64,
    color: colors.gold,
    lineHeight: 78,
    textAlign: "center",
  },
  line: {
    width: 120,
    height: 3,
    backgroundColor: colors.gold,
    borderRadius: 2,
    marginTop: 2,
    opacity: 0.95,
  },
  tag: {
    fontFamily: fonts.italic,
    color: colors.gold,
    fontSize: 20,
    marginTop: 12,
  },
  spin: {
    position: "absolute",
    bottom: 72,
    alignItems: "center",
    gap: 12,
  },
  msg: {
    color: "rgba(255,255,255,0.7)",
    fontFamily: fonts.bodySemi,
    fontSize: 13,
    letterSpacing: 0.4,
  },
});
