import { Pressable, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { colors, fonts } from "@/lib/theme";

/** Shown in place of a skeleton once a load has genuinely failed because there's no internet —
 * so a screen never spins/loads forever with no way out. */
export function OfflineNotice({ onRetry, dark }: { onRetry: () => void; dark?: boolean }) {
  const text = dark ? colors.adminText : colors.ink;
  const sub = dark ? colors.adminMuted : colors.muted;
  return (
    <View style={{ alignItems: "center", paddingVertical: 40, paddingHorizontal: 20 }}>
      <View
        style={{
          width: 72,
          height: 72,
          borderRadius: 24,
          backgroundColor: colors.danger,
          alignItems: "center",
          justifyContent: "center",
          marginBottom: 16,
        }}
      >
        <Ionicons name="cloud-offline" size={32} color="#fff" />
      </View>
      <Text style={{ fontFamily: fonts.title, fontSize: 17, color: text, textAlign: "center" }}>
        No internet connection
      </Text>
      <Text
        style={{
          fontFamily: fonts.body,
          fontSize: 13,
          color: sub,
          textAlign: "center",
          marginTop: 4,
          marginBottom: 18,
        }}
      >
        Connect to the internet and try again.
      </Text>
      <Pressable
        onPress={onRetry}
        style={{
          backgroundColor: colors.gold,
          paddingHorizontal: 24,
          paddingVertical: 12,
          borderRadius: 999,
        }}
      >
        <Text style={{ fontFamily: fonts.title, color: colors.ink }}>Try again</Text>
      </Pressable>
    </View>
  );
}
