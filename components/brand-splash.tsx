import { useEffect, useRef, useState } from "react";
import { Animated, Dimensions, Easing, StyleSheet, Text, View } from "react-native";
import Svg, { ClipPath, Defs, G, Image as SvgImage, Polygon, Rect } from "react-native-svg";
import { Spinner } from "@/components/spinner";
import { fonts } from "@/lib/theme";

const { width: W, height: H } = Dimensions.get("window");
const LOGO_W = Math.min(W * 0.8, 380);
const LOGO_H = LOGO_W * (471 / 1090);
const LOGO_X = (W - LOGO_W) / 2;
const LOGO_Y = (H - LOGO_H) / 2;
const SLANT = W * 0.7; // how far the edge leans, like Yango's "/" edge

const YELLOW_LOGO = require("../assets/logo-wordmark-cropped.png");
const BLACK_LOGO = require("../assets/logo-wordmark-black.png");

const HOLD_MS = 1200; // brand screen with the big wordmark
const SWAP_MS = 700; // brand page slides away to the left
const REST_MS = 900; // wordmark rests on white
const LIFT_MS = 520; // wordmark rises off the top

/**
 * Opening sequence, copied from Yango's:
 * 1. Brand page (black, yellow wordmark), wordmark large and centred.
 * 2. The brand page slides out to the LEFT behind a slanted edge, revealing white.
 *    The wordmark does not move; it flips colour where the white is (black on white).
 * 3. After a short rest the wordmark rises up and off the top of the screen.
 *
 * staticBrand: only the first frame (used while fonts load).
 * whiteOnly:   white page with the spinner.
 * offline:     white page with the wordmark and a "no internet" message.
 * onFinished:  called when step 3 is done.
 */
export function BrandSplash({
  message,
  offline,
  whiteOnly,
  staticBrand,
  onFinished,
}: {
  message?: string;
  offline?: boolean;
  whiteOnly?: boolean;
  staticBrand?: boolean;
  onFinished?: () => void;
  useImage?: boolean;
}) {
  const swap = useRef(new Animated.Value(0)).current; // 0 → 1
  const lift = useRef(new Animated.Value(0)).current; // 0 → 1
  const [swapV, setSwapV] = useState(0);
  const [liftV, setLiftV] = useState(0);
  const [finished, setFinished] = useState(false);
  const cb = useRef(onFinished);
  cb.current = onFinished;

  useEffect(() => {
    if (staticBrand || offline || whiteOnly) return;
    const a = swap.addListener(({ value }) => setSwapV(value));
    const b = lift.addListener(({ value }) => setLiftV(value));
    Animated.sequence([
      Animated.delay(HOLD_MS),
      Animated.timing(swap, { toValue: 1, duration: SWAP_MS, easing: Easing.inOut(Easing.cubic), useNativeDriver: false }),
      Animated.delay(REST_MS),
      Animated.timing(lift, { toValue: 1, duration: LIFT_MS, easing: Easing.in(Easing.cubic), useNativeDriver: false }),
    ]).start(({ finished: ok }) => {
      if (ok) {
        setFinished(true);
        cb.current?.();
      }
    });
    return () => {
      swap.removeListener(a);
      lift.removeListener(b);
    };
  }, [staticBrand, offline, whiteOnly, swap, lift]);

  // static first frame (also what shows while fonts load)
  if (staticBrand) {
    return (
      <View style={s.brand}>
        <Svg width={W} height={H}>
          <SvgImage href={YELLOW_LOGO} x={LOGO_X} y={LOGO_Y} width={LOGO_W} height={LOGO_H} />
        </Svg>
      </View>
    );
  }

  if (offline) {
    return (
      <View style={s.white}>
        <Svg width={LOGO_W * 0.7} height={LOGO_H * 0.7}>
          <SvgImage href={YELLOW_LOGO} x={0} y={0} width={LOGO_W * 0.7} height={LOGO_H * 0.7} />
        </Svg>
        <Text style={s.offlineTitle}>No internet connection</Text>
        <Text style={s.offlineSub}>Connect to the internet to use Matebeto.</Text>
      </View>
    );
  }

  if (whiteOnly) {
    return (
      <View style={s.white}>
        <Spinner />
        {message ? <Text style={s.msg}>{message}</Text> : null}
      </View>
    );
  }

  // edge position: top x goes from W+SLANT (brand covers everything) to 0 (white covers everything)
  const xt = (W + SLANT) * (1 - swapV);
  const xb = xt - SLANT;
  const whitePoly = `${xt},0 ${W + SLANT},0 ${W + SLANT},${H} ${xb},${H}`;
  const dy = -(LOGO_Y + LOGO_H + 24) * liftV; // rises until fully off the top

  if (finished) {
    return (
      <View style={s.white}>
        <Spinner />
      </View>
    );
  }

  return (
    <View style={s.brand}>
      <Svg width={W} height={H}>
        <Defs>
          <ClipPath id="whiteArea">
            <Polygon points={whitePoly} />
          </ClipPath>
        </Defs>

        {/* brand page: black with the yellow wordmark */}
        <Rect x={0} y={0} width={W} height={H} fill="#000000" />
        <G transform={`translate(0, ${dy})`}>
          <SvgImage href={YELLOW_LOGO} x={LOGO_X} y={LOGO_Y} width={LOGO_W} height={LOGO_H} />
        </G>

        {/* white page, same wordmark flipped to black, only where the white has arrived */}
        <G clipPath="url(#whiteArea)">
          <Rect x={0} y={0} width={W} height={H} fill="#FFFFFF" />
          <G transform={`translate(0, ${dy})`}>
            <SvgImage href={BLACK_LOGO} x={LOGO_X} y={LOGO_Y} width={LOGO_W} height={LOGO_H} />
          </G>
        </G>
      </Svg>
    </View>
  );
}

const s = StyleSheet.create({
  brand: { flex: 1, backgroundColor: "#000000", alignItems: "center", justifyContent: "center" },
  white: { flex: 1, backgroundColor: "#FFFFFF", alignItems: "center", justifyContent: "center" },
  offlineTitle: { fontFamily: fonts.title, color: "#1C1B26", fontSize: 18, marginTop: 20 },
  offlineSub: { fontFamily: fonts.body, color: "#6B6A78", marginTop: 6 },
  msg: { fontFamily: fonts.body, color: "#6B6A78", marginTop: 14 },
});
