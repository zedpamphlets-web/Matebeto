import { useCallback, useState } from "react";
import { Alert, Pressable, ScrollView, Text, View } from "react-native";
import { useFocusEffect } from "expo-router";
import { supabase } from "@/lib/supabase";
import { colors, fonts, radius } from "@/lib/theme";
import { formatKw } from "@/lib/lipila";
import { startRiderSearch, startVendorSearch } from "@/lib/orders";
import { AdminOrdersSkeleton } from "@/components/skeleton";
import { OfflineNotice } from "@/components/offline-notice";
import { isOnline, withTimeout } from "@/lib/network";

const PROBLEM_STATUSES = ["NO_VENDOR_FOUND", "NO_RIDER_AVAILABLE", "SUPPORT_REQUIRED", "CUSTOMER_NOT_HOME", "DELIVERY_FAILED"];
const HAS_RIDER = ["RIDER_ASSIGNED", "PICKED_UP", "OUT_FOR_DELIVERY", "CUSTOMER_NOT_HOME", "SUPPORT_REQUIRED"];
const VENDOR_CAN_FAIL = ["VENDOR_ACCEPTED", "SEARCHING_RIDER", "NO_RIDER_AVAILABLE", "RIDER_ASSIGNED"];
const RIDER_SEARCH = ["VENDOR_ACCEPTED", "SEARCHING_RIDER", "NO_RIDER_AVAILABLE"];

function isProblem(o: any) {
  return PROBLEM_STATUSES.includes(o.status) || o.payment_status === "refund_pending";
}

