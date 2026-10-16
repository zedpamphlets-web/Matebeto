import { Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { colors, fonts } from "@/lib/theme";

/** Small note shown when the screen is using the menu saved on the phone because there is no internet. */
export function OfflineBanner({ dark }: { dark?: boolean }) {
  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        gap: 8,
        alignSelf: "flex-start",
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 999,
        marginBottom: 12,
        backgroundColor: dark ? "rgba(255,255,255,0.10)" : "rgba(11,43,26,0.08)",
      }}
    >
      <Ionicons name="cloud-offline-outline" size={16} color={dark ? colors.gold : colors.brandGreen} />
      <Text style={{ fontFamily: fonts.bodySemi, fontSize: 12, color: dark ? "#fff" : colors.brandGreen }}>
        No internet. Showing your saved menu.
      </Text>
    </View>
  );
}
