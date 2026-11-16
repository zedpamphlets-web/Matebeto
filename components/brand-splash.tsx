import { useEffect, useRef } from "react";
import { Animated, Dimensions, Easing, Image, StyleSheet, Text, View } from "react-native";
import { Spinner } from "@/components/spinner";
import { fonts } from "@/lib/theme";

const { width: W } = Dimensions.get("window");
const LOGO = require("../assets/logo-loko-full.png"); // 496 x 761, transparent background
const LOGO_W = Math.min(W * 0.64, 420);
const LOGO_H = LOGO_W * (761 / 496);

const HOLD_MS = 1400; // full-screen logo stays up
const FADE_MS = 350; // then fades away into the app

/**
 * Opening screen: the Loko Cooks logo, full screen on white. It sits in exactly the same place as the
 * native splash picture, so the phone's splash and this screen look like one continuous screen.
 *
 * staticBrand: the logo only (shown while fonts load).
 * whiteOnly:   white page with the spinner.
 * offline:     white page with the logo and a "no internet" message.
 * onFinished:  called once the logo has faded out.
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
  const opacity = useRef(new Animated.Value(1)).current;
  const cb = useRef(onFinished);
  cb.current = onFinished;

  useEffect(() => {
    if (staticBrand || offline || whiteOnly) return;
    const anim = Animated.sequence([
      Animated.delay(HOLD_MS),
      Animated.timing(opacity, { toValue: 0, duration: FADE_MS, easing: Easing.out(Easing.quad), useNativeDriver: true }),
    ]);
    anim.start(({ finished }) => {
      if (finished) cb.current?.();
    });
    return () => anim.stop();
  }, [staticBrand, offline, whiteOnly, opacity]);

  if (staticBrand) {
    return (
      <View style={s.page}>
        <Image source={LOGO} style={{ width: LOGO_W, height: LOGO_H }} resizeMode="contain" accessibilityLabel="Loko Cooks" />
      </View>
    );
  }

  if (offline) {
    return (
      <View style={s.page}>
        <Image source={LOGO} style={{ width: LOGO_W * 0.55, height: LOGO_H * 0.55 }} resizeMode="contain" />
        <Text style={s.offlineTitle}>No internet connection</Text>
        <Text style={s.offlineSub}>Connect to the internet to use Loko Cooks.</Text>
      </View>
    );
  }

  if (whiteOnly) {
    return (
      <View style={s.page}>
        <Spinner />
        {message ? <Text style={s.msg}>{message}</Text> : null}
      </View>
    );
  }

  return (
    <View style={s.page}>
      <Animated.View style={{ opacity, alignItems: "center", justifyContent: "center" }}>
        <Image source={LOGO} style={{ width: LOGO_W, height: LOGO_H }} resizeMode="contain" accessibilityLabel="Loko Cooks" />
      </Animated.View>
    </View>
  );
}

const s = StyleSheet.create({
  page: { flex: 1, backgroundColor: "#FFFFFF", alignItems: "center", justifyContent: "center" },
  offlineTitle: { fontFamily: fonts.title, color: "#1C1B26", fontSize: 18, marginTop: 20 },
  offlineSub: { fontFamily: fonts.body, color: "#6B6A78", marginTop: 6 },
  msg: { fontFamily: fonts.body, color: "#6B6A78", marginTop: 14 },
});
