import { ReactNode } from "react";
import { Pressable, StyleSheet, Text, TextInput, View, ViewStyle } from "react-native";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";
import { colors, fonts, radius } from "@/lib/theme";
import { SpinPressable } from "@/components/spin-pressable";

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
          <Ionicons name="chevron-back" size={22} color="#1C1B26" />
        </Pressable>
      ) : onMenu ? (
        <Pressable onPress={onMenu} style={styles.round} hitSlop={10}>
          <Ionicons name="menu" size={22} color="#1C1B26" />
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
  loading,
}: {
  label: string;
  onPress: () => void | Promise<unknown>;
  disabled?: boolean;
  loading?: boolean;
}) {
  return (
    <SpinPressable
      onPress={onPress}
      disabled={disabled}
      loading={loading}
      spinnerColor="#fff"
      style={styles.goldBtn}
    >
      <Text style={styles.goldBtnText}>{label}</Text>
    </SpinPressable>
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
      placeholderTextColor="#8E8D99"
      keyboardType={keyboardType}
      style={styles.field}
    />
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#FFFFFF" },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingBottom: 10,
    gap: 10,
  },
  headerTitle: {
    flex: 1,
    color: "#1C1B26",
    fontFamily: fonts.title,
    fontSize: 18,
    textAlign: "center",
  },
  round: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(0,0,0,0.06)",
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
    borderRadius: 14,
    backgroundColor: "#D6263A",
    alignItems: "center",
    justifyContent: "center",
  },
  goldBtnText: { color: "#FFFFFF", fontFamily: fonts.title, fontSize: 16 },
  field: {
    height: 54,
    borderRadius: 14,
    backgroundColor: "#F5F5F7",
    borderWidth: 1,
    borderColor: "#EBEBEF",
    paddingHorizontal: 16,
    color: "#1C1B26",
    fontFamily: fonts.body,
    fontSize: 16,
    marginBottom: 10,
  },
});
