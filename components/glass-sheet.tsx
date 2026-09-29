import { ReactNode } from "react";
import { StyleSheet, View, ViewStyle } from "react-native";

/** Frosted white glass panel that sits over a food/banner background. */
export function GlassSheet({
  children,
  style,
  topRadius = 32,
}: {
  children: ReactNode;
  style?: ViewStyle;
  topRadius?: number;
}) {
  return (
    <View
      style={[
        styles.sheet,
        {
          borderTopLeftRadius: topRadius,
          borderTopRightRadius: topRadius,
        },
        style,
      ]}
    >
      {children}
    </View>
  );
}

/** Single glass row card like the reference service list. */
export function GlassCard({
  children,
  style,
}: {
  children: ReactNode;
  style?: ViewStyle;
}) {
  return <View style={[styles.card, style]}>{children}</View>;
}

const styles = StyleSheet.create({
  sheet: {
    flex: 1,
    backgroundColor: "rgba(255,255,255,0.88)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.55)",
    borderBottomWidth: 0,
    paddingHorizontal: 16,
    paddingTop: 20,
    paddingBottom: 28,
    shadowColor: "#000",
    shadowOpacity: 0.18,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: -6 },
    elevation: 10,
  },
  card: {
    backgroundColor: "rgba(255,255,255,0.72)",
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.65)",
    paddingVertical: 14,
    paddingHorizontal: 14,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOpacity: 0.12,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
  },
});
