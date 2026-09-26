import { Text, View } from "react-native";
import { colors, fonts } from "@/lib/theme";

export function BrandMark({
  size = 52,
  color = colors.gold,
  tagColor = colors.gold,
  showTag = true,
  align = "center",
}: {
  size?: number;
  color?: string;
  tagColor?: string;
  showTag?: boolean;
  align?: "center" | "left";
}) {
  return (
    <View style={{ alignItems: align === "center" ? "center" : "flex-start" }}>
      <Text
        style={{
          fontFamily: fonts.script,
          fontSize: size,
          color,
          lineHeight: size * 1.25,
          textAlign: align,
        }}
      >
        Matebeto
      </Text>
      <View
        style={{
          width: size * 1.55,
          height: 2,
          backgroundColor: color,
          borderRadius: 2,
          marginTop: -4,
          opacity: 0.9,
        }}
      />
      {showTag ? (
        <Text
          style={{
            fontFamily: fonts.italic,
            color: tagColor,
            fontSize: Math.max(14, size * 0.32),
            marginTop: 8,
            textAlign: align,
          }}
        >
          Let's Eat.
        </Text>
      ) : null}
    </View>
  );
}
