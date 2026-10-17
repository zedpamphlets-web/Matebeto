import { ReactNode } from "react";
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
  ViewStyle,
  TextStyle,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { colors, fonts, radius, space } from "@/lib/theme";
import { SpinPressable } from "@/components/spin-pressable";

export function Screen({ children, style }: { children: ReactNode; style?: ViewStyle }) {
  return <View style={[styles.screen, style]}>{children}</View>;
}

export function Title({ children, style }: { children: ReactNode; style?: TextStyle }) {
  return <Text style={[styles.title, style]}>{children}</Text>;
}

export function Sub({ children, style }: { children: ReactNode; style?: TextStyle }) {
  return <Text style={[styles.sub, style]}>{children}</Text>;
}

export function Card({ children, style }: { children: ReactNode; style?: ViewStyle }) {
  return <View style={[styles.card, style]}>{children}</View>;
}

export function PrimaryButton({
  label,
  onPress,
  color = "#D6263A",
  textColor,
  disabled,
  loading,
}: {
  label: string;
  onPress: () => void | Promise<unknown>;
  color?: string;
  textColor?: string;
  disabled?: boolean;
  loading?: boolean;
}) {
  const isLight = color.toLowerCase() === "#fff" || color.toLowerCase() === "#ffffff";
  return (
    <SpinPressable
      onPress={onPress}
      disabled={disabled}
      loading={loading}
      spinnerColor={textColor || (isLight ? "#1C1B26" : "#fff")}
      style={[styles.btn, { backgroundColor: color }, isLight && { borderWidth: 1, borderColor: "#E3E2E8" }]}
    >
      <Text style={[styles.btnText, { color: textColor || (isLight ? "#1C1B26" : "#fff") }]}>{label}</Text>
    </SpinPressable>
  );
}

export function Field({
  value,
  onChangeText,
  placeholder,
  keyboardType,
  secure,
}: {
  value: string;
  onChangeText: (t: string) => void;
  placeholder: string;
  keyboardType?: any;
  secure?: boolean;
}) {
  return (
    <TextInput
      value={value}
      onChangeText={onChangeText}
      placeholder={placeholder}
      placeholderTextColor={colors.muted}
      keyboardType={keyboardType}
      secureTextEntry={secure}
      style={styles.input}
    />
  );
}

export function CheckRow({
  label,
  on,
  onPress,
}: {
  label: string;
  on: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable onPress={onPress} style={styles.checkRow}>
      <View style={[styles.box, on && styles.boxOn]}>
        {on ? <Ionicons name="checkmark" size={16} color="#fff" /> : null}
      </View>
      <Text style={styles.checkLabel}>{label}</Text>
    </Pressable>
  );
}

export function QtyStepper({
  value,
  onChange,
}: {
  value: number;
  onChange: (n: number) => void;
}) {
  return (
    <View style={styles.stepWrap}>
      <Pressable onPress={() => onChange(Math.max(1, value - 1))} style={styles.stepBtn}>
        <Text style={styles.stepTxt}>−</Text>
      </Pressable>
      <Text style={styles.stepVal}>{value}</Text>
      <Pressable onPress={() => onChange(value + 1)} style={styles.stepBtn}>
        <Text style={styles.stepTxt}>+</Text>
      </Pressable>
    </View>
  );
}

export function MoneyRow({
  label,
  value,
  bold,
  light,
}: {
  label: string;
  value: string;
  bold?: boolean;
  light?: boolean;
}) {
  const color = light ? "#fff" : colors.ink;
  return (
    <View style={styles.moneyRow}>
      <Text style={[styles.moneyLabel, { color }, bold && styles.moneyBold]}>{label}</Text>
      <Text style={[styles.moneyValue, { color }, bold && styles.moneyBold]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.cream, padding: space.lg },
  title: {
    fontSize: 28,
    fontFamily: fonts.display,
    color: colors.ink,
    letterSpacing: -0.6,
  },
  sub: {
    fontSize: 15,
    fontFamily: fonts.body,
    color: colors.muted,
    marginTop: 6,
    lineHeight: 22,
  },
  card: {
    backgroundColor: colors.card,
    borderRadius: radius.md,
    padding: space.md,
    borderWidth: 1,
    borderColor: colors.line,
  },
  btn: {
    height: 54,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  btnText: { fontSize: 16, fontFamily: fonts.title },
  input: {
    height: 54,
    borderRadius: radius.md,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.line,
    paddingHorizontal: 16,
    fontSize: 16,
    fontFamily: fonts.body,
    color: colors.ink,
  },
  checkRow: { flexDirection: "row", alignItems: "center", paddingVertical: 11 },
  box: {
    width: 24,
    height: 24,
    borderRadius: 7,
    marginRight: 12,
    backgroundColor: "#fff",
    borderWidth: 1.5,
    borderColor: colors.line,
    alignItems: "center",
    justifyContent: "center",
  },
  boxOn: { backgroundColor: "#D6263A", borderColor: "#D6263A" },
  checkLabel: { fontFamily: fonts.bodySemi, fontSize: 16, color: colors.ink },
  stepWrap: { flexDirection: "row", alignItems: "center", marginVertical: 12 },
  stepBtn: {
    width: 44,
    height: 44,
    borderRadius: radius.sm,
    backgroundColor: "#fff",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: colors.line,
  },
  stepTxt: { fontSize: 22, fontFamily: fonts.title, color: colors.ink },
  stepVal: { marginHorizontal: 18, fontSize: 20, fontFamily: fonts.display, color: colors.ink },
  moneyRow: { flexDirection: "row", justifyContent: "space-between", marginTop: 10 },
  moneyLabel: { fontFamily: fonts.bodySemi, color: colors.ink, fontSize: 15 },
  moneyValue: { fontFamily: fonts.bodySemi, color: colors.ink, fontSize: 15 },
  moneyBold: { fontFamily: fonts.display, fontSize: 18 },
});
