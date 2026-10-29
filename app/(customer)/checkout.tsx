import { useEffect, useState } from "react";
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { MkField, MkHeader, MkScreen, RedButton } from "@/components/mk";
import { supabase } from "@/lib/supabase";
import { loadAccount } from "@/lib/profile";
import { LIPILA_PROVIDERS, type LipilaProvider } from "@/lib/lipila";
import { fonts, ui } from "@/lib/theme";

/** Payment method picker (opened from "Change" on the basket). Paying happens on the basket with Pay Now. */
export default function PaymentMethod() {
  const [provider, setProvider] = useState<LipilaProvider>("mtn");
  const [phone, setPhone] = useState("");

  useEffect(() => {
    (async () => {
      const rawPay = await AsyncStorage.getItem("matebeto.payment");
      const pay = rawPay ? JSON.parse(rawPay) : null;
      const { data } = await supabase.auth.getUser();
      const { details } = await loadAccount();
      setPhone(pay?.phone || details.payment_number || data.user?.phone || "");
      setProvider((pay?.provider || details.payment_provider || "mtn") as LipilaProvider);
    })();
  }, []);

  async function save() {
    if (phone.replace(/\D/g, "").length < 9) {
      Alert.alert("Payment method", "Enter the mobile money number you will pay with.");
      return;
    }
    await AsyncStorage.setItem("matebeto.payment", JSON.stringify({ provider, phone: phone.trim() }));
    router.back();
  }

  return (
    <MkScreen>
      <MkHeader title="Payment Method" />
      <ScrollView contentContainerStyle={{ padding: 16 }} showsVerticalScrollIndicator={false}>
        <Text style={s.h}>Pay with mobile money</Text>
        <View style={s.chips}>
          {LIPILA_PROVIDERS.map((p) => {
            const on = provider === p.id;
            return (
              <Pressable key={p.id} onPress={() => setProvider(p.id)} style={[s.chip, on && { borderColor: ui.red, backgroundColor: ui.redSoft }]}>
                <Text style={s.chipText}>{p.label}</Text>
              </Pressable>
            );
          })}
        </View>
        <View style={{ height: 14 }} />
        <MkField value={phone} onChangeText={setPhone} placeholder="Mobile money number" keyboardType="phone-pad" />
        <View style={s.secure}>
          <Ionicons name="shield-checkmark" size={18} color="#1F9D55" />
          <Text style={s.secureText}>Secure payment. You approve it on your phone.</Text>
        </View>
      </ScrollView>
      <View style={s.footer}>
        <RedButton label="Save" chevron onPress={save} />
      </View>
    </MkScreen>
  );
}

const s = StyleSheet.create({
  h: { fontFamily: fonts.title, fontSize: 15, color: ui.ink },
  chips: { flexDirection: "row", gap: 8, marginTop: 10, flexWrap: "wrap" },
  chip: { paddingHorizontal: 14, paddingVertical: 11, borderRadius: 12, backgroundColor: "#fff", borderWidth: 1.5, borderColor: ui.line },
  chipText: { fontFamily: fonts.bodySemi, color: ui.ink },
  secure: { flexDirection: "row", alignItems: "center", gap: 8, marginTop: 6 },
  secureText: { color: ui.sub, fontFamily: fonts.body, fontSize: 12.5 },
  footer: { paddingHorizontal: 16, paddingTop: 10, paddingBottom: 10, backgroundColor: "#fff" },
});
