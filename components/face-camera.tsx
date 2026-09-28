import { useRef, useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";
import { Image } from "expo-image";
import { CameraView, useCameraPermissions } from "expo-camera";
import { Ionicons } from "@expo/vector-icons";
import { colors, fonts } from "@/lib/theme";

/** In-app camera inside a box so Android does not leave the app. */
export function FaceCamera({
  uri,
  onCapture,
  label = "Your photo",
  facing = "front",
  buttonLabel = "Capture face",
  height = 280,
}: {
  uri?: string | null;
  onCapture: (localUri: string, base64?: string) => void;
  label?: string;
  facing?: "front" | "back";
  buttonLabel?: string;
  height?: number;
}) {
  const cameraRef = useRef<CameraView>(null);
  const [permission, requestPermission] = useCameraPermissions();
  const [busy, setBusy] = useState(false);
  const [live, setLive] = useState(!uri);

  async function snap() {
    if (!cameraRef.current || busy) return;
    setBusy(true);
    try {
      const pic = await cameraRef.current.takePictureAsync({
        quality: 0.72,
        base64: true,
        skipProcessing: true,
      });
      if (pic?.uri) {
        setLive(false);
        onCapture(pic.uri, pic.base64);
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <View style={{ marginBottom: 16 }}>
      <Text style={styles.label}>{label}</Text>
      <View style={[styles.box, { height }]}>
        {uri && !live ? (
          <Image source={{ uri }} style={StyleSheet.absoluteFillObject} contentFit="cover" />
        ) : permission?.granted ? (
          <CameraView ref={cameraRef} facing={facing} style={StyleSheet.absoluteFillObject} />
        ) : (
          <View style={styles.need}>
            <Ionicons name="camera" size={36} color={colors.gold} />
            <Text style={styles.needText}>Camera stays in this box. The app will not close.</Text>
            <Pressable onPress={requestPermission} style={styles.allow}>
              <Text style={styles.allowText}>Allow camera</Text>
            </Pressable>
          </View>
        )}
        {busy ? (
          <View style={styles.busy}>
            <ActivityIndicator color="#fff" />
          </View>
        ) : null}
      </View>
      <View style={styles.row}>
        {uri && !live ? (
          <Pressable onPress={() => setLive(true)} style={styles.ghost}>
            <Ionicons name="refresh" size={16} color={colors.ink} />
            <Text style={styles.ghostText}>Retake</Text>
          </Pressable>
        ) : (
          <Pressable onPress={snap} disabled={!permission?.granted || busy} style={styles.snap}>
            <Ionicons name="camera" size={18} color="#fff" />
            <Text style={styles.snapText}>{buttonLabel}</Text>
          </Pressable>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  label: { fontFamily: fonts.title, marginBottom: 8, color: "#fff" },
  box: {
    borderRadius: 28,
    overflow: "hidden",
    backgroundColor: "#111",
    borderWidth: 3,
    borderColor: colors.gold,
  },
  need: { flex: 1, alignItems: "center", justifyContent: "center", padding: 24, gap: 10 },
  needText: { color: "#ddd", textAlign: "center", fontFamily: fonts.body, lineHeight: 20 },
  allow: {
    marginTop: 6,
    backgroundColor: colors.gold,
    borderRadius: 999,
    paddingHorizontal: 18,
    paddingVertical: 10,
  },
  allowText: { fontFamily: fonts.title, color: colors.ink },
  busy: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.35)",
    alignItems: "center",
    justifyContent: "center",
  },
  row: { flexDirection: "row", marginTop: 10 },
  snap: {
    flex: 1,
    height: 50,
    borderRadius: 16,
    backgroundColor: colors.rider,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  snapText: { color: "#fff", fontFamily: fonts.title },
  ghost: {
    flex: 1,
    height: 50,
    borderRadius: 16,
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: colors.line,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  ghostText: { fontFamily: fonts.title, color: colors.ink },
});
