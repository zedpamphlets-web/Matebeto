import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
import { BrandMark } from "@/components/brand";
import { colors, fonts } from "@/lib/theme";

export function BrandSplash({
  message = "Loading",
}: {
  message?: string;
}) {
  return (
    <View style={styles.root}>
      <View style={styles.center}>
        <BrandMark size={96} />
      </View>
      <View style={styles.spin}>
        <ActivityIndicator size="large" color={colors.gold} />
        <Text style={styles.msg}>{message}</Text>
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
    marginBottom: 40,
  },
  spin: {
    position: "absolute",
    bottom: 80,
    alignItems: "center",
    gap: 12,
  },
  msg: {
    color: "rgba(255,255,255,0.75)",
    fontFamily: fonts.bodySemi,
    fontSize: 14,
    letterSpacing: 0.5,
  },
});
