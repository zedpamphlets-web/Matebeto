import { Image, Text, View } from "react-native";
import { colors, fonts } from "@/lib/theme";

/**
 * Matebeto wordmark (yellow, transparent background) for light pages.
 */
export function BrandMark({
  size = 52,
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
  const width = size * 3.1;
  const height = width * (264 / 688);
  return (
    <View style={{ alignItems: align === "center" ? "center" : "flex-start" }}>
      <Image
        source={require("../assets/logo-wordmark-clear.png")}
        style={{ width, height }}
        resizeMode="contain"
        accessibilityLabel="Matebeto"
      />
      {showTag ? (
        <Text
          style={{
            fontFamily: fonts.title,
            color: tagColor,
            fontSize: Math.max(12, size * 0.3),
            marginTop: 4,
            textAlign: align,
          }}
        >
          Let's Eat.
        </Text>
      ) : null}
    </View>
  );
}
