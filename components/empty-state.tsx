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
    <View style={{ alignItems: "center", paddingVertical: 32, paddingHorizontal: 16 }}>
      <View
        style={{
          width: 96,
          height: 96,
          borderRadius: 30,
          backgroundColor: color,
          alignItems: "center",
          justifyContent: "center",
          marginBottom: 16,
          shadowColor: color,
          shadowOpacity: 0.4,
          shadowRadius: 18,
          shadowOffset: { width: 0, height: 10 },
          elevation: 6,
        }}
      >
        <Ionicons name={icon} size={44} color="#fff" />
      </View>
      <Text style={{ fontFamily: fonts.title, fontSize: 18, color: colors.ink, textAlign: "center" }}>
        {title}
      </Text>
      {hint ? (
        <Text
          style={{
            marginTop: 8,
            color: colors.muted,
            textAlign: "center",
            fontFamily: fonts.body,
            lineHeight: 21,
            maxWidth: 280,
          }}
        >
          {hint}
        </Text>
      ) : null}
    </View>
  );
}
