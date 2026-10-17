import { useCallback, useEffect, useRef, useState } from "react";
import { Animated, AppState, Easing, Pressable, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { router, useFocusEffect } from "expo-router";
import * as Notifications from "expo-notifications";
import { supabase } from "@/lib/supabase";
import { fonts, ui } from "@/lib/theme";

/** Bell with a red unread count. The bell and number shake when new notifications arrive. */
export function NotificationBell() {
  const [count, setCount] = useState(0);
  const prev = useRef(0);
  const shake = useRef(new Animated.Value(0)).current;

  const refresh = useCallback(async () => {
    try {
      const { data } = await supabase.auth.getSession();
      const uid = data.session?.user.id;
      if (!uid) {
        setCount(0);
        return;
      }
      const { count: n, error } = await supabase
        .from("user_notifications")
        .select("id", { count: "exact", head: true })
        .eq("user_id", uid)
        .is("read_at", null);
      if (!error) setCount(n ?? 0);
    } catch {
      // Keep the last known number if the network is down.
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      refresh();
      const timer = setInterval(refresh, 20000);
      return () => clearInterval(timer);
    }, [refresh])
  );

  useEffect(() => {
    const appState = AppState.addEventListener("change", (state) => {
      if (state === "active") refresh();
    });
    let received: { remove: () => void } | undefined;
    try {
      received = Notifications.addNotificationReceivedListener(() => {
        setTimeout(refresh, 1500);
      });
    } catch {
      // Notifications unavailable: polling still keeps the number fresh.
    }
    return () => {
      appState.remove();
      received?.remove();
    };
  }, [refresh]);

  useEffect(() => {
    if (count > prev.current) {
      shake.setValue(0);
      Animated.loop(
        Animated.sequence([
          Animated.timing(shake, { toValue: 1, duration: 70, easing: Easing.linear, useNativeDriver: true }),
          Animated.timing(shake, { toValue: -1, duration: 70, easing: Easing.linear, useNativeDriver: true }),
          Animated.timing(shake, { toValue: 1, duration: 70, easing: Easing.linear, useNativeDriver: true }),
          Animated.timing(shake, { toValue: -1, duration: 70, easing: Easing.linear, useNativeDriver: true }),
          Animated.timing(shake, { toValue: 0, duration: 70, easing: Easing.linear, useNativeDriver: true }),
          Animated.delay(350),
        ]),
        { iterations: 3 }
      ).start();
    }
    prev.current = count;
  }, [count, shake]);

  const rotate = shake.interpolate({ inputRange: [-1, 1], outputRange: ["-16deg", "16deg"] });
  const label = count > 99 ? "99+" : String(count);

  return (
    <Pressable
      onPress={() => router.push("/(customer)/notifications")}
      hitSlop={12}
      accessibilityLabel={count > 0 ? `Notifications, ${count} unread` : "Notifications"}
      style={s.bell}
    >
      <Animated.View style={{ transform: [{ rotate }] }}>
        <Ionicons name="notifications" size={22} color={ui.ink} />
        {count > 0 ? (
          <View style={s.badge}>
            <Text style={s.badgeText}>{label}</Text>
          </View>
        ) : null}
      </Animated.View>
    </Pressable>
  );
}

const s = StyleSheet.create({
  bell: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#F5F5F7",
    alignItems: "center",
    justifyContent: "center",
  },
  badge: {
    position: "absolute",
    top: -9,
    right: -11,
    minWidth: 19,
    height: 19,
    paddingHorizontal: 4,
    borderRadius: 10,
    backgroundColor: "#E5202E",
    borderWidth: 1.5,
    borderColor: "#F5F5F7",
    alignItems: "center",
    justifyContent: "center",
  },
  badgeText: { color: "#fff", fontFamily: fonts.title, fontSize: 10.5, lineHeight: 13 },
});
