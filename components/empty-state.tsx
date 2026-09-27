import { Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { colors, fonts } from "@/lib/theme";

export function EmptyState({
  icon,
  color,
  title,
  hint,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
  title: string;
  hint?: string;
}) {
  return (
    <View style={{ alignItems: "center", paddingVertical: 28, paddingHorizontal: 12 }}>
      <View
        style={{
          width: 92,
          height: 92,
          borderRadius: 28,
          backgroundColor: color,
          alignItems: "center",
          justifyContent: "center",
          marginBottom: 14,
          shadowColor: color,
          shadowOpacity: 0.35,
          shadowRadius: 16,
          shadowOffset: { width: 0, height: 8 },
          elevation: 4,
        }}
      >
        <Ionicons name={icon} size={42} color="#fff" />
      </View>
      <Text style={{ fontFamily: fonts.title, fontSize: 18, color: colors.ink, textAlign: "center" }}>{title}</Text>
      {hint ? (
        <Text
          style={{
            marginTop: 6,
            color: colors.muted,
            textAlign: "center",
            fontFamily: fonts.body,
            lineHeight: 20,
            maxWidth: 260,
          }}
        >
          {hint}
        </Text>
      ) : null}
    </View>
  );
}
