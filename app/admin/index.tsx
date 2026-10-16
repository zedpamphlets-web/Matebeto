import { useCallback, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { router, useFocusEffect } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { supabase } from "@/lib/supabase";
import { fonts, ui } from "@/lib/theme";

const PROBLEM_STATUSES = ["NO_VENDOR_FOUND", "NO_RIDER_AVAILABLE", "SUPPORT_REQUIRED", "CUSTOMER_NOT_HOME", "DELIVERY_FAILED"];

type CardDef = {
  title: string;
  text: string;
  icon: keyof typeof Ionicons.glyphMap;
  href: string;
  badge?: number;
};

export default function AdminDashboard() {
  const [open, setOpen] = useState(0);
  const [problems, setProblems] = useState(0);
  const [pendingRiders, setPendingRiders] = useState(0);

  useFocusEffect(
    useCallback(() => {
      supabase
        .from("orders")
        .select("status,payment_status")
        .then(({ data }) => {
          const rows = data || [];
          setOpen(rows.filter((o: any) => !["COMPLETED", "CANCELLED"].includes(o.status)).length);
          setProblems(
            rows.filter((o: any) => PROBLEM_STATUSES.includes(o.status) || o.payment_status === "refund_pending").length
          );
        });
      supabase
        .from("riders")
        .select("id")
        .eq("status", "PENDING")
        .then(({ data }) => setPendingRiders((data || []).length));
    }, [])
  );

  const cards: CardDef[] = [
    {
      title: "Orders",
      text: problems ? `${problems} need attention · ${open} open` : `${open} open`,
      icon: "receipt-outline",
      href: "/admin/orders",
      badge: problems,
    },
    {
      title: "Home screen",
      text: "Banners and fees",
      icon: "home-outline",
      href: "/admin/settings",
    },
    {
      title: "Markets",
      text: "Markets on home",
      icon: "storefront-outline",
      href: "/admin/markets",
    },
    {
      title: "Menu",
      text: "Categories and meals",
      icon: "restaurant-outline",
      href: "/admin/catalog",
    },
    {
      title: "Vendors",
      text: "Partner kitchens",
      icon: "people-outline",
      href: "/admin/vendors",
    },
    {
      title: "Riders",
      text: pendingRiders ? `${pendingRiders} pending` : "Applications",
      icon: "bicycle-outline",
      href: "/admin/riders",
      badge: pendingRiders,
    },
  ];

  return (
    <ScrollView style={{ flex: 1, backgroundColor: ui.bg }} contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>
      <Text style={styles.lead}>What do you want to manage?</Text>
      {cards.map((c) => (
        <Pressable key={c.title} onPress={() => router.push(c.href as any)} style={styles.card}>
          <View style={styles.icon}>
            <Ionicons name={c.icon} size={26} color={ui.red} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.title}>{c.title}</Text>
            <Text style={styles.text}>{c.text}</Text>
          </View>
          {c.badge ? (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{c.badge}</Text>
            </View>
          ) : null}
          <Ionicons name="chevron-forward" size={18} color={ui.ink} />
        </Pressable>
      ))}

      <Pressable onPress={() => router.push("/(customer)")} style={[styles.card, styles.customer]}>
        <View style={[styles.icon, { backgroundColor: ui.red }]}>
          <Ionicons name="phone-portrait-outline" size={24} color="#fff" />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.title}>Open customer app</Text>
          <Text style={styles.text}>See Home the way customers see it</Text>
        </View>
        <Ionicons name="chevron-forward" size={18} color={ui.ink} />
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  lead: { fontFamily: fonts.display, fontSize: 22, color: ui.ink, marginBottom: 14, marginTop: 4 },
  card: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: ui.line,
    padding: 16,
    marginBottom: 12,
    gap: 14,
    shadowColor: "#1C1B26",
    shadowOpacity: 0.06,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
    elevation: 2,
  },
  customer: { backgroundColor: ui.redSoft, borderColor: ui.redLine, marginTop: 8 },
  icon: {
    width: 52,
    height: 52,
    borderRadius: 14,
    backgroundColor: ui.redSoft,
    alignItems: "center",
    justifyContent: "center",
  },
  title: { fontFamily: fonts.title, fontSize: 16, color: ui.ink },
  text: { fontFamily: fonts.body, fontSize: 12.5, color: ui.sub, marginTop: 3, lineHeight: 18 },
  badge: {
    minWidth: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: ui.red,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 7,
  },
  badgeText: { color: "#fff", fontFamily: fonts.title, fontSize: 12 },
});
