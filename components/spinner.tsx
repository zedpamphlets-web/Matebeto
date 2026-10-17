import { useEffect, useRef } from "react";
import { Animated, Easing, StyleSheet, View } from "react-native";
import { StatusBar } from "expo-status-bar";
import Svg, { Circle } from "react-native-svg";

/**
 * The one loading spinner used everywhere in Matebeto: a thin ring with a moving arc,
 * on white, in the same style as Yango's loader. Replaces the old orange-slice and plate loaders.
 */
export function Spinner({
  size = 44,
  color = "#1C1B26",
  track = "#EDEDF0",
  stroke,
}: {
  size?: number;
  color?: string;
  track?: string;
  stroke?: number;
}) {
  const spin = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.timing(spin, { toValue: 1, duration: 850, easing: Easing.linear, useNativeDriver: true })
    );
    loop.start();
    return () => loop.stop();
  }, [spin]);

  const sw = stroke ?? Math.max(2.5, Math.round(size / 11));
  const r = (size - sw) / 2;
  const c = 2 * Math.PI * r;
  const rotate = spin.interpolate({ inputRange: [0, 1], outputRange: ["0deg", "360deg"] });

  return (
    <Animated.View style={{ width: size, height: size, transform: [{ rotate }] }} accessibilityLabel="Loading">
      <Svg width={size} height={size}>
        <Circle cx={size / 2} cy={size / 2} r={r} stroke={track} strokeWidth={sw} fill="none" />
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          stroke={color}
          strokeWidth={sw}
          strokeLinecap="round"
          fill="none"
          strokeDasharray={`${c * 0.28} ${c}`}
        />
      </Svg>
    </Animated.View>
  );
}

/** Full white page with the spinner in the middle. Used whenever a page is opening or loading. */
export function LoadingScreen() {
  return (
    <View style={s.screen}>
      <StatusBar style="dark" />
      <Spinner />
    </View>
  );
}

/** Same thing without taking over the whole screen, for a list or a section. */
export function LoadingBlock({ minHeight = 240 }: { minHeight?: number }) {
  return (
    <View style={[s.block, { minHeight }]}>
      <Spinner />
    </View>
  );
}

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#FFFFFF", alignItems: "center", justifyContent: "center" },
  block: { alignItems: "center", justifyContent: "center", backgroundColor: "#FFFFFF" },
});
