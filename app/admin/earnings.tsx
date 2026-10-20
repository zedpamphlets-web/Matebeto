import { useCallback, useState } from "react";
import { Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from "react-native";
import { router, useFocusEffect } from "expo-router";
import { supabase } from "@/lib/supabase";
import { LoadingBlock } from "@/components/spinner";
import { formatKw } from "@/lib/lipila";
import { fonts, ui } from "@/lib/theme";

type Stats = {
  fee_today: number; fee_week: number; fee_month: number; fee_all: number;
  orders_all: number; orders_today: number;
  vendor_sent: number; rider_sent: number;
  waiting: number; failed: number; failed_amount: number;
};

export default function AdminEarnings() {
  const [s, setS] = useState<Stats | null>(null);
  const [err, setErr] = useState("");
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    const { data, error } = await supabase.rpc("admin_earnings");
    if (error) setErr(error.message);
    else {
      setErr("");
      setS(data as Stats);
    }
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  async function refresh() {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: ui.bg }}
      contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} />}
    >
      {!s && !err ? <LoadingBlock minHeight={240} /> : null}
      {err ? <Text style={st.err}>{err}</Text> : null}
      {s ? (
        <>
          <View style={st.hero}>
            <Text style={st.heroLabel}>Platform fees earned</Text>
            <Text style={st.heroValue}>{formatKw(s.fee_all)}</Text>
            <Text style={st.heroSub}>{s.orders_all} completed {Number(s.orders_all) === 1 ? "order" : "orders"}</Text>
          </View>

          <View style={st.row}>
            <Box label="Today" value={formatKw(s.fee_today)} sub={`${s.orders_today} orders`} />
            <Box label="This week" value={formatKw(s.fee_week)} />
            <Box label="This month" value={formatKw(s.fee_month)} />
          </View>

          <Text style={st.head}>Payouts</Text>
          <Line label="Paid to vendors" value={formatKw(s.vendor_sent)} />
          <Line label="Paid to riders" value={formatKw(s.rider_sent)} />
          <Line label="Waiting to be sent" value={String(s.waiting)} />
          <Line
            label="Failed (need retry)"
            value={Number(s.failed) ? `${s.failed} · ${formatKw(s.failed_amount)}` : "0"}
            red={Number(s.failed) > 0}
          />

          {Number(s.failed) > 0 ? (
            <Pressable onPress={() => router.push("/admin/orders")} style={st.btn}>
              <Text style={st.btnText}>Open Orders to retry</Text>
            </Pressable>
          ) : null}

          <Text style={st.note}>
            Platform fees are counted from completed orders. This is not your Lipila balance; check Lipila for the money held there.
          </Text>
        </>
      ) : null}
    </ScrollView>
  );
}

function Box({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <View style={st.box}>
      <Text style={st.boxLabel}>{label}</Text>
      <Text style={st.boxValue}>{value}</Text>
      {sub ? <Text style={st.boxSub}>{sub}</Text> : null}
    </View>
  );
}

function Line({ label, value, red }: { label: string; value: string; red?: boolean }) {
  return (
    <View style={st.line}>
      <Text style={st.lineLabel}>{label}</Text>
      <Text style={[st.lineValue, red ? { color: ui.red } : null]}>{value}</Text>
    </View>
  );
}

const st = StyleSheet.create({
  hero: { backgroundColor: ui.redSoft, borderColor: ui.redLine, borderWidth: 1, borderRadius: 16, padding: 20, marginBottom: 12 },
  heroLabel: { fontFamily: fonts.body, fontSize: 14, color: ui.sub },
  heroValue: { fontFamily: fonts.display, fontSize: 38, color: ui.ink, marginTop: 4 },
  heroSub: { fontFamily: fonts.body, fontSize: 13, color: ui.sub, marginTop: 4 },
  row: { flexDirection: "row", gap: 10, marginBottom: 22 },
  box: { flex: 1, borderWidth: 1, borderColor: ui.line, borderRadius: 14, padding: 12, backgroundColor: "#fff" },
  boxLabel: { fontFamily: fonts.body, fontSize: 12, color: ui.sub },
  boxValue: { fontFamily: fonts.title, fontSize: 17, color: ui.ink, marginTop: 4 },
  boxSub: { fontFamily: fonts.body, fontSize: 11.5, color: ui.sub, marginTop: 2 },
  head: { fontFamily: fonts.title, fontSize: 16, color: ui.ink, marginBottom: 6 },
  line: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: ui.line },
  lineLabel: { fontFamily: fonts.body, fontSize: 15, color: ui.ink },
  lineValue: { fontFamily: fonts.title, fontSize: 15, color: ui.ink },
  btn: { backgroundColor: ui.red, borderRadius: 12, paddingVertical: 14, alignItems: "center", marginTop: 16 },
  btnText: { fontFamily: fonts.title, fontSize: 15, color: "#fff" },
  note: { fontFamily: fonts.body, fontSize: 12.5, color: ui.sub, marginTop: 18, lineHeight: 18 },
  err: { fontFamily: fonts.body, color: ui.red, marginVertical: 12 },
});
