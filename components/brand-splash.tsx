import { ActivityIndicator, Image, StyleSheet, Text, View } from "react-native";
import { BrandMark } from "@/components/brand";
import { colors, fonts } from "@/lib/theme";

export function BrandSplash({
  message = "Loading",
  useImage = false,
}: {
  message?: string;
  useImage?: boolean;
}) {
  return (
    <View style={styles.root}>
      {useImage ? (
        <Image source={require("../assets/splash.png")} style={styles.image} resizeMode="contain" />
      ) : (
        <BrandMark size={78} />
      )}
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
  image: { width: "92%", height: "62%" },
  spin: { position: "absolute", bottom: 72, alignItems: "center", gap: 10 },
  msg: { color: "rgba(255,255,255,0.7)", fontFamily: fonts.bodySemi, fontSize: 13, letterSpacing: 0.4 },
});
