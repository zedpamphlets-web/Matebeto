import { useEffect } from "react";
import { Image, View } from "react-native";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useFonts, Sora_700Bold, Sora_800ExtraBold } from "@expo-google-fonts/sora";
import { Inter_400Regular, Inter_600SemiBold } from "@expo-google-fonts/inter";
import { Pacifico_400Regular } from "@expo-google-fonts/pacifico";
import { PlayfairDisplay_400Regular_Italic } from "@expo-google-fonts/playfair-display";
import * as SplashScreen from "expo-splash-screen";

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

  if (!loaded && !error) {
    return (
      <View style={{ flex: 1, backgroundColor: "#000" }}>
        <Image
          source={require("../assets/splash.png")}
          style={{ width: "100%", height: "100%" }}
          resizeMode="contain"
        />
      </View>
    );
  }

  return (
    <>
      <StatusBar style="light" />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: "#000" },
          animation: "fade",
        }}
      >
        <Stack.Screen name="index" />
        <Stack.Screen name="auth/phone" />
        <Stack.Screen name="auth/otp" />
        <Stack.Screen name="auth/rider-apply" options={{ headerShown: true, title: "Rider application", headerTintColor: "#111", contentStyle: { backgroundColor: "#F7F4EE" } }} />
        <Stack.Screen name="(customer)" />
        <Stack.Screen name="(rider)" />
        <Stack.Screen name="admin" />
        <Stack.Screen name="order/[id]" options={{ headerShown: true, title: "Order", headerTintColor: "#111", contentStyle: { backgroundColor: "#F7F4EE" } }} />
      </Stack>
    </>
  );
}
