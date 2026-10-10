import { useEffect, useRef } from "react";
import { Animated, Easing, StyleSheet, View, ViewStyle } from "react-native";

/** A single pulsing placeholder block. The base unit for every skeleton below. */
export function SkeletonBlock({
  width = "100%",
  height = 14,
  radius = 8,
  style,
  dark,
}: {
  width?: number | `${number}%`;
  height?: number;
  radius?: number;
  style?: ViewStyle;
  dark?: boolean;
}) {
  const pulse = useRef(new Animated.Value(0.35)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, {
          toValue: 1,
          duration: 650,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(pulse, {
          toValue: 0.35,
          duration: 650,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [pulse]);

  return (
    <Animated.View
      style={[
        {
          width,
          height,
          borderRadius: radius,
          backgroundColor: dark ? "rgba(255,255,255,0.14)" : "rgba(17,17,17,0.09)",
          opacity: pulse,
        },
        style,
      ]}
    />
  );
}

/** Home screen: market chip row + featured hero/grid placeholders. */
export function HomeSkeleton() {
  return (
    <View>
      <View style={styles.sectionHead}>
        <SkeletonBlock width={90} height={16} />
      </View>
      <View style={styles.chipRow}>
        {[0, 1, 2, 3].map((i) => (
          <View key={i} style={styles.chip}>
            <SkeletonBlock width={72} height={72} radius={18} style={{ marginBottom: 8 }} />
            <SkeletonBlock width={60} height={10} />
          </View>
        ))}
      </View>

      <View style={[styles.sectionHead, { marginTop: 22 }]}>
        <SkeletonBlock width={140} height={16} />
      </View>
      <SkeletonBlock width="100%" height={180} radius={22} style={{ marginBottom: 12 }} />
      <View style={styles.grid}>
        {[0, 1].map((i) => (
          <View key={i} style={styles.gridCard}>
            <SkeletonBlock width="100%" height={110} radius={0} />
            <View style={{ padding: 10 }}>
              <SkeletonBlock width="80%" height={12} style={{ marginBottom: 8 }} />
              <SkeletonBlock width={50} height={12} />
            </View>
          </View>
        ))}
      </View>
    </View>
  );
}

/** Basket screen: a couple of line-item placeholder rows. */
export function BasketSkeleton() {
  return (
    <View>
      {[0, 1, 2].map((i) => (
        <View key={i} style={styles.basketRow}>
          <SkeletonBlock width={64} height={64} radius={12} />
          <View style={{ flex: 1, marginLeft: 10 }}>
            <SkeletonBlock width="70%" height={13} style={{ marginBottom: 8 }} />
            <SkeletonBlock width="40%" height={11} style={{ marginBottom: 8 }} />
            <SkeletonBlock width={60} height={13} />
          </View>
        </View>
      ))}
    </View>
  );
}

/** Orders screen: a few order-card placeholders. */
export function OrdersSkeleton() {
  return (
    <View>
      {[0, 1, 2].map((i) => (
        <View key={i} style={styles.orderCard}>
          <SkeletonBlock width={110} height={14} style={{ marginBottom: 8 }} />
          <SkeletonBlock width={160} height={11} style={{ marginBottom: 8 }} />
          <SkeletonBlock width={80} height={16} />
        </View>
      ))}
    </View>
  );
}

/** Admin dashboard: dark-mode order-card placeholders. */
export function AdminOrdersSkeleton() {
  return (
    <View>
      {[0, 1, 2, 3].map((i) => (
        <View key={i} style={styles.adminCard}>
          <SkeletonBlock dark width={150} height={14} style={{ marginBottom: 8 }} />
          <SkeletonBlock dark width={200} height={11} style={{ marginBottom: 10 }} />
          <View style={{ flexDirection: "row", gap: 8 }}>
            <SkeletonBlock dark width={90} height={30} radius={10} />
            <SkeletonBlock dark width={90} height={30} radius={10} />
          </View>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  sectionHead: { marginBottom: 14 },
  chipRow: { flexDirection: "row", gap: 12 },
  chip: { width: 96, alignItems: "center" },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 12 },
  gridCard: {
    width: "47%",
    backgroundColor: "#fff",
    borderRadius: 18,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "rgba(17,17,17,0.06)",
  },
  basketRow: {
    flexDirection: "row",
    backgroundColor: "rgba(255,255,255,0.75)",
    borderRadius: 18,
    padding: 12,
    marginBottom: 10,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.6)",
  },
  orderCard: {
    backgroundColor: "rgba(255,255,255,0.78)",
    borderRadius: 18,
    padding: 16,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.6)",
  },
  adminCard: {
    backgroundColor: "rgba(255,255,255,0.08)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.14)",
    borderRadius: 18,
    padding: 14,
    marginBottom: 10,
  },
});
