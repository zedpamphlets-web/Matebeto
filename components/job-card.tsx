import { Linking, Pressable, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { supabase } from "@/lib/supabase";
import { formatKw } from "@/lib/lipila";
import { fonts, ui } from "@/lib/theme";

/** What a rider may see about a job. Before accepting: market, area, trip price. After: vendor and customer details. */
export type JobCard = {
  stage: "offered" | "assigned";
  order_number?: number | string;
  market_name?: string;
  area?: string;
  trip_price?: number | string;
  vendor_name?: string;
  vendor_phone?: string;
  customer_name?: string;
  customer_phone?: string;
  address?: string;
  notes?: string;
};

export async function fetchJobCard(orderId: string): Promise<JobCard | null> {
  try {
    const { data, error } = await supabase.rpc("rider_job_card", { p_order: orderId });
    if (error || !data || !(data as any).ok) return null;
    return data as JobCard;
  } catch {
    return null;
  }
}

export function callNumber(raw?: string, onFail?: (shown: string) => void) {
  const number = String(raw || "").replace(/[^\d+]/g, "");
  if (!number) return;
  Linking.openURL(`tel:${number}`).catch(() => onFail?.(number));
}

/** Origin, Delivery, Amount: the three lines on a new delivery request. */
export function OfferSummary({ card, order }: { card?: JobCard | null; order?: any }) {
  const price = card?.trip_price ?? order?.delivery_fee;
  return (
    <View>
      <Line icon="storefront-outline" label="Origin" value={card?.market_name || "Market"} />
      <Line icon="location-outline" label="Delivery" value={card?.area || "Area"} />
      <Line icon="cash-outline" label="Amount" value={price != null ? formatKw(price) : "—"} last />
    </View>
  );
}

export function Line({ icon, label, value, last }: { icon: keyof typeof Ionicons.glyphMap; label: string; value: string; last?: boolean }) {
  return (
    <View style={[s.line, !last && s.rule]}>
      <Ionicons name={icon} size={20} color={ui.red} />
      <Text style={s.lineLabel}>{label}</Text>
      <Text style={s.lineValue} numberOfLines={2}>{value}</Text>
    </View>
  );
}

/** A titled block of "label / value" rows, with an optional call button on a row. */
export function InfoBlock({
  title,
  rows,
}: {
  title: string;
  rows: { label: string; value?: string; call?: string }[];
}) {
  const shown = rows.filter((r) => r.value);
  if (!shown.length) return null;
  return (
    <View style={s.block}>
      <Text style={s.blockTitle}>{title}</Text>
      {shown.map((r, i) => (
        <View key={r.label} style={[s.row, i < shown.length - 1 && s.rule]}>
          <View style={{ flex: 1 }}>
            <Text style={s.rowLabel}>{r.label}</Text>
            <Text style={s.rowValue}>{r.value}</Text>
          </View>
          {r.call ? (
            <Pressable onPress={() => callNumber(r.call)} style={s.callBtn} hitSlop={8} accessibilityLabel={`Call ${r.label}`}>
              <Ionicons name="call" size={18} color="#fff" />
            </Pressable>
          ) : null}
        </View>
      ))}
    </View>
  );
}

const s = StyleSheet.create({
  line: { flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 14 },
  rule: { borderBottomWidth: 1, borderBottomColor: ui.line },
  lineLabel: { fontFamily: fonts.body, fontSize: 14, color: ui.sub, width: 70 },
  lineValue: { flex: 1, fontFamily: fonts.title, fontSize: 16, color: ui.ink, textAlign: "right" },
  block: { borderWidth: 1, borderColor: ui.line, borderRadius: 16, backgroundColor: "#fff", paddingHorizontal: 16, paddingTop: 14, paddingBottom: 4, marginTop: 12 },
  blockTitle: { fontFamily: fonts.display, fontSize: 13, letterSpacing: 1.2, color: ui.red, textTransform: "uppercase", marginBottom: 4 },
  row: { flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 12 },
  rowLabel: { fontFamily: fonts.body, fontSize: 13, color: ui.sub },
  rowValue: { fontFamily: fonts.bodySemi, fontSize: 15.5, color: ui.ink, marginTop: 2, lineHeight: 21 },
  callBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: ui.red, alignItems: "center", justifyContent: "center" },
});
