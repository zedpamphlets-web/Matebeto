import { useEffect, useState } from "react";
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { supabase } from "@/lib/supabase";
import { fonts, ui } from "@/lib/theme";
import { kw } from "@/lib/format";
import { MkField, MkHeader, MkScreen, RedButton } from "@/components/mk";
import { loadAccount, deliveryAddressFrom } from "@/lib/profile";
import AsyncStorage from "@react-native-async-storage/async-storage";

export default function DeliveryType() {
  const [delivery, setDelivery] = useState<"bicycle" | "motorbike">("bicycle");
  const [address, setAddress] = useState("");
  const [notes, setNotes] = useState("");
  const [fees, setFees] = useState({ bicycle_delivery_fee: 15, motorbike_delivery_fee: 25 });

  useEffect(() => {
    supabase.from("settings").select("*").eq("id", 1).single().then(({ data }) => data && setFees(data));
    // start from the location saved on the account (plot, area, street), so nobody types it twice
    (async () => {
      // what the customer chose last wins; else the saved account address
      const t = await AsyncStorage.getItem("matebeto.delivery");
      if (t === "bicycle" || t === "motorbike") setDelivery(t);
      const raw = await AsyncStorage.getItem("matebeto.address");
      const chosen = raw ? JSON.parse(raw) : null;
      const { details } = await loadAccount();
      const saved = deliveryAddressFrom(details);
      setAddress(chosen?.text || saved.text || "");
      setNotes(chosen?.notes ?? saved.notes ?? "");
    })();
  }, []);

  const options = [
    {
      id: "bicycle" as const,
      icon: "bicycle" as const,
      title: "Bicycle",
      hint: "Slower · Cheaper",
      fee: fees.bicycle_delivery_fee,
    },
    {
      id: "motorbike" as const,
      icon: "speedometer" as const,
      title: "Motorbike",
      hint: "Faster · More expensive",
      fee: fees.motorbike_delivery_fee,
    },
  ];

  return (
    <MkScreen>
      <MkHeader title="Delivery" />
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 24 }} showsVerticalScrollIndicator={false}>
        {options.map((t) => {
          const on = delivery === t.id;
          return (
            <Pressable
              key={t.id}
              onPress={() => setDelivery(t.id)}
              style={[styles.option, on && { borderColor: ui.red, backgroundColor: ui.redSoft }]}
            >
              <View style={[styles.optionIcon, on && { backgroundColor: ui.red }]}>
                <Ionicons name={t.icon} size={22} color={on ? "#fff" : ui.red} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.optionTitle}>{t.title}</Text>
                <Text style={styles.optionHint}>{t.hint}</Text>
              </View>
              <Text style={styles.optionFee}>{kw(t.fee)}</Text>
            </Pressable>
          );
        })}

        <Text style={styles.h}>Delivery details</Text>
        <MkField value={address} onChangeText={setAddress} placeholder="Plot, street and area" />
        <MkField value={notes} onChangeText={setNotes} placeholder="Notes for the rider (optional)" />
      </ScrollView>
      <View style={styles.footer}>
        <RedButton
          label="Save"
          chevron
          onPress={async () => {
            if (!address.trim()) {
              Alert.alert("Delivery details", "Add a delivery address.");
              return;
            }
            await AsyncStorage.setItem("matebeto.delivery", delivery);
            await AsyncStorage.setItem("matebeto.address", JSON.stringify({ text: address, notes }));
            router.back();
          }}
        />
      </View>
    </MkScreen>
  );
}

const styles = StyleSheet.create({
  option: {
    backgroundColor: "#fff",
    borderRadius: 14,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1.5,
    borderColor: ui.line,
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
  },
  optionIcon: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: ui.redSoft,
    alignItems: "center",
    justifyContent: "center",
  },
  optionTitle: { fontFamily: fonts.title, fontSize: 16, color: ui.ink },
  optionHint: { fontFamily: fonts.body, fontSize: 12, color: ui.sub, marginTop: 3 },
  optionFee: { fontFamily: fonts.display, fontSize: 16, color: ui.red },
  h: { fontFamily: fonts.title, fontSize: 15, color: ui.ink, marginTop: 8, marginBottom: 10 },
  footer: { paddingHorizontal: 16, paddingTop: 10, paddingBottom: 8, backgroundColor: "#fff" },
});
