import { useCallback, useState } from "react";
import { Alert, Pressable, ScrollView, StyleSheet, Switch, Text, View } from "react-native";
import { router, useFocusEffect } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { supabase } from "@/lib/supabase";
import { LOGIN_ROUTE, currentProfile, signOutApp } from "@/lib/session";
import { LoadingScreen } from "@/components/spinner";
import { confirmDialog } from "@/components/confirm";
import { MkScreen, RedButton } from "@/components/mk";
import { fonts, ui } from "@/lib/theme";

export default function RiderHome() {
  const [rider, setRider] = useState<any>(null);
  const [offers, setOffers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  async function load() {
    const { rider } = await currentProfile();
    setRider(rider);
    if (!rider || rider.status !== "APPROVED") {
      setLoading(false);
      return;
    }
    const { data } = await supabase
      .from("rider_offers")
      .select("*, orders(*)")
      .eq("rider_id", rider.id)
      .eq("status", "OFFERED")
      .order("created_at", { ascending: false });
    setOffers(data || []);
    setLoading(false);
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

  async function logout() {
    const ok = await confirmDialog({
      title: "Log out?",
      message: "Are you sure you want to log out?",
      confirmLabel: "Log out",
      destructive: true,
    });
    if (!ok) return;
    await signOutApp();
    router.replace(LOGIN_ROUTE);
  }

  if (loading) return <LoadingScreen />;

  if (!rider || rider.status !== "APPROVED") {
    const noApplication = !rider;
    return (
      <MkScreen>
        <View style={s.centre}>
          <View style={s.bigIcon}>
            <Ionicons name={noApplication ? "document-text-outline" : "time-outline"} size={34} color={ui.red} />
          </View>
          <Text style={s.h1}>{noApplication ? "Apply to deliver" : statusTitle(rider.status)}</Text>
          <Text style={s.p}>
            {noApplication
              ? "Send your details and an admin will review them. Jobs open once you are approved."
              : "Only approved riders receive jobs. You can keep ordering food as a customer."}
          </Text>
          <View style={{ height: 22, alignSelf: "stretch" }} />
          {noApplication ? (
            <RedButton label="Start application" onPress={() => router.push("/auth/rider-apply")} style={{ alignSelf: "stretch" }} />
          ) : (
            <RedButton label="Order food" onPress={() => router.push("/(customer)")} style={{ alignSelf: "stretch" }} />
          )}
          <Pressable onPress={logout} style={s.linkBtn} hitSlop={8}>
            <Text style={s.linkText}>Log out</Text>
          </Pressable>
        </View>
      </MkScreen>
    );
  }

  return (
    <MkScreen>
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 32 }} showsVerticalScrollIndicator={false}>
        <View style={s.profile}>
          <View style={s.avatar}>
            <Ionicons name={rider.vehicle_type === "motorbike" ? "speedometer-outline" : "bicycle"} size={24} color={ui.red} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={s.name}>{rider.full_name}</Text>
            <Text style={s.vehicle}>{rider.vehicle_type}</Text>
          </View>
        </View>

        <View style={s.onlineCard}>
          <View style={{ flex: 1 }}>
            <Text style={s.onlineTitle}>{rider.is_online ? "You are online" : "You are offline"}</Text>
            <Text style={s.onlineSub}>{rider.is_online ? "New deliveries can reach you." : "Go online to receive deliveries."}</Text>
          </View>
          <Switch
            value={!!rider.is_online}
            onValueChange={toggleOnline}
            trackColor={{ true: ui.red, false: "#D9D9DE" }}
            thumbColor="#fff"
          />
        </View>

        {rider.current_order_id ? (
          <RedButton
            label="Open current job"
            onPress={() => router.push(`/(rider)/job/${rider.current_order_id}`)}
            style={{ marginTop: 12 }}
          />
        ) : null}

        <Text style={s.section}>Delivery requests</Text>
        {offers.length === 0 ? (
          <View style={s.empty}>
            <Ionicons name="bicycle-outline" size={30} color={ui.hint} />
            <Text style={s.emptyText}>No requests right now</Text>
          </View>
        ) : (
          offers.map((off) => (
            <Pressable key={off.id} onPress={() => router.push(`/(rider)/job/${off.orders.id}`)} style={s.offer}>
              <View style={{ flex: 1 }}>
                <Text style={s.offerTitle}>Order #{off.orders.order_number}</Text>
                <Text style={s.offerMeta} numberOfLines={2}>
                  {off.orders.delivery_type} · {off.orders.delivery_address?.text}
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={ui.hint} />
            </Pressable>
          ))
        )}

        <View style={s.rule} />
        <Pressable onPress={() => router.push("/(customer)")} style={s.row}>
          <Ionicons name="restaurant-outline" size={21} color={ui.ink} />
          <Text style={s.rowText}>Order food as a customer</Text>
          <Ionicons name="chevron-forward" size={16} color={ui.hint} />
        </Pressable>
        <Pressable onPress={logout} style={s.row}>
          <Ionicons name="log-out-outline" size={21} color={ui.red} />
          <Text style={[s.rowText, { color: ui.red }]}>Log out</Text>
        </Pressable>
      </ScrollView>
    </MkScreen>
  );
}

