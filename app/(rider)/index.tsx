import { useCallback, useState } from "react";
import { Alert, Pressable, ScrollView, Text, View } from "react-native";
import { router, useFocusEffect } from "expo-router";
import { supabase } from "@/lib/supabase";
import { currentProfile } from "@/lib/session";
import { colors, fonts, radius } from "@/lib/theme";
import { AppHeader, DarkScreen, GoldButton } from "@/components/app-shell";

export default function RiderHome() {
  const [rider, setRider] = useState<any>(null);
  const [offers, setOffers] = useState<any[]>([]);

  async function load() {
    const { rider } = await currentProfile();
    setRider(rider);
    if (!rider || rider.status !== "APPROVED") return;
    const { data } = await supabase
      .from("rider_offers")
      .select("*, orders(*)")
      .eq("rider_id", rider.id)
      .eq("status", "OFFERED")
      .order("created_at", { ascending: false });
    setOffers(data || []);
  }

  useFocusEffect(
    useCallback(() => {
      load();
    }, [])
  );

  async function toggleOnline() {
    if (!rider || rider.status !== "APPROVED") return;
    const { error } = await supabase.from("riders").update({ is_online: !rider.is_online }).eq("id", rider.id);
    if (error) Alert.alert("Could not update", error.message);
    load();
  }

  if (!rider) {
    return (
      <DarkScreen>
        <AppHeader title="Rider mode" />
        <View style={{ padding: 24 }}>
          <Text style={{ fontSize: 22, fontFamily: fonts.display, color: "#fff" }}>Apply first</Text>
          <Text style={{ color: "#8A8A8A", marginTop: 8, fontFamily: fonts.body }}>
            Fill the rider application after OTP. Jobs open only after admin approval.
          </Text>
          <View style={{ height: 16 }} />
          <GoldButton label="Open application" onPress={() => router.push("/auth/rider-apply")} />
        </View>
      </DarkScreen>
    );
  }

  if (rider.status !== "APPROVED") {
    return (
      <DarkScreen>
        <AppHeader title="Rider mode" />
        <View style={{ padding: 24 }}>
          <Text style={{ fontSize: 22, fontFamily: fonts.display, color: "#fff" }}>Status: {rider.status}</Text>
          <Text style={{ color: "#8A8A8A", marginTop: 8, fontFamily: fonts.body }}>
            Only approved riders receive jobs. You can keep ordering food as a customer.
          </Text>
          <View style={{ height: 16 }} />
          <GoldButton label="Order food" onPress={() => router.push("/(customer)")} />
        </View>
      </DarkScreen>
    );
  }

  return (
    <DarkScreen>
      <AppHeader title="Jobs" />
      <ScrollView contentContainerStyle={{ padding: 20 }}>
        <Text style={{ fontSize: 22, fontFamily: fonts.display, color: "#fff" }}>{rider.full_name}</Text>
        <Text style={{ color: "#8A8A8A", textTransform: "capitalize", fontFamily: fonts.body }}>{rider.vehicle_type}</Text>
        <View style={{ height: 14 }} />
        <GoldButton label={rider.is_online ? "Go offline" : "Go online"} onPress={toggleOnline} />
        {rider.current_order_id && (
          <>
            <View style={{ height: 10 }} />
            <GoldButton label="Open current job" onPress={() => router.push(`/(rider)/job/${rider.current_order_id}`)} />
          </>
        )}
        <Text style={{ marginTop: 22, fontFamily: fonts.title, color: "#fff" }}>Delivery requests</Text>
        {offers.length === 0 && <Text style={{ color: "#8A8A8A", marginTop: 8, fontFamily: fonts.body }}>No jobs right now.</Text>}
        {offers.map((off) => (
          <Pressable
            key={off.id}
            onPress={() => router.push(`/(rider)/job/${off.orders.id}`)}
            style={{
              backgroundColor: "#141414",
              borderRadius: radius.md,
              padding: 16,
              marginTop: 10,
              borderWidth: 1,
              borderColor: "rgba(255,255,255,0.08)",
            }}
          >
            <Text style={{ fontFamily: fonts.title, color: "#fff" }}>Order #{off.orders.order_number}</Text>
            <Text style={{ color: "#8A8A8A", fontFamily: fonts.body }}>
              {off.orders.delivery_type} · {off.orders.delivery_address?.text}
            </Text>
          </Pressable>
        ))}
        <View style={{ height: 20 }} />
        <GoldButton label="Order food as customer" onPress={() => router.push("/(customer)")} />
      </ScrollView>
    </DarkScreen>
  );
}
