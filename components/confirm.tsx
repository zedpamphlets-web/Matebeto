import { useEffect, useState } from "react";
import { Alert, Modal, Pressable, StyleSheet, Text, View } from "react-native";
import { fonts, ui } from "@/lib/theme";

type Options = {
  title: string;
  message?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  /** Red button for things that cannot be undone (delete, log out). */
  destructive?: boolean;
};

type Pending = Options & { resolve: (ok: boolean) => void };

let show: ((o: Pending) => void) | null = null;

/**
 * Opens the Matebeto confirmation popup and resolves true if the person confirms.
 *   if (await confirmDialog({ title: "Delete meal?", message: "…", confirmLabel: "Delete", destructive: true })) { … }
 */
export function confirmDialog(options: Options): Promise<boolean> {
  return new Promise((resolve) => {
    if (!show) {
      Alert.alert(options.title, options.message, [
        { text: options.cancelLabel || "Cancel", style: "cancel", onPress: () => resolve(false) },
        { text: options.confirmLabel || "Yes", style: options.destructive ? "destructive" : "default", onPress: () => resolve(true) },
      ]);
      return;
    }
    show({ ...options, resolve });
  });
}

/** Mount once at the root of the app. */
export function ConfirmHost() {
  const [pending, setPending] = useState<Pending | null>(null);

  useEffect(() => {
    show = (o) => setPending(o);
    return () => {
      show = null;
    };
  }, []);

  function close(ok: boolean) {
    const p = pending;
    setPending(null);
    p?.resolve(ok);
  }

  return (
    <Modal visible={!!pending} transparent animationType="fade" onRequestClose={() => close(false)} statusBarTranslucent>
      <View style={s.backdrop}>
        <Pressable style={StyleSheet.absoluteFill} onPress={() => close(false)} />
        <View style={s.card}>
          <Text style={s.title}>{pending?.title}</Text>
          {pending?.message ? <Text style={s.message}>{pending.message}</Text> : null}
          <View style={s.row}>
            <Pressable onPress={() => close(false)} style={[s.btn, s.cancel]}>
              <Text style={s.cancelText}>{pending?.cancelLabel || "Cancel"}</Text>
            </Pressable>
            <Pressable
              onPress={() => close(true)}
              style={[s.btn, { backgroundColor: pending?.destructive === false ? ui.ink : ui.red }]}
            >
              <Text style={s.confirmText}>{pending?.confirmLabel || "Yes"}</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const s = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: "rgba(17,17,24,0.45)", alignItems: "center", justifyContent: "center", padding: 28 },
  card: { width: "100%", maxWidth: 360, backgroundColor: "#FFFFFF", borderRadius: 20, padding: 22 },
  title: { fontFamily: fonts.title, fontSize: 18, color: ui.ink },
  message: { fontFamily: fonts.body, fontSize: 14.5, lineHeight: 21, color: ui.sub, marginTop: 8 },
  row: { flexDirection: "row", gap: 10, marginTop: 22 },
  btn: { flex: 1, height: 48, borderRadius: 14, alignItems: "center", justifyContent: "center" },
  cancel: { backgroundColor: "#F2F2F5" },
  cancelText: { fontFamily: fonts.title, fontSize: 15, color: ui.ink },
  confirmText: { fontFamily: fonts.title, fontSize: 15, color: "#FFFFFF" },
});
