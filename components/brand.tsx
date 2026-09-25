import { Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { colors, fonts } from "@/lib/theme";

export function BrandMark({
  size = 34,
  color = colors.gold,
  tagColor = "#fff",
  showTag = true,
}: {
  size?: number;
  color?: string;
  tagColor?: string;
  showTag?: boolean;
}) {
  return (
    <View>
      <View style={{ flexDirection: "row", alignItems: "center" }}>
        <Text style={{ fontFamily: fonts.display, fontSize: size, color, letterSpacing: -0.8 }}>
          Matebeto
        </Text>
        <Ionicons name="restaurant" size={size * 0.62} color={color} style={{ marginLeft: 6 }} />
      </View>
      {showTag ? (
        <Text
          style={{
            fontFamily: fonts.title,
            color: tagColor,
            fontSize: Math.max(13, size * 0.38),
            marginTop: 2,
          }}
        >
          Let's Eat.
        </Text>
      ) : null}
    </View>
  );
}
