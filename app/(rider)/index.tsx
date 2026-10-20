import { useCallback, useEffect, useRef, useState } from "react";
import { Alert, AppState, Modal, Pressable, ScrollView, StyleSheet, Switch, Text, Vibration, View } from "react-native";
import * as Notifications from "expo-notifications";
import { router, useFocusEffect } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { supabase } from "@/lib/supabase";
import { LOGIN_ROUTE, currentProfile, signOutApp } from "@/lib/session";
import { LoadingScreen } from "@/components/spinner";
import { confirmDialog } from "@/components/confirm";
import { MkScreen, RedButton } from "@/components/mk";
import { OfferSummary, fetchJobCard, type JobCard } from "@/components/job-card";
import { startRiderSearch } from "@/lib/orders";
import { fonts, ui } from "@/lib/theme";

export default function RiderHome() {
  const [rider, setRider] = useState<any>(null);
  const [offers, setOffers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const seenOffers = useRef<Set<string> | null>(null);

  const [cards, setCards] = useState<Record<string, JobCard>>({});
  const [popup, setPopup] = useState<any | null>(null);
  const [acting, setActing] = useState(false);

  function announceJob(offer: any) {
    Vibration.vibrate([0, 300, 150, 300]);
    setPopup(offer);
  }

  async function respond(offer: any, yes: boolean) {
    if (acting) return;
    setActing(true);
    const { error } = await supabase.rpc("rider_respond", { p_order: offer.order_id, p_accept: yes });
    setActing(false);
    if (error) {
      setPopup(null);
      Alert.alert("Could not respond", error.message);
      load();
      return;
    }
    setPopup(null);
    if (yes) {
      router.push(`/(rider)/job/${offer.order_id}` as never);
    } else {
      await startRiderSearch(String(offer.order_id)).catch(() => null);
      load();
    }
  }

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
    const list = data || [];
    if (seenOffers.current === null) {
      seenOffers.current = new Set(list.map((o: any) => o.id));
    } else {
      const fresh = list.filter((o: any) => !seenOffers.current!.has(o.id));
      fresh.forEach((o: any) => seenOffers.current!.add(o.id));
      if (fresh.length) announceJob(fresh[0]);
    }
    setOffers(list);
    setLoading(false);
    // the card shows market, area and trip price (nothing else until the job is accepted)
    const got = await Promise.all(list.map(async (o: any) => [o.order_id, await fetchJobCard(o.order_id)] as const));
    setCards((prev) => {
      const next = { ...prev };
      got.forEach(([id, c]) => {
        if (c) next[String(id)] = c;
      });
      return next;
    });
  }

  // Check for new jobs while this screen is open, when the app comes back, and when a push arrives.
  useFocusEffect(
    useCallback(() => {
      load();
      const timer = setInterval(() => load().catch(() => {}), 12000);
      const appState = AppState.addEventListener("change", (state) => {
        if (state === "active") load().catch(() => {});
      });
      let received: { remove: () => void } | undefined;
      try {
        received = Notifications.addNotificationReceivedListener(() => {
          setTimeout(() => load().catch(() => {}), 1200);
        });
      } catch {
        // polling still keeps the list fresh
      }
      return () => {
        clearInterval(timer);
        appState.remove();
        received?.remove();
      };
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
              <View style={s.offerHead}>
                <Text style={s.offerTitle}>New delivery</Text>
                <Text style={s.offerNum}>Order #{off.orders.order_number}</Text>
              </View>
              <OfferSummary card={cards[String(off.order_id)]} order={off.orders} />
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

      <Modal visible={!!popup} transparent animationType="slide" onRequestClose={() => setPopup(null)}>
        <View style={s.backdrop}>
          <Pressable style={StyleSheet.absoluteFill} onPress={() => setPopup(null)} />
          <View style={s.sheet}>
            <View style={s.grab} />
            <Text style={s.sheetTitle}>New delivery</Text>
            <Text style={s.sheetNum}>Order #{popup?.orders?.order_number}</Text>
            <View style={{ marginTop: 10 }}>
              <OfferSummary card={popup ? cards[String(popup.order_id)] : null} order={popup?.orders} />
            </View>
            <RedButton label="Accept" onPress={() => respond(popup, true)} style={{ marginTop: 16 }} />
            <Pressable onPress={() => respond(popup, false)} style={s.declineBtn}>
              <Text style={s.declineText}>Decline</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
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
  offer: { borderWidth: 1, borderColor: ui.line, borderRadius: 16, paddingHorizontal: 16, paddingTop: 14, marginBottom: 12, backgroundColor: "#fff" },
  offerHead: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  offerNum: { fontFamily: fonts.bodySemi, fontSize: 13.5, color: ui.sub },
  backdrop: { flex: 1, backgroundColor: "rgba(17,17,24,0.45)", justifyContent: "flex-end" },
  sheet: { backgroundColor: "#fff", borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, paddingBottom: 28 },
  grab: { alignSelf: "center", width: 44, height: 5, borderRadius: 3, backgroundColor: "#E3E2E8", marginBottom: 14 },
  sheetTitle: { fontFamily: fonts.display, fontSize: 24, color: ui.ink, letterSpacing: -0.4 },
  sheetNum: { fontFamily: fonts.body, fontSize: 14.5, color: ui.sub, marginTop: 2 },
  declineBtn: { alignItems: "center", paddingVertical: 16 },
  declineText: { fontFamily: fonts.title, fontSize: 15.5, color: ui.sub },
  offerTitle: { fontFamily: fonts.title, fontSize: 16, color: ui.ink },
  rule: { height: 1, backgroundColor: ui.line, marginTop: 20 },
  row: { flexDirection: "row", alignItems: "center", gap: 14, paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: ui.line },
  rowText: { flex: 1, fontFamily: fonts.title, fontSize: 16, color: ui.ink },
});
