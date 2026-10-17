import { Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { colors, fonts } from "@/lib/theme";

/** Clean empty state — title only, no long instructional text. */
export function EmptyState({
  icon,
  color,
  title,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
  title: string;
  hint?: string;
}) {
  return (
    <View style={{ alignItems: "center", paddingVertical: 36, paddingHorizontal: 16 }}>
      <View
        style={{
          width: 88,
          height: 88,
          borderRadius: 44,
          backgroundColor: "#FBF0EC",
          alignItems: "center",
          justifyContent: "center",
          marginBottom: 16,
        }}
      >
        <Ionicons name={icon} size={38} color="#D6263A" />
      </View>
      <Text style={{ fontFamily: fonts.title, fontSize: 18, color: colors.ink, textAlign: "center" }}>
        {title}
      </Text>
    </View>
  );
}
