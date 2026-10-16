import { Image, Text, View } from "react-native";
import { colors, fonts } from "@/lib/theme";

/**
 * The real Matebeto wordmark (fork in the O) from the approved logo file, with the tagline under it.
 * The logo is never redrawn in another font. It is made for dark green backgrounds.
 */
export function BrandMark({
  size = 52,
  tagColor = colors.gold,
  showTag = true,
  align = "center",
}: {
  size?: number;
  color?: string; // kept so existing screens still compile; the logo colour is fixed
  tagColor?: string;
  showTag?: boolean;
  align?: "center" | "left";
}) {
  // Logo file is 688 x 264; keep that ratio exactly
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
