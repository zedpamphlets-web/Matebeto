import { useState } from "react";
import { ActivityIndicator, Alert, Pressable, Text, View } from "react-native";
import { Photo } from "@/components/photo";
import { colors, fonts, radius } from "@/lib/theme";
import { uploadCatalogImage } from "@/lib/upload";

export function PhotoPicker({
  folder,
  uri,
  name,
  onChange,
  height = 140,
}: {
  folder: string;
  uri?: string | null;
  name?: string;
  onChange: (url: string | null) => void;
  height?: number;
}) {
  const [busy, setBusy] = useState(false);

  async function run(source: "library" | "camera") {
    try {
      setBusy(true);
      const url = await uploadCatalogImage(folder, source);
      if (url) onChange(url);
    } catch (e: any) {
      Alert.alert("Photo", e?.message || "Upload failed.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <View style={{ marginBottom: 10 }}>
      <View style={{ borderRadius: radius.md, overflow: "hidden", backgroundColor: colors.ink }}>
        <Photo uri={uri} name={name} height={height} />
        {busy ? (
          <View
            style={{
              position: "absolute",
              left: 0,
              right: 0,
              top: 0,
              bottom: 0,
              backgroundColor: "rgba(0,0,0,0.35)",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <ActivityIndicator color="#fff" />
          </View>
        ) : null}
      </View>
      <View style={{ flexDirection: "row", gap: 8, marginTop: 8 }}>
        <Mini label="From phone" onPress={() => run("library")} />
        <Mini label="Take photo" onPress={() => run("camera")} />
        {uri ? <Mini label="Remove" dim onPress={() => onChange(null)} /> : null}
      </View>
    </View>
  );
}

function Mini({ label, onPress, dim }: { label: string; onPress: () => void; dim?: boolean }) {
  return (
    <Pressable
      onPress={onPress}
      style={{
        backgroundColor: dim ? "#fff" : colors.gold,
        borderWidth: 1,
        borderColor: dim ? colors.line : colors.gold,
        borderRadius: 999,
        paddingHorizontal: 12,
        paddingVertical: 8,
      }}
    >
      <Text style={{ fontFamily: fonts.bodySemi, color: colors.ink, fontSize: 12 }}>{label}</Text>
    </Pressable>
  );
}
