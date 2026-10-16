import { useEffect, useRef, useState } from "react";
import { Animated, Easing } from "react-native";
import Svg, { Path } from "react-native-svg";

const SEGMENTS = 8;

function wedge(index: number) {
  const cx = 50;
  const cy = 50;
  const r = 46;
  const gap = 0.18;
  const sweep = (Math.PI * 2) / SEGMENTS;
  const a0 = -Math.PI / 2 + index * sweep + gap / 2;
  const a1 = a0 + sweep - gap;
  const x0 = cx + r * Math.cos(a0);
  const y0 = cy + r * Math.sin(a0);
  const x1 = cx + r * Math.cos(a1);
  const y1 = cy + r * Math.sin(a1);
  return `M ${cx} ${cy} L ${x0.toFixed(2)} ${y0.toFixed(2)} A ${r} ${r} 0 0 1 ${x1.toFixed(2)} ${y1.toFixed(2)} Z`;
}

/** Orange slices that fill in, then start again. Used while the app is opening. */
export function CitrusSpinner({ size = 54 }: { size?: number }) {
  const [count, setCount] = useState(1);
  const spin = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const timer = setInterval(() => setCount((n) => (n >= SEGMENTS ? 1 : n + 1)), 170);
    const loop = Animated.loop(
      Animated.timing(spin, { toValue: 1, duration: 1400, easing: Easing.linear, useNativeDriver: true })
    );
    loop.start();
    return () => {
      clearInterval(timer);
      loop.stop();
    };
  }, [spin]);

  const rotate = spin.interpolate({ inputRange: [0, 1], outputRange: ["0deg", "360deg"] });

  return (
    <Animated.View style={{ width: size, height: size, transform: [{ rotate }] }} accessibilityLabel="Loading">
      <Svg width={size} height={size} viewBox="0 0 100 100">
        {Array.from({ length: count }, (_, i) => (
          <Path key={i} d={wedge(i)} fill={i % 2 === 0 ? "#F6A21A" : "#E8870A"} />
        ))}
      </Svg>
    </Animated.View>
  );
}
