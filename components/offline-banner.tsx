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
        backgroundColor: "#F5F5F7",
      }}
    >
      <Ionicons name="cloud-offline-outline" size={16} color="#6B6A78" />
      <Text style={{ fontFamily: fonts.bodySemi, fontSize: 12, color: "#4A4958" }}>
        No internet. Showing your saved menu.
      </Text>
    </View>
  );
}
