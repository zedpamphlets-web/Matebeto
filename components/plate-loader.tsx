import { useEffect, useRef } from "react";
import { ActivityIndicator, Animated, Easing, StyleSheet, Text, View } from "react-native";
import Svg, { Circle, Ellipse, G, Path, Rect } from "react-native-svg";
import { colors, fonts } from "@/lib/theme";

/** A plate with a roast chicken drumstick. Drawn in code so it stays sharp on every phone. */
function PlateWithChicken({ size = 220 }: { size?: number }) {
  return (
    <Svg width={size} height={size * (200 / 240)} viewBox="0 0 240 200">
      <Ellipse cx="120" cy="170" rx="92" ry="11" fill="#000000" opacity={0.28} />
      <Ellipse cx="120" cy="118" rx="100" ry="58" fill="#EFEBDD" />
      <Ellipse cx="120" cy="112" rx="100" ry="58" fill="#F8F5EC" />
      <Ellipse cx="120" cy="112" rx="82" ry="45" fill="#FFFFFF" stroke="#E3DDCB" strokeWidth={2} />
      <Ellipse cx="120" cy="112" rx="64" ry="33" fill="#FBF9F3" stroke="#EAE4D3" strokeWidth={1.5} />
      <G rotation={-16} origin="120, 104">
        <Path d="M132 86 Q158 94 156 104 Q158 114 132 122 Z" fill="#B96A17" />
        <Ellipse cx="108" cy="104" rx="42" ry="28" fill="#C97A1E" />
        <Ellipse cx="98" cy="94" rx="26" ry="13" fill="#E6A044" opacity={0.9} />
        <Circle cx="86" cy="112" r="3.2" fill="#9C5710" />
        <Circle cx="104" cy="118" r="2.6" fill="#9C5710" />
        <Circle cx="124" cy="110" r="3" fill="#9C5710" />
        <Circle cx="120" cy="92" r="2.4" fill="#9C5710" />
        <Rect x="150" y="97" width="30" height="14" rx="7" fill="#F6EFD9" />
        <Circle cx="182" cy="96" r="8" fill="#F6EFD9" />
        <Circle cx="182" cy="112" r="8" fill="#F6EFD9" />
      </G>
      <Path d="M96 62 Q90 52 96 44 Q102 36 96 28" fill="none" stroke="#FFFFFF" strokeOpacity={0.55} strokeWidth={4} strokeLinecap="round" />
      <Path d="M120 58 Q114 48 120 40 Q126 32 120 22" fill="none" stroke="#FFFFFF" strokeOpacity={0.55} strokeWidth={4} strokeLinecap="round" />
      <Path d="M144 62 Q138 52 144 44 Q150 36 144 28" fill="none" stroke="#FFFFFF" strokeOpacity={0.55} strokeWidth={4} strokeLinecap="round" />
    </Svg>
  );
}

/** Full-screen "Finding what to eat" page shown after login, before Home. */
export function PlateLoader({ message = "Finding what to eat…" }: { message?: string }) {
  const bob = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(bob, { toValue: 1, duration: 900, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        Animated.timing(bob, { toValue: 0, duration: 900, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [bob]);

  const translateY = bob.interpolate({ inputRange: [0, 1], outputRange: [0, -10] });

  return (
    <View style={styles.root}>
      <Animated.View style={{ transform: [{ translateY }] }}>
        <PlateWithChicken />
      </Animated.View>
      <Text style={styles.msg}>{message}</Text>
      <ActivityIndicator size="small" color={colors.gold} style={{ marginTop: 18 }} />
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.brandGreen,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 28,
  },
  msg: {
    marginTop: 18,
    color: colors.gold,
    fontFamily: fonts.display,
    fontSize: 24,
    textAlign: "center",
    letterSpacing: -0.3,
  },
});
