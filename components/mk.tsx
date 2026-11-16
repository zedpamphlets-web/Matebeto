import { ReactNode, useEffect, useRef, useState } from "react";
import { Pressable, StyleProp, StyleSheet, Text, TextInput, View, ViewStyle } from "react-native";
import { router } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { Ionicons } from "@expo/vector-icons";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { fonts, ui } from "@/lib/theme";
import { SpinPressable } from "@/components/spin-pressable";

/**
 * Customer screen. By default the top of the screen is the maroon header colour (light status-bar icons)
 * and an MkHeader sits right under it. Screens that draw their own top use `plain`.
 */
export function MkScreen({
  children,
  edges = ["top"],
  style,
  plain,
}: {
  children: ReactNode;
  edges?: ("top" | "bottom" | "left" | "right")[];
  style?: StyleProp<ViewStyle>;
  plain?: boolean;
}) {
  const insets = useSafeAreaInsets();
  const top = edges.includes("top");
  return (
    <View style={[{ flex: 1, backgroundColor: ui.bg }, style]}>
      <StatusBar style={plain ? "dark" : "light"} />
      {top && !plain ? <View style={{ height: insets.top, backgroundColor: ui.red }} /> : null}
      <SafeAreaView style={{ flex: 1 }} edges={plain ? edges : edges.filter((e) => e !== "top")}>
        {children}
      </SafeAreaView>
    </View>
  );
}

export function goBack(fallback: string = "/(customer)") {
  if (router.canGoBack()) router.back();
  else router.replace(fallback as any);
}

/** Maroon header: back arrow, title (optional second line) on the left, one action on the right. */
export function MkHeader({
  title,
  subtitle,
  right,
  onBack,
}: {
  title: string;
  subtitle?: string;
  right?: ReactNode;
  onBack?: () => void;
}) {
  return (
    <View style={s.header}>
      <Pressable onPress={onBack || (() => goBack())} hitSlop={12} style={s.back} accessibilityLabel="Go back">
        <Ionicons name="chevron-back" size={26} color="#fff" />
      </Pressable>
      <View style={s.titleWrap}>
        <Text style={s.title} numberOfLines={1}>
          {title}
        </Text>
        {subtitle ? (
          <Text style={s.subtitle} numberOfLines={1}>
            {subtitle}
          </Text>
        ) : null}
      </View>
      <View style={s.right}>{right}</View>
    </View>
  );
}

export function HeartButton({ on, onPress }: { on: boolean; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} hitSlop={12} accessibilityLabel={on ? "Remove from favourites" : "Add to favourites"}>
      <Ionicons name={on ? "heart" : "heart-outline"} size={24} color="#fff" />
    </Pressable>
  );
}

/** Pink strip pinned to the bottom, e.g. "Back to Markets". */
export function BackStrip({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={s.strip}>
      <Ionicons name="arrow-back" size={18} color={ui.red} />
      <Text style={s.stripText}>{label}</Text>
    </Pressable>
  );
}

export function RedButton({
  label,
  onPress,
  icon,
  chevron,
  disabled,
  loading,
  style,
}: {
  label: string;
  onPress: () => void | Promise<unknown>;
  icon?: keyof typeof Ionicons.glyphMap;
  chevron?: boolean;
  disabled?: boolean;
  loading?: boolean;
  style?: StyleProp<ViewStyle>;
}) {
  return (
    <SpinPressable
      onPress={onPress}
      disabled={disabled}
      loading={loading}
      spinnerColor="#fff"
      style={[s.redBtn, disabled && { opacity: 0.5 }, style]}
    >
      <View style={s.redBtnInner}>
        <View style={s.redBtnSide}>{icon ? <Ionicons name={icon} size={20} color="#fff" /> : null}</View>
        <Text style={s.redBtnText} numberOfLines={1}>
          {label}
        </Text>
        <View style={[s.redBtnSide, { alignItems: "flex-end" }]}>
          {chevron ? <Ionicons name="chevron-forward" size={18} color="#fff" /> : null}
        </View>
      </View>
    </SpinPressable>
  );
}

