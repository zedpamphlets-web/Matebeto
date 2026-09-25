import { View, Text, StyleProp, ViewStyle } from "react-native";
import { Image } from "expo-image";
import { colors, fonts } from "@/lib/theme";

/** Real uploaded photo, or a Matebeto colour tile. Never a stock image. */
export function Photo({
  uri,
  name,
  height,
  width = "100%",
  style,
  dark = true,
  overlay,
}: {
  uri?: string | null;
  name?: string;
  height: number;
  width?: number | `${number}%` | "100%";
  style?: StyleProp<ViewStyle>;
  dark?: boolean;
  overlay?: boolean;
}) {
  return (
    <View style={[{ height, width, overflow: "hidden" }, style]}>
      {uri ? (
        <Image source={{ uri }} style={{ height: "100%", width: "100%" }} contentFit="cover" />
      ) : (
        <View
          style={{
            flex: 1,
            backgroundColor: dark ? colors.customerDeep : colors.gold,
            alignItems: "center",
            justifyContent: "center",
            padding: 8,
          }}
        >
          {!overlay ? (
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
          ) : null}
        </View>
      )}
      {overlay && name ? (
        <View
          style={{
            position: "absolute",
            left: 0,
            right: 0,
            bottom: 0,
            paddingVertical: 10,
            paddingHorizontal: 10,
            backgroundColor: "rgba(0,0,0,0.42)",
          }}
        >
          <Text
            style={{
              color: "#fff",
              fontFamily: fonts.display,
              fontSize: 16,
              textAlign: "center",
            }}
            numberOfLines={2}
          >
            {name}
          </Text>
        </View>
      ) : null}
    </View>
  );
}
