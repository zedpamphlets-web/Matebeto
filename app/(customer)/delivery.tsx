import { useEffect, useState } from "react";
import { Alert, Pressable, ScrollView, Text, View } from "react-native";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { supabase } from "@/lib/supabase";
import { colors, fonts, radius } from "@/lib/theme";
import { formatKw } from "@/lib/lipila";
import { AppHeader, DarkField, DarkScreen, GoldButton } from "@/components/app-shell";
import { currentProfile } from "@/lib/session";
import AsyncStorage from "@react-native-async-storage/async-storage";

export default function DeliveryType() {
  const [delivery, setDelivery] = useState<"bicycle" | "motorbike">("bicycle");
  const [address, setAddress] = useState("");
  const [notes, setNotes] = useState("");
  const [fees, setFees] = useState({ bicycle_delivery_fee: 15, motorbike_delivery_fee: 25 });

  useEffect(() => {
    supabase.from("settings").select("*").eq("id", 1).single().then(({ data }) => data && setFees(data));
    currentProfile().then(({ profile }) => {
      if (profile?.address_text) setAddress(profile.address_text);
      if (profile?.address_notes) setNotes(profile.address_notes);
    });
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
    <DarkScreen>
      <AppHeader title="Choose Delivery Type" back />
      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 40 }}>
        {options.map((t) => (
          <Pressable
            key={t.id}
            onPress={() => setDelivery(t.id)}
            style={{
              backgroundColor: "#141414",
              borderRadius: radius.md,
              padding: 18,
              marginBottom: 12,
              borderWidth: 2,
              borderColor: delivery === t.id ? colors.gold : "rgba(255,255,255,0.1)",
              flexDirection: "row",
              alignItems: "center",
              gap: 14,
            }}
          >
            <View
              style={{
                width: 48,
                height: 48,
                borderRadius: 24,
                backgroundColor: delivery === t.id ? colors.gold : "#222",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Ionicons name={t.icon} size={24} color={colors.ink} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ fontFamily: fonts.title, fontSize: 18, color: "#fff" }}>{t.title}</Text>
              <Text style={{ color: "#8A8A8A", marginTop: 4, fontFamily: fonts.body }}>{t.hint}</Text>
            </View>
            <Text style={{ fontFamily: fonts.display, fontSize: 18, color: colors.gold }}>{formatKw(t.fee)}</Text>
          </Pressable>
        ))}

        <Text style={{ marginTop: 8, marginBottom: 8, fontFamily: fonts.title, color: "#fff" }}>Delivery details</Text>
        <DarkField value={address} onChangeText={setAddress} placeholder="Delivery address" />
        <DarkField value={notes} onChangeText={setNotes} placeholder="Notes for the rider (optional)" />
        <View style={{ height: 10 }} />
        <GoldButton
          label="Continue"
          onPress={async () => {
            if (!address.trim()) {
              Alert.alert("Delivery details", "Add a delivery address.");
              return;
            }
            await AsyncStorage.setItem("matebeto.delivery", delivery);
            await AsyncStorage.setItem("matebeto.address", JSON.stringify({ text: address, notes }));
            router.push("/(customer)/checkout");
          }}
        />
      </ScrollView>
    </DarkScreen>
  );
}