export default function AdminOrders() {
  const [rows, setRows] = useState<any[]>([]);
  const [items, setItems] = useState<any[]>([]);
  const [problemsOnly, setProblemsOnly] = useState(false);
  const [loading, setLoading] = useState(true);
  const [offline, setOffline] = useState(false);

  const load = async () => {
    setLoading(true);
    setOffline(false);
    try {
      const [{ data: o }, { data: i }] = await withTimeout(
        Promise.all([
          supabase.from("orders").select("*").order("created_at", { ascending: false }),
          supabase.from("order_items").select("*"),
        ])
      );
      setRows(o || []);
      setItems(i || []);
      setLoading(false);
    } catch {
      const online = await isOnline();
      setOffline(!online);
      setLoading(false);
    }
  };
  useFocusEffect(
    useCallback(() => {
      load();
    }, [])
  );

  function confirm(title: string, message: string, run: () => void) {
    Alert.alert(title, message, [
      { text: "No", style: "cancel" },
      { text: "Yes", onPress: run },
    ]);
  }

  async function action(fn: string, id: string, done?: string) {
    const { data, error } = await supabase.rpc(fn, { p_order: id });
    if (error) Alert.alert("Action failed", error.message);
    else if (data && data.ok === false) Alert.alert("Not done", data.reason || "Not allowed in this state.");
    else if (done) Alert.alert("Done", done);
    load();
  }

  async function acceptVendor(id: string, yes: boolean) {
    const { error } = await supabase.rpc("respond_vendor", { p_order: id, p_accept: yes });
    if (error) {
      Alert.alert("Vendor response", error.message);
      return load();
    }
    try {
      if (yes) await startRiderSearch(id);
      else await startVendorSearch(id); // the next vendor is messaged by the server within a minute
    } catch (e: any) {
      Alert.alert("Next step", e?.message || "Could not continue.");
    }
    load();
  }

  const shown = problemsOnly ? rows.filter(isProblem) : rows;
  const problemCount = rows.filter(isProblem).length;

  return (
    <ScrollView style={{ flex: 1, backgroundColor: colors.adminBg }} contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>
      <View style={{ flexDirection: "row", gap: 8, marginBottom: 12 }}>
        <Pressable onPress={() => setProblemsOnly(false)} style={[chip, { opacity: problemsOnly ? 0.5 : 1 }]}>
          <Text style={{ fontFamily: fonts.bodySemi }}>All orders</Text>
        </Pressable>
        <Pressable onPress={() => setProblemsOnly(true)} style={[chip, { opacity: problemsOnly ? 1 : 0.5 }]}>
          <Text style={{ fontFamily: fonts.bodySemi }}>Problems ({problemCount})</Text>
        </Pressable>
      </View>

      {offline ? (
        <OfflineNotice dark onRetry={load} />
      ) : loading ? (
        <AdminOrdersSkeleton />
      ) : (
        <>
      {shown.length === 0 && <Text style={{ color: colors.adminMuted, fontFamily: fonts.body }}>No orders.</Text>}

      {shown.map((o) => {
        const open = !["COMPLETED", "CANCELLED"].includes(o.status);
        return (
          <View
            key={o.id}
            style={{
              backgroundColor: colors.adminCard,
              borderWidth: 1,
              borderColor: isProblem(o) ? colors.danger : colors.adminCardBorder,
              borderRadius: radius.md,
              padding: 14,
              marginBottom: 10,
            }}
          >
            <Text style={{ fontFamily: fonts.title, color: colors.adminText }}>
              #{o.order_number} · {formatKw(o.total)}
            </Text>
            <Text style={{ color: colors.adminMuted, fontFamily: fonts.body }}>
              {o.status.replaceAll("_", " ")} · pay {o.payment_status.replaceAll("_", " ")} · {o.delivery_type}
            </Text>
            {items
              .filter((i) => i.order_id === o.id)
              .map((i) => (
                <Text key={i.id} style={{ fontFamily: fonts.body, marginTop: 2 }}>
                  {i.quantity} × {i.meal_name}
                </Text>
              ))}

            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 10 }}>
              {o.status === "VENDOR_OFFERED" && (
                <>
                  <Pressable onPress={() => acceptVendor(o.id, true)} style={chip}>
                    <Text style={{ fontFamily: fonts.bodySemi }}>Vendor accept</Text>
                  </Pressable>
                  <Pressable onPress={() => acceptVendor(o.id, false)} style={chip}>
                    <Text style={{ fontFamily: fonts.bodySemi }}>Vendor decline</Text>
                  </Pressable>
                </>
              )}
              {RIDER_SEARCH.includes(o.status) && (
                <Pressable onPress={() => startRiderSearch(o.id).then(load).catch((e) => Alert.alert("Find rider", e.message))} style={chip}>
                  <Text style={{ fontFamily: fonts.bodySemi }}>Find rider</Text>
                </Pressable>
              )}
              {o.status === "SUPPORT_REQUIRED" && (
                <Pressable
                  onPress={() => confirm("Reset OTP lock?", "The rider can enter the customer's code again.", () => action("reset_delivery_lock", o.id, "OTP lock reset."))}
                  style={chip}
                >
                  <Text style={{ fontFamily: fonts.bodySemi }}>Reset OTP lock</Text>
                </Pressable>
              )}
              {VENDOR_CAN_FAIL.includes(o.status) && (
                <Pressable
                  onPress={() =>
                    confirm("Vendor can't fulfil?", "The whole basket goes to another vendor. Same order number. The new vendor is messaged within a minute.", () =>
                      action("vendor_cannot_fulfil", o.id)
                    )
                  }
                  style={chip}
                >
                  <Text style={{ fontFamily: fonts.bodySemi }}>Vendor can't fulfil</Text>
                </Pressable>
              )}
              {HAS_RIDER.includes(o.status) && (
                <Pressable
                  onPress={() => confirm("Reassign rider?", "The current rider is released and the order goes to another rider. Same order number.", () => action("rider_cannot_finish", o.id))}
                  style={chip}
                >
                  <Text style={{ fontFamily: fonts.bodySemi }}>Reassign rider</Text>
                </Pressable>
              )}
              {o.payment_status === "refund_pending" && (
                <Pressable
                  onPress={() => confirm("Mark refunded?", "Only do this after you sent the money back to the customer.", () => action("admin_mark_refunded", o.id, "Marked refunded."))}
                  style={chip}
                >
                  <Text style={{ fontFamily: fonts.bodySemi }}>Mark refunded</Text>
                </Pressable>
              )}
              {open && (
                <Pressable
                  onPress={() => confirm("Cancel this order?", "If it was paid it will be marked for refund.", () => action("admin_cancel_order", o.id, "Order cancelled."))}
                  style={[chip, { backgroundColor: "#fff" }]}
                >
                  <Text style={{ fontFamily: fonts.bodySemi }}>Cancel</Text>
                </Pressable>
              )}
            </View>
          </View>
        );
      })}
        </>
      )}
    </ScrollView>
  );
}

const chip = {
  backgroundColor: colors.gold,
  paddingHorizontal: 12,
  paddingVertical: 8,
  borderRadius: 10,
};
