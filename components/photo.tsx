import { View, Text, StyleProp, ViewStyle } from "react-native";
import { Image } from "expo-image";
import { colors, fonts } from "@/lib/theme";

/** Shows a real image URL, or a Matebeto colour tile. Never a stock photo. */
export function Photo({
  uri,
  name,
  height,
  width = "100%",
  style,
  dark = true,
}: {
  uri?: string | null;
  name?: string;
  height: number;
  width?: number | `${number}%` | "100%";
  style?: StyleProp<ViewStyle>;
  dark?: boolean;
}) {
  if (uri) {
    return <Image source={{ uri }} style={[{ height, width }, style as any]} contentFit="cover" />;
  }
  return (
    <View
      style={[
        {
          height,
          width,
          backgroundColor: dark ? colors.customerDeep : colors.gold,
          alignItems: "center",
          justifyContent: "center",
          padding: 8,
        },
        style,
      ]}
    >
      <Text
        style={{
          color: dark ? colors.gold : colors.ink,
          fontFamily: fonts.title,
          textAlign: "center",
        }}
        numberOfLines={2}
      >
        {name || "Matebeto"}
      </Text>
    </View>
  );
}