function statusTitle(status: string) {
  const t = String(status || "").toLowerCase();
  if (t === "pending") return "Application in review";
  if (t === "rejected") return "Application not approved";
  if (t === "suspended") return "Account suspended";
  return t.charAt(0).toUpperCase() + t.slice(1);
}

const s = StyleSheet.create({
  centre: { flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 28 },
  bigIcon: { width: 76, height: 76, borderRadius: 38, backgroundColor: ui.redSoft, alignItems: "center", justifyContent: "center", marginBottom: 18 },
  h1: { fontFamily: fonts.display, fontSize: 24, color: ui.ink, textAlign: "center", letterSpacing: -0.4 },
  p: { fontFamily: fonts.body, fontSize: 15, lineHeight: 22, color: ui.sub, textAlign: "center", marginTop: 8 },
  linkBtn: { paddingVertical: 16 },
  linkText: { fontFamily: fonts.title, fontSize: 15, color: ui.sub },
  profile: { flexDirection: "row", alignItems: "center", gap: 14, paddingVertical: 8 },
  avatar: { width: 54, height: 54, borderRadius: 27, backgroundColor: ui.redSoft, alignItems: "center", justifyContent: "center" },
  name: { fontFamily: fonts.display, fontSize: 22, color: ui.ink },
  vehicle: { fontFamily: fonts.body, fontSize: 14, color: ui.sub, textTransform: "capitalize", marginTop: 2 },
  onlineCard: { flexDirection: "row", alignItems: "center", gap: 12, borderWidth: 1, borderColor: ui.line, borderRadius: 16, padding: 16, marginTop: 14, backgroundColor: "#fff" },
  onlineTitle: { fontFamily: fonts.title, fontSize: 16, color: ui.ink },
  onlineSub: { fontFamily: fonts.body, fontSize: 13.5, color: ui.sub, marginTop: 3 },
  section: { fontFamily: fonts.title, fontSize: 17, color: ui.ink, marginTop: 26, marginBottom: 10 },
  empty: { alignItems: "center", paddingVertical: 28, borderWidth: 1, borderColor: ui.line, borderRadius: 16, gap: 8 },
  emptyText: { fontFamily: fonts.body, fontSize: 14.5, color: ui.sub },
  offer: { flexDirection: "row", alignItems: "center", borderWidth: 1, borderColor: ui.line, borderRadius: 14, padding: 16, marginBottom: 10, backgroundColor: "#fff" },
  offerTitle: { fontFamily: fonts.title, fontSize: 16, color: ui.ink },
  offerMeta: { fontFamily: fonts.body, fontSize: 13.5, color: ui.sub, marginTop: 3, textTransform: "capitalize" },
  rule: { height: 1, backgroundColor: ui.line, marginTop: 20 },
  row: { flexDirection: "row", alignItems: "center", gap: 14, paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: ui.line },
  rowText: { flex: 1, fontFamily: fonts.title, fontSize: 16, color: ui.ink },
});