export function Checkbox({ on }: { on: boolean }) {
  return (
    <View style={[s.check, on && { backgroundColor: ui.btn, borderColor: ui.btn }]}>
      {on ? <Ionicons name="checkmark" size={15} color="#fff" /> : null}
    </View>
  );
}

export function MkField({
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
  // The box keeps its own text so typing is never held up (or wiped) by a slow screen or a late server answer.
  const [text, setText] = useState(value);
  const last = useRef(value);
  useEffect(() => {
    if (value !== last.current) {
      last.current = value;
      setText(value);
    }
  }, [value]);
  return (
    <TextInput
      value={text}
      onChangeText={(t) => {
        last.current = t;
        setText(t);
        onChangeText(t);
      }}
      placeholder={placeholder}
      placeholderTextColor={ui.hint}
      keyboardType={keyboardType}
      style={s.field}
    />
  );
}

/** Round stepper: grey minus, number, red plus. */
export function MkStepper({
  value,
  onChange,
  min = 1,
  small,
}: {
  value: number;
  onChange: (n: number) => void;
  min?: number;
  small?: boolean;
}) {
  const d = small ? 26 : 30;
  return (
    <View style={[s.stepper, small && { paddingHorizontal: 0, backgroundColor: "transparent", borderWidth: 0 }]}>
      <Pressable
        onPress={() => onChange(Math.max(min, value - 1))}
        style={[s.stepBtn, { width: d, height: d, borderRadius: d / 2, backgroundColor: "#EDEDF0" }]}
        hitSlop={6}
        accessibilityLabel="Less"
      >
        <Ionicons name="remove" size={16} color={ui.ink} />
      </Pressable>
      <Text style={[s.stepNum, small && { minWidth: 22 }]}>{value}</Text>
      <Pressable
        onPress={() => onChange(value + 1)}
        style={[s.stepBtn, { width: d, height: d, borderRadius: d / 2, backgroundColor: ui.btn }]}
        hitSlop={6}
        accessibilityLabel="More"
      >
        <Ionicons name="add" size={16} color="#fff" />
      </Pressable>
    </View>
  );
}

const s = StyleSheet.create({
  header: { flexDirection: "row", alignItems: "center", paddingLeft: 10, paddingRight: 16, paddingTop: 4, paddingBottom: 14, backgroundColor: ui.red },
  back: { width: 36, height: 36, justifyContent: "center" },
  titleWrap: { flex: 1, paddingRight: 8 },
  right: { minWidth: 28, alignItems: "flex-end", justifyContent: "center" },
  title: { fontFamily: fonts.title, fontSize: 19, color: "#fff" },
  subtitle: { fontFamily: fonts.body, fontSize: 12.5, color: "rgba(255,255,255,0.85)", marginTop: 1 },
  strip: {
    height: 52,
    backgroundColor: ui.redSoft,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    gap: 10,
  },
  stripText: { fontFamily: fonts.title, fontSize: 14, color: ui.red },
  redBtn: { height: 54, borderRadius: 14, backgroundColor: ui.btn, justifyContent: "center" },
  redBtnInner: { flexDirection: "row", alignItems: "center", paddingHorizontal: 18 },
  redBtnSide: { width: 28, justifyContent: "center" },
  redBtnText: { flex: 1, textAlign: "center", color: "#fff", fontFamily: fonts.title, fontSize: 15 },
  check: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 1.5,
    borderColor: ui.checkOff,
    backgroundColor: "#fff",
    alignItems: "center",
    justifyContent: "center",
  },
  field: {
    height: 52,
    borderRadius: 14,
    backgroundColor: ui.field,
    borderWidth: 1,
    borderColor: ui.line,
    paddingHorizontal: 16,
    color: ui.ink,
    fontFamily: fonts.body,
    fontSize: 15,
    marginBottom: 10,
  },
  stepper: {
    flexDirection: "row",
    alignItems: "center",
    height: 52,
    paddingHorizontal: 8,
    borderRadius: 14,
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: ui.line,
  },
  stepBtn: { alignItems: "center", justifyContent: "center" },
  stepNum: { minWidth: 30, textAlign: "center", fontFamily: fonts.title, fontSize: 16, color: ui.ink },
});
