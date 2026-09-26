import { useEffect } from "react";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useFonts, Sora_700Bold, Sora_800ExtraBold } from "@expo-google-fonts/sora";
import { Inter_400Regular, Inter_600SemiBold } from "@expo-google-fonts/inter";
import * as SplashScreen from "expo-splash-screen";
import { colors } from "@/lib/theme";

SplashScreen.preventAutoHideAsync().catch(() => {});

export default function Root() {
  const [loaded, error] = useFonts({
    Sora_700Bold,
    Sora_800ExtraBold,
    Inter_400Regular,
    Inter_600SemiBold,
  });

  useEffect(() => {
    if (loaded || error) SplashScreen.hideAsync().catch(() => {});
  }, [loaded, error]);

  if (!loaded && !error) return null;

  return (
    <>
      <StatusBar style="dark" />
      <Stack
        screenOptions={{
          headerShadowVisible: false,
          headerTintColor: colors.ink,
          headerStyle: { backgroundColor: colors.cream },
          contentStyle: { backgroundColor: colors.cream },
          headerTitleStyle: { fontWeight: "800" },
        }}
      >
        <Stack.Screen name="index" options={{ headerShown: false }} />
        <Stack.Screen name="auth/phone" options={{ title: "Sign in" }} />
        <Stack.Screen name="auth/otp" options={{ title: "Enter OTP" }} />
        <Stack.Screen name="auth/rider-apply" options={{ title: "Rider application" }} />
        <Stack.Screen name="(customer)" options={{ headerShown: false }} />
        <Stack.Screen name="(rider)" options={{ headerShown: false }} />
        <Stack.Screen name="admin" options={{ headerShown: false }} />
        <Stack.Screen name="order/[id]" options={{ title: "Order" }} />
      </Stack>
    </>
  );
}
