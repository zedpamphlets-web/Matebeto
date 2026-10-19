import { useCallback, useState } from "react";
import { Modal, Pressable, StyleSheet, Text, View } from "react-native";
import { router, useFocusEffect } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { loadAccount } from "@/lib/profile";
import { fonts, ui } from "@/lib/theme";

// Once the customer taps Later or Continue, we leave them alone until the app is opened again.
let handledThisSession = false;

export function CompleteAccountPrompt() {
  const [show, setShow] = useState(false);

  useFocusEffect(
    useCallback(() => {
      if (handledThisSession) return;
      let alive = true;
      const timer = setTimeout(() => {
        loadAccount()
          .then(({ details, fromServer }) => {
            if (!alive || !fromServer) return;
            const missingName = !details.full_name.trim();
            const missingPlace = !details.location_area.trim() && !details.address_text.trim();
            if (missingName || missingPlace) setShow(true);
          })
          .catch(() => {});
      }, 900);
      return () => {
        alive = false;
        clearTimeout(timer);
      };
    }, [])
  );

  function later() {
    handledThisSession = true;
    setShow(false);
  }

  function goOn() {
    handledThisSession = true;
    setShow(false);
    router.push({ pathname: "/(customer)/settings", params: { edit: "1" } });
  }

  return (
    <Modal visible={show} transparent animationType="fade" onRequestClose={later}>
      <View style={s.overlay}>
        <View style={s.card}>
          <View style={s.icon}>
            <Ionicons name="person-circle-outline" size={34} color={ui.red} />
          </View>
          <Text style={s.title}>Complete your account</Text>
          <Text style={s.text}>Please complete your account so we know where to deliver your food.</Text>
          <View style={s.row}>
            <Pressable onPress={later} style={s.later}>
              <Text style={s.laterText}>Later</Text>
            </Pressable>
            <Pressable onPress={goOn} style={s.go}>
              <Text style={s.goText}>Continue</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const s = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.45)", alignItems: "center", justifyContent: "center", padding: 24 },
  card: { width: "100%", maxWidth: 380, backgroundColor: "#fff", borderRadius: 20, padding: 22, alignItems: "center" },
  icon: { width: 60, height: 60, borderRadius: 30, backgroundColor: "#FDECEE", alignItems: "center", justifyContent: "center", marginBottom: 12 },
  title: { fontFamily: fonts.display, fontSize: 21, color: ui.ink, textAlign: "center" },
  text: { fontFamily: fonts.body, fontSize: 15, lineHeight: 22, color: ui.sub, textAlign: "center", marginTop: 8 },
  row: { flexDirection: "row", gap: 10, marginTop: 20, width: "100%" },
  later: { flex: 1, height: 48, borderRadius: 14, backgroundColor: "#F5F5F7", alignItems: "center", justifyContent: "center" },
  laterText: { fontFamily: fonts.title, fontSize: 15, color: ui.ink },
  go: { flex: 1, height: 48, borderRadius: 14, backgroundColor: ui.red, alignItems: "center", justifyContent: "center" },
  goText: { fontFamily: fonts.title, fontSize: 15, color: "#fff" },
});
