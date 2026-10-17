import "react-native-url-polyfill/auto";
import { useEffect } from "react";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useFonts, Sora_700Bold, Sora_800ExtraBold } from "@expo-google-fonts/sora";
import { Inter_400Regular, Inter_600SemiBold } from "@expo-google-fonts/inter";
import { Pacifico_400Regular } from "@expo-google-fonts/pacifico";
import { PlayfairDisplay_400Regular_Italic } from "@expo-google-fonts/playfair-display";
import * as SplashScreen from "expo-splash-screen";
import { BrandSplash } from "@/components/brand-splash";
import { ConfirmHost } from "@/components/confirm";
import { startPush } from "@/lib/push";
import { colors } from "@/lib/theme";

SplashScreen.preventAutoHideAsync().catch(() => {});

export default function Root() {
  const [loaded, error] = useFonts({
    Sora_700Bold,
    Sora_800ExtraBold,
    Inter_400Regular,
    Inter_600SemiBold,
    Pacifico_400Regular,
    PlayfairDisplay_400Regular_Italic,
  });

  useEffect(() => {
    if (loaded || error) SplashScreen.hideAsync().catch(() => {});
  }, [loaded, error]);

  useEffect(() => startPush(), []);

  if (!loaded && !error) {
    return <BrandSplash staticBrand />;
  }

  return (
    <>
      <StatusBar style="dark" />
      <ConfirmHost />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: "#FFFFFF" },
          animation: "fade",
        }}
      >
        <Stack.Screen name="index" />
        <Stack.Screen name="finding" options={{ gestureEnabled: false, animation: "fade" }} />
        <Stack.Screen name="auth/phone" />
        <Stack.Screen name="auth/otp" />
        <Stack.Screen name="auth/rider-apply" options={{ headerShown: false, contentStyle: { backgroundColor: "#FFFFFF" } }} />
        <Stack.Screen name="(customer)" options={{ contentStyle: { backgroundColor: "#FFFFFF" } }} />
        <Stack.Screen name="(rider)" />
        <Stack.Screen name="admin" options={{ contentStyle: { backgroundColor: "#FFFFFF" } }} />
        <Stack.Screen name="payment/[id]" options={{ headerShown: false, gestureEnabled: false, contentStyle: { backgroundColor: "#FFFFFF" } }} />
        <Stack.Screen
          name="order/[id]"
          options={{
            headerShown: true,
            title: "Order",
            headerTintColor: "#111",
            contentStyle: { backgroundColor: "#FFFFFF" },
          }}
        />
      </Stack>
    </>
  );
}
