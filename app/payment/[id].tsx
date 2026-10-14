import { useCallback, useEffect, useRef, useState } from "react";
import { Alert, Animated, BackHandler, Easing, Pressable, Text, View } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { DarkScreen, GoldButton } from "@/components/app-shell";
import { colors, fonts } from "@/lib/theme";
import { supabase } from "@/lib/supabase";
import { startLipilaPayment, verifyLipilaPayment } from "@/lib/payments";
import type { LipilaProvider } from "@/lib/lipila";

type Phase = "starting" | "waiting" | "success" | "failed" | "slow";

const POLL_MS = 3000;
const SLOW_AFTER_MS = 150000;

export default function PaymentProcessing() {
  const { id, phone, provider } = useLocalSearchParams<{ id: string; phone?: string; provider?: string }>();
  const [phase, setPhase] = useState<Phase>("starting");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const phaseRef = useRef<Phase>("starting");
  const startedAt = useRef(0);
  const spin = useRef(new Animated.Value(0)).current;
  const pop = useRef(new Animated.Value(0)).current;

  const go = useCallback((p: Phase, msg = "") => {
    phaseRef.current = p;
    setPhase(p);
    setMessage(msg);
  }, []);

  // The plate turns while we wait
  useEffect(() => {
    const loop = Animated.loop(Animated.timing(spin, { toValue: 1, duration: 2600, easing: Easing.linear, useNativeDriver: true }));
    loop.start();
    return () => loop.stop();
  }, [spin]);

  // Result icon pops in
  useEffect(() => {
    if (phase === "success" || phase === "failed" || phase === "slow") {
      pop.setValue(0);
      Animated.spring(pop, { toValue: 1, friction: 5, useNativeDriver: true }).start();
    }
  }, [phase, pop]);

  // No going back while the payment is being processed
  useEffect(() => {
    const sub = BackHandler.addEventListener("hardwareBackPress", () => phaseRef.current === "starting" || phaseRef.current === "waiting");
    return () => sub.remove();
  }, []);

  const begin = useCallback(async () => {
    go("starting");
    try {
      await startLipilaPayment({ provider: (provider as LipilaProvider) || "mtn", orderId: String(id), phone: String(phone || "") });
      startedAt.current = Date.now();
      go("waiting");
    } catch (e: any) {
      go("failed", e?.message || "We could not start the payment.");
    }
  }, [id, phone, provider, go]);

  useEffect(() => {
    begin();
  }, [begin]);

  // While waiting: ask the server and read the order every few seconds
  useEffect(() => {
    if (phase !== "waiting") return;
    let stopped = false;
    const tick = async () => {
      try {
        const v = await verifyLipilaPayment(String(id));
        const { data: o } = await supabase.from("orders").select("status,payment_status").eq("id", id).maybeSingle();
        if (stopped || phaseRef.current !== "waiting") return;
        if (v?.status === "paid" || o?.payment_status === "paid") return go("success");
        if (v?.status === "failed" || o?.payment_status === "failed") return go("failed", "The payment was not completed. You have not been charged for this order.");
        if (o?.status === "CANCELLED") return go("failed", "This order was cancelled.");
      } catch (_e) {
        // try again on the next tick
      }
      if (Date.now() - startedAt.current > SLOW_AFTER_MS && phaseRef.current === "waiting") go("slow");
    };
    const t = setInterval(tick, POLL_MS);
    tick();
    return () => {
      stopped = true;
      clearInterval(t);
    };
  }, [phase, id, go]);

  // Success: show it for a moment, then open the order
  useEffect(() => {
    if (phase !== "success") return;
    const t = setTimeout(() => router.replace(`/order/${id}`), 1800);
    return () => clearTimeout(t);
  }, [phase, id]);

  async function checkAgain() {
    setBusy(true);
    try {
      const v = await verifyLipilaPayment(String(id));
      if (v?.status === "paid") return go("success");
      if (v?.status === "failed") return go("failed", "The payment was not completed. You have not been charged for this order.");
      Alert.alert("Still waiting", "We have not received the payment yet. Approve it on your phone, then check again.");
    } finally {
      setBusy(false);
    }
  }

  function cancelOrder() {
    Alert.alert("Cancel this order?", "The order will be cancelled. If anything was taken it will be marked for a refund.", [
      { text: "Keep order", style: "cancel" },
      {
        text: "Cancel order",
        style: "destructive",
        onPress: async () => {
          const { error } = await supabase.rpc("customer_cancel", { p_order: id });
          if (error) return Alert.alert("Could not cancel", error.message);
          router.replace("/(customer)");
        },
      },
    ]);
  }

  const rotate = spin.interpolate({ inputRange: [0, 1], outputRange: ["0deg", "360deg"] });
  const popScale = pop.interpolate({ inputRange: [0, 1], outputRange: [0.4, 1] });
  const processing = phase === "starting" || phase === "waiting";

  return (
    <DarkScreen>
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center", padding: 28 }}>
        {processing && (
          <>
            <Animated.View
              style={{
                width: 170,
                height: 170,
                borderRadius: 85,
                backgroundColor: "#fff",
                borderWidth: 10,
                borderColor: colors.gold,
                alignItems: "center",
                justifyContent: "center",
                transform: [{ rotate }],
              }}
            >
              <Text style={{ fontSize: 70 }}>🍗</Text>
            </Animated.View>
            <Text style={{ color: "#fff", fontFamily: fonts.display, fontSize: 26, marginTop: 28, textAlign: "center" }}>
              Processing your payment…
            </Text>
            <Text style={{ color: "#A8A8A8", fontFamily: fonts.body, marginTop: 10, textAlign: "center", lineHeight: 22 }}>
              {phase === "starting"
                ? "Sending the request to your mobile money…"
                : "Approve the payment on your phone and enter your PIN. Please do not close the app."}
            </Text>
          </>
        )}

        {phase === "success" && (
          <Animated.View style={{ alignItems: "center", transform: [{ scale: popScale }] }}>
            <Ionicons name="checkmark-circle" size={120} color={colors.customer} />
            <Text style={{ color: "#fff", fontFamily: fonts.display, fontSize: 28, marginTop: 14 }}>Payment received 🎉</Text>
            <Text style={{ color: "#A8A8A8", fontFamily: fonts.body, marginTop: 8, textAlign: "center" }}>
              Finding your food partner…
            </Text>
          </Animated.View>
        )}

        {phase === "failed" && (
          <Animated.View style={{ alignItems: "center", width: "100%", transform: [{ scale: popScale }] }}>
            <Ionicons name="close-circle" size={120} color={colors.danger} />
            <Text style={{ color: "#fff", fontFamily: fonts.display, fontSize: 28, marginTop: 14 }}>Payment failed 😞</Text>
            <Text style={{ color: "#A8A8A8", fontFamily: fonts.body, marginTop: 10, textAlign: "center", lineHeight: 22 }}>
              {message || "The payment did not go through."}
            </Text>
            <View style={{ width: "100%", marginTop: 26 }}>
              <GoldButton label="Try again" onPress={begin} />
              <View style={{ height: 10 }} />
              <Pressable onPress={() => router.replace("/(customer)/checkout")} style={{ padding: 12, alignItems: "center" }}>
                <Text style={{ color: "#fff", fontFamily: fonts.bodySemi }}>Use a different number</Text>
              </Pressable>
              <Pressable onPress={cancelOrder} style={{ padding: 12, alignItems: "center" }}>
                <Text style={{ color: colors.danger, fontFamily: fonts.bodySemi }}>Cancel order</Text>
              </Pressable>
            </View>
          </Animated.View>
        )}

        {phase === "slow" && (
          <Animated.View style={{ alignItems: "center", width: "100%", transform: [{ scale: popScale }] }}>
            <Ionicons name="time" size={110} color={colors.gold} />
            <Text style={{ color: "#fff", fontFamily: fonts.display, fontSize: 26, marginTop: 14, textAlign: "center" }}>
              This is taking longer than usual ⏳
            </Text>
            <Text style={{ color: "#A8A8A8", fontFamily: fonts.body, marginTop: 10, textAlign: "center", lineHeight: 22 }}>
              If you already entered your PIN, the payment may still arrive. Check again in a moment.
            </Text>
            <View style={{ width: "100%", marginTop: 26 }}>
              <GoldButton label={busy ? "Checking…" : "Check again"} onPress={checkAgain} disabled={busy} />
              <View style={{ height: 10 }} />
              <Pressable onPress={() => router.replace(`/order/${id}`)} style={{ padding: 12, alignItems: "center" }}>
                <Text style={{ color: "#fff", fontFamily: fonts.bodySemi }}>View my order</Text>
              </Pressable>
              <Pressable onPress={cancelOrder} style={{ padding: 12, alignItems: "center" }}>
                <Text style={{ color: colors.danger, fontFamily: fonts.bodySemi }}>Cancel order</Text>
              </Pressable>
            </View>
          </Animated.View>
        )}
      </View>
    </DarkScreen>
  );
}
