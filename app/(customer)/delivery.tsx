import { useEffect, useState } from "react";
import { Pressable, Text, View } from "react-native";
import { router } from "expo-router";
import { supabase } from "@/lib/supabase";
import { colors, radius } from "@/lib/theme";
import { formatKw } from "@/lib/lipila";
import { PrimaryButton } from "@/components/ui";
import AsyncStorage from "@react-native-async-storage/async-storage";

export default function DeliveryType() {
  const [delivery, setDelivery] = useState<"bicycle" | "motorbike">("bicycle");
  const [fees, setFees] = useState({ bicycle_delivery_fee: 15, motorbike_delivery_fee: 25 });

  useEffect(() => {
    supabase.from("settings").select("*").eq("id", 1).single().then(({ data }) => data && setFees(data));
  }, []);

  return (
    <View style={{ flex: 1, backgroundColor: "#F4F6F3", padding: 20 }}>
      <Text style={{ fontSize: 24, fontWeight: "800", marginBottom: 16 }}>Choose Delivery Type</Text>
      {(["bicycle", "motorbike"] as const).map((t) => (
        <Pressable
          key={t}
          onPress={() => setDelivery(t)}
          style={{
            backgroundColor: "#fff",
            borderRadius: radius.md,
            padding: 18,
            marginBottom: 12,
            borderWidth: 2,
            borderColor: delivery === t ? colors.gold : colors.line,
          }}
        >
          <Text style={{ fontWeight: "800", fontSize: 18, textTransform: "capitalize" }}>{t}</Text>
          <Text style={{ color: colors.muted, marginTop: 4 }}>
            {t === "bicycle"
              ? `Slower · Cheaper · ${formatKw(fees.bicycle_delivery_fee)}`
              : `Faster · More expensive · ${formatKw(fees.motorbike_delivery_fee)}`}
          </Text>
        </Pressable>
      ))}
      <PrimaryButton
        label="Continue"
        onPress={async () => {
          await AsyncStorage.setItem("matebeto.delivery", delivery);
          router.push("/(customer)/checkout");
        }}
      />
    </View>
  );
}
