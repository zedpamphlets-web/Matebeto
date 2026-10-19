import { useRef, useState } from "react";
import { Animated, Dimensions, Modal, PanResponder, Pressable, StyleProp, StyleSheet, Text, View, ViewStyle } from "react-native";
import { Image } from "expo-image";
import { Ionicons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";
import { Photo } from "@/components/photo";
import { fonts } from "@/lib/theme";

const { width: W, height: H } = Dimensions.get("window");
const MAX_ZOOM = 5;

/** A photo that opens full screen when tapped. Pinch to zoom, drag to move, double tap to zoom in or out. */
export function ZoomPhoto({
  uri,
  name,
  height,
  width,
  style,
}: {
  uri?: string | null;
  name?: string;
  height: number;
  width?: number | `${number}%` | "100%";
  style?: StyleProp<ViewStyle>;
}) {
  const [open, setOpen] = useState(false);
  if (!uri) return <Photo uri={uri} name={name} height={height} width={width} style={style} />;
  return (
    <>
      <Pressable onPress={() => setOpen(true)} accessibilityLabel={`Open ${name || "photo"}`}>
        <Photo uri={uri} name={name} height={height} width={width} style={style} />
        <View style={s.badge}>
          <Ionicons name="expand" size={14} color="#fff" />
        </View>
      </Pressable>
      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)} statusBarTranslucent>
        <Viewer uri={uri} onClose={() => setOpen(false)} />
      </Modal>
    </>
  );
}

function Viewer({ uri, onClose }: { uri: string; onClose: () => void }) {
  const scale = useRef(new Animated.Value(1)).current;
  const tx = useRef(new Animated.Value(0)).current;
  const ty = useRef(new Animated.Value(0)).current;
  const cur = useRef({ scale: 1, x: 0, y: 0 });
  const base = useRef({ scale: 1, dist: 0, x: 0, y: 0, gx: 0, gy: 0, count: 0 });
  const lastTap = useRef(0);

  function apply() {
    const limitX = ((cur.current.scale - 1) * W) / 2;
    const limitY = ((cur.current.scale - 1) * H) / 2;
    cur.current.x = Math.max(-limitX, Math.min(limitX, cur.current.x));
    cur.current.y = Math.max(-limitY, Math.min(limitY, cur.current.y));
    scale.setValue(cur.current.scale);
    tx.setValue(cur.current.x);
    ty.setValue(cur.current.y);
  }

  const pan = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: () => {
        base.current = { scale: cur.current.scale, dist: 0, x: cur.current.x, y: cur.current.y, gx: 0, gy: 0, count: 0 };
      },
      onPanResponderMove: (e, g) => {
        const touches = e.nativeEvent.touches;
        const count = touches.length;
        if (count !== base.current.count) {
          // a finger was added or lifted: start measuring again from here
          base.current = {
            scale: cur.current.scale,
            dist: count >= 2 ? Math.hypot(touches[0].pageX - touches[1].pageX, touches[0].pageY - touches[1].pageY) : 0,
            x: cur.current.x,
            y: cur.current.y,
            gx: g.dx,
            gy: g.dy,
            count,
          };
          return;
        }
        if (count >= 2 && base.current.dist > 0) {
          const d = Math.hypot(touches[0].pageX - touches[1].pageX, touches[0].pageY - touches[1].pageY);
          cur.current.scale = Math.max(1, Math.min(MAX_ZOOM, base.current.scale * (d / base.current.dist)));
        } else if (cur.current.scale > 1) {
          cur.current.x = base.current.x + (g.dx - base.current.gx);
          cur.current.y = base.current.y + (g.dy - base.current.gy);
        }
        apply();
      },
      onPanResponderRelease: (_e, g) => {
        const tapped = Math.abs(g.dx) < 6 && Math.abs(g.dy) < 6;
        if (tapped) {
          const now = Date.now();
          if (now - lastTap.current < 300) {
            cur.current = cur.current.scale > 1 ? { scale: 1, x: 0, y: 0 } : { scale: 2.5, x: 0, y: 0 };
            apply();
            lastTap.current = 0;
          } else {
            lastTap.current = now;
          }
        }
        if (cur.current.scale <= 1.02) {
          cur.current = { scale: 1, x: 0, y: 0 };
          apply();
        }
      },
    })
  ).current;

  return (
    <View style={s.viewer}>
      <Animated.View
        {...pan.panHandlers}
        style={{ width: W, height: H, transform: [{ translateX: tx }, { translateY: ty }, { scale }] }}
      >
        <Image source={{ uri }} style={{ width: W, height: H }} contentFit="contain" />
      </Animated.View>
      <SafeAreaView style={s.top} edges={["top"]} pointerEvents="box-none">
        <Pressable onPress={onClose} style={s.close} hitSlop={12} accessibilityLabel="Close photo">
          <Ionicons name="close" size={26} color="#fff" />
        </Pressable>
      </SafeAreaView>
      <Text style={s.hint}>Pinch or double tap to zoom</Text>
    </View>
  );
}

const s = StyleSheet.create({
  badge: {
    position: "absolute",
    right: 6,
    bottom: 6,
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: "rgba(0,0,0,0.55)",
    alignItems: "center",
    justifyContent: "center",
  },
  viewer: { flex: 1, backgroundColor: "#000" },
  top: { position: "absolute", top: 0, left: 0, right: 0, alignItems: "flex-end", paddingRight: 16, paddingTop: 8 },
  close: { width: 44, height: 44, borderRadius: 22, backgroundColor: "rgba(255,255,255,0.18)", alignItems: "center", justifyContent: "center" },
  hint: { position: "absolute", bottom: 28, alignSelf: "center", color: "rgba(255,255,255,0.7)", fontFamily: fonts.body, fontSize: 13 },
});
