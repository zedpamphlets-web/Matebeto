import { ReactNode } from "react";
import { Image, KeyboardAvoidingView, Platform, Pressable, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { StatusBar } from "expo-status-bar";
import { SafeAreaView } from "react-native-safe-area-context";
import { fonts, ui } from "@/lib/theme";
import { SpinPressable } from "@/components/spin-pressable";

/** Shared frame for the login screens, laid out like Yango's: logo, big heading, one input, terms, one button. */
export function AuthScreen({
  heading,
  sub,
  children,
  footer,
  onBack,
  buttonLabel,
  onPress,
  loading,
  disabled,
}: {
  heading: string;
  sub?: string;
  children: ReactNode;
  footer?: ReactNode;
  onBack?: () => void;
  buttonLabel: string;
  onPress: () => void | Promise<unknown>;
  loading?: boolean;
  disabled?: boolean;
}) {
  return (
    <View style={s.root}>
      <StatusBar style="dark" />
      <SafeAreaView style={{ flex: 1 }}>
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
          <View style={s.top}>
            {onBack ? (
              <Pressable onPress={onBack} hitSlop={14} style={s.back} accessibilityLabel="Go back">
                <Ionicons name="chevron-back" size={26} color={ui.ink} />
              </Pressable>
            ) : (
              <View style={s.back} />
            )}
            <Image source={require("../assets/logo-wordmark-cropped.png")} style={s.logo} resizeMode="contain" />
            <View style={s.back} />
          </View>

          <View style={s.body}>
            <Text style={s.heading}>{heading}</Text>
            {sub ? <Text style={s.sub}>{sub}</Text> : null}
            <View style={{ marginTop: 22 }}>{children}</View>
          </View>

          <View style={s.bottom}>
            {footer}
            <SpinPressable
              onPress={onPress}
              loading={loading}
              disabled={disabled}
              spinnerColor="#fff"
              style={[s.button, disabled && { backgroundColor: "#D9D9DE", opacity: 1 }]}
            >
              <Text style={[s.buttonText, disabled && { color: "#8E8D99" }]}>{buttonLabel}</Text>
            </SpinPressable>
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#FFFFFF" },
  top: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, paddingTop: 8 },
  back: { width: 40, height: 40, justifyContent: "center" },
  logo: { width: 150, height: 65 },
  body: { flex: 1, paddingHorizontal: 20, paddingTop: 44 },
  heading: {
    fontFamily: fonts.display,
    fontSize: 30,
    lineHeight: 34,
    letterSpacing: -1.2,
    color: "#1C1B26",
    textTransform: "uppercase",
  },
  sub: { fontFamily: fonts.body, fontSize: 17, color: "#1C1B26", marginTop: 10 },
  bottom: { paddingHorizontal: 20, paddingBottom: 18, paddingTop: 10 },
  button: { height: 54, borderRadius: 14, backgroundColor: "#D6263A", alignItems: "center", justifyContent: "center", marginTop: 14 },
  buttonText: { fontFamily: fonts.title, fontSize: 16, color: "#FFFFFF" },
});
