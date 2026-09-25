import { useCallback, useState } from "react";
import { Alert, Pressable, ScrollView, Text, View } from "react-native";
import { router, useFocusEffect } from "expo-router";
import { supabase } from "@/lib/supabase";
import { currentProfile } from "@/lib/session";
import { colors, radius } from "@/lib/theme";
import { PrimaryButton } from "@/components/ui";

export default function RiderHome() {
  const [rider, setRider] = useState<any>(null);
  const [offers, setOffers] = useState<any[]>([]);

  async function load() {
    const { rider } = await currentProfile();
    setRider(rider);
    if (!rider) return;
    const { data } = await supabase
      .from("rider_offers")
      .select("*, orders(*)")
      .eq("rider_id", rider.id)
      .eq("status", "OFFERED")
      .order("created_at", { ascending: false });
    setOffers(data || []);
  }

  useFocusEffect(useCallback(() => { load(); }, []));

  async function toggleOnline() {
    if (!rider || rider.status !== "APPROVED") return;
    const { error } = await supabase.from("riders").update({ is_online: !rider.is_online }).eq("id", rider.id);
    if (error) Alert.alert("Could not update", error.message);
    load();
  }

  if (!rider) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.cream, padding: 24 }}>
        <Text style={{ fontSize: 22, fontWeight: "800" }}>Rider mode</Text>
        <Text style={{ color: colors.muted, marginTop: 8 }}>Apply first, then wait for approval.</Text>
        <View style={{ height: 16 }} />
        <PrimaryButton label="Apply" color={colors.rider} textColor="#fff" onPress={() => router.push("/auth/rider-apply")} />
      </View>
    );
  }

  if (rider.status !== "APPROVED") {
    return (
      <View style={{ flex: 1, backgroundColor: colors.cream, padding: 24 }}>
        <Text style={{ fontSize: 22, fontWeight: "800" }}>Status: {rider.status}</Text>
        <Text style={{ color: colors.muted, marginTop: 8 }}>Only approved riders receive jobs.</Text>
      </View>
    );
  }

  return (
    <ScrollView style={{ flex: 1, backgroundColor: colors.cream }} contentContainerStyle={{ padding: 20 }}>
      <Text style={{ fontSize: 22, fontWeight: "800" }}>{rider.full_name}</Text>
      <Text style={{ color: colors.muted, textTransform: "capitalize" }}>{rider.vehicle_type}</Text>
      <View style={{ height: 14 }} />
      <PrimaryButton
        label={rider.is_online ? "Go offline" : "Go online"}
        color={rider.is_online ? colors.ink : colors.rider}
        textColor="#fff"
        onPress={toggleOnline}
      />
      {rider.current_order_id && (
        <PrimaryButton label="Open current job" color={colors.ink} textColor="#fff" onPress={() => router.push(`/(rider)/job/${rider.current_order_id}`)} />
      )}
      <Text style={{ marginTop: 22, fontWeight: "800" }}>Delivery requests</Text>
      {offers.length === 0 && <Text style={{ color: colors.muted, marginTop: 8 }}>No jobs right now.</Text>}
      {offers.map((off) => (
        <Pressable
          key={off.id}
          onPress={() => router.push(`/(rider)/job/${off.orders.id}`)}
          style={{ backgroundColor: "#fff", borderRadius: radius.md, padding: 16, marginTop: 10 }}
        >
          <Text style={{ fontWeight: "800" }}>Order #{off.orders.order_number}</Text>
          <Text style={{ color: colors.muted }}>{off.orders.delivery_type} · {off.orders.delivery_address?.text}</Text>
        </Pressable>
      ))}
      <View style={{ height: 20 }} />
      <PrimaryButton label="Order food as customer" onPress={() => router.push("/(customer)")} />
    </ScrollView>
  );
}
