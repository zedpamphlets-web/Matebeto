import { useCallback, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { router, useFocusEffect } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { supabase } from "@/lib/supabase";
import { fonts, ui } from "@/lib/theme";
import { LOGIN_ROUTE, signOutApp } from "@/lib/session";
import { confirmDialog } from "@/components/confirm";

const PROBLEM_STATUSES = ["NO_VENDOR_FOUND", "NO_RIDER_AVAILABLE", "SUPPORT_REQUIRED", "CUSTOMER_NOT_HOME", "DELIVERY_FAILED"];

type CardDef = {
  title: string;
  text?: string;
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
        .in("payment_status", ["paid", "refund_pending", "refunded"])
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

  const cards: CardDef[] = [
    {
      title: "Orders",
      text: open || problems ? (problems ? `${problems} need attention · ${open} open` : `${open} open`) : undefined,
      icon: "receipt-outline",
      href: "/admin/orders",
      badge: problems,
    },
    {
      title: "Earnings",
      text: "Platform fees and payouts",
      icon: "wallet-outline",
      href: "/admin/earnings",
    },
    {
      title: "Home screen",
      icon: "home-outline",
      href: "/admin/settings",
    },
    {
      title: "Markets",
      icon: "storefront-outline",
      href: "/admin/markets",
    },
    {
      title: "Menu",
      icon: "restaurant-outline",
      href: "/admin/catalog",
    },
    {
      title: "Vendors",
      icon: "people-outline",
      href: "/admin/vendors",
    },
    {
      title: "Riders",
      text: pendingRiders ? `${pendingRiders} pending` : undefined,
      icon: "bicycle-outline",
      href: "/admin/riders",
      badge: pendingRiders,
    },
  ];

  return (
    <ScrollView style={{ flex: 1, backgroundColor: ui.bg }} contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>
            {cards.map((c) => (
        <Pressable key={c.title} onPress={() => router.push(c.href as any)} style={styles.card}>
          <View style={styles.icon}>
            <Ionicons name={c.icon} size={26} color={ui.red} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.title}>{c.title}</Text>
            {c.text ? <Text style={styles.text}>{c.text}</Text> : null}
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
        </View>
        <Ionicons name="chevron-forward" size={18} color={ui.ink} />
      </Pressable>

      <Pressable onPress={logout} style={styles.logout}>
        <Ionicons name="log-out-outline" size={20} color={ui.red} />
        <Text style={styles.logoutText}>Log out</Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  logout: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, paddingVertical: 18, marginTop: 6 },
  logoutText: { fontFamily: fonts.title, fontSize: 16, color: ui.red },
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
