import { useEffect, useRef, useState } from "react";
import { Animated, Dimensions, Easing, Image, StyleSheet, Text, View } from "react-native";
import { Spinner } from "@/components/spinner";
import { fonts } from "@/lib/theme";
import { onBootReady } from "@/lib/boot";

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

// The logo on the phone's own splash is 52% of a 288dp square = ~150dp tall, centred.
const NATIVE_LOGO_H = 288 * 0.52;
const GROW_MS = 500;
const MIN_TOTAL_MS = 1300;
const MAX_TOTAL_MS = 9000;

/**
 * Launch overlay (sits on top of the whole app, like Yango / Airtel Money).
 * 1. starts with the logo at exactly the size and place of the phone's splash, so there is no jump or blink
 * 2. the logo grows to full size
 * 3. as soon as the first real screen is ready underneath, the overlay fades out and the app is already there
 */
export function LaunchSplash({ onShown }: { onShown?: () => void }) {
  const scale = useRef(new Animated.Value(NATIVE_LOGO_H / LOGO_H)).current;
  const fade = useRef(new Animated.Value(1)).current;
  const [gone, setGone] = useState(false);
  const shown = useRef(false);

  useEffect(() => {
    const start = Date.now();
    let leaving = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const grow = Animated.timing(scale, { toValue: 1, duration: GROW_MS, easing: Easing.out(Easing.cubic), useNativeDriver: true });
    grow.start();

    const leave = () => {
      if (leaving) return;
      leaving = true;
      Animated.timing(fade, { toValue: 0, duration: 320, easing: Easing.out(Easing.quad), useNativeDriver: true }).start(() => setGone(true));
    };
    const unsub = onBootReady(() => {
      const wait = Math.max(0, MIN_TOTAL_MS - (Date.now() - start));
      timer = setTimeout(leave, wait);
    });
    const hard = setTimeout(leave, MAX_TOTAL_MS);
    return () => {
      unsub();
      grow.stop();
      if (timer) clearTimeout(timer);
      clearTimeout(hard);
    };
  }, [scale, fade]);

  if (gone) return null;
  return (
    <Animated.View
      style={[StyleSheet.absoluteFill, s.page, { opacity: fade, zIndex: 100, elevation: 100 }]}
      pointerEvents="auto"
      onLayout={() => {
        if (shown.current) return;
        shown.current = true;
        onShown?.();
      }}
    >
      <Animated.Image
        source={LOGO}
        style={{ width: LOGO_W, height: LOGO_H, transform: [{ scale }] }}
        resizeMode="contain"
        accessibilityLabel="Loko Cooks"
      />
    </Animated.View>
  );
}
