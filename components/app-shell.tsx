import { ReactNode } from "react";
import { Pressable, StyleSheet, Text, TextInput, View, ViewStyle } from "react-native";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";
import { colors, fonts, radius } from "@/lib/theme";

export function DarkScreen({
  children,
  style,
  edges = ["top"],
}: {
  children: ReactNode;
  style?: ViewStyle;
  edges?: ("top" | "bottom" | "left" | "right")[];
}) {
  return (
    <View style={[styles.root, style]}>
      <SafeAreaView style={{ flex: 1 }} edges={edges}>
        {children}
      </SafeAreaView>
    </View>
  );
}

export function AppHeader({
  title,
  back,
  onMenu,
  right,
}: {
  title?: string;
  back?: boolean;
  onMenu?: () => void;
  right?: ReactNode;
}) {
  return (
    <View style={styles.header}>
      {back ? (
        <Pressable onPress={() => router.back()} style={styles.round} hitSlop={10}>
          <Ionicons name="chevron-back" size={22} color="#fff" />
        </Pressable>
      ) : onMenu ? (
        <Pressable onPress={onMenu} style={styles.round} hitSlop={10}>
          <Ionicons name="menu" size={22} color="#fff" />
        </Pressable>
      ) : (
        <View style={styles.roundGhost} />
      )}
      <Text style={styles.headerTitle} numberOfLines={1}>
        {title || ""}
      </Text>
      {right || <View style={styles.roundGhost} />}
    </View>
  );
}

export function GlassCard({ children, style }: { children: ReactNode; style?: ViewStyle }) {
  return <View style={[styles.glass, style]}>{children}</View>;
}

export function GoldButton({
  label,
  onPress,
  disabled,
}: {
  label: string;
  onPress: () => void;
  disabled?: boolean;
}) {
  return (
    <Pressable onPress={onPress} disabled={disabled} style={[styles.goldBtn, disabled && { opacity: 0.5 }]}>
      <Text style={styles.goldBtnText}>{label}</Text>
    </Pressable>
  );
}

export function DarkField({
  value,
  onChangeText,
  placeholder,
  keyboardType,
}: {
  value: string;
  onChangeText: (t: string) => void;
  placeholder: string;
  keyboardType?: any;
}) {
  return (
    <TextInput
      value={value}
      onChangeText={onChangeText}
      placeholder={placeholder}
      placeholderTextColor="#8A8A8A"
      keyboardType={keyboardType}
      style={styles.field}
    />
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.night },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingBottom: 10,
    gap: 10,
  },
  headerTitle: {
    flex: 1,
    color: "#fff",
    fontFamily: fonts.title,
    fontSize: 18,
    textAlign: "center",
  },
  round: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.1)",
    alignItems: "center",
    justifyContent: "center",
  },
  roundGhost: { width: 40, height: 40 },
  glass: {
    backgroundColor: colors.glass,
    borderWidth: 1,
    borderColor: colors.glassLine,
    borderRadius: radius.md,
  },
  goldBtn: {
    height: 54,
    borderRadius: radius.pill,
    backgroundColor: colors.gold,
    alignItems: "center",
    justifyContent: "center",
  },
  goldBtnText: { color: colors.ink, fontFamily: fonts.title, fontSize: 16 },
  field: {
    height: 54,
    borderRadius: radius.md,
    backgroundColor: "#161616",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
    paddingHorizontal: 16,
    color: "#fff",
    fontFamily: fonts.body,
    fontSize: 16,
    marginBottom: 10,
  },
});
