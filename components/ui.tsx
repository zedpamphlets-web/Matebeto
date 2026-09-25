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
  color = colors.gold,
  textColor = colors.ink,
  disabled,
  loading,
}: {
  label: string;
  onPress: () => void;
  color?: string;
  textColor?: string;
  disabled?: boolean;
  loading?: boolean;
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || loading}
      style={[styles.btn, { backgroundColor: color, opacity: disabled ? 0.5 : 1 }]}
    >
      {loading ? (
        <ActivityIndicator color={textColor} />
      ) : (
        <Text style={[styles.btnText, { color: textColor }]}>{label}</Text>
      )}
    </Pressable>
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
        {on ? <Ionicons name="checkmark" size={16} color={colors.ink} /> : null}
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
}: {
  label: string;
  value: string;
  bold?: boolean;
}) {
  return (
    <View style={styles.moneyRow}>
      <Text style={[styles.moneyLabel, bold && styles.moneyBold]}>{label}</Text>
      <Text style={[styles.moneyValue, bold && styles.moneyBold]}>{value}</Text>
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
    height: 56,
    borderRadius: radius.pill,
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
  boxOn: { backgroundColor: colors.gold, borderColor: colors.gold },
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
