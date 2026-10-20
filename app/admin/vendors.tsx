import { useEffect, useState } from "react";
import { ListSkeleton } from "@/components/skeleton";
import { Alert, Pressable, ScrollView, Text, View } from "react-native";
import { supabase } from "@/lib/supabase";
import { colors, fonts, radius } from "@/lib/theme";
import { Field } from "@/components/ui";
import { AdminButton as PrimaryButton } from "@/components/admin-ui";

export default function Vendors() {
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [markets, setMarkets] = useState<any[]>([]);
  const [meals, setMeals] = useState<any[]>([]);
  const [links, setLinks] = useState<any[]>([]);
  const [name, setName] = useState("");
  const [contact, setContact] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [payout, setPayout] = useState("");
  const [payoutEdit, setPayoutEdit] = useState<Record<string, string>>({});
  const [marketId, setMarketId] = useState("");

  async function load() {
    const [{ data }, { data: m }, { data: mealsRows }, { data: vm }] = await Promise.all([
      supabase.from("vendors").select("*, markets(name)").order("name"),
      supabase.from("markets").select("*").order("sort_order"),
      supabase.from("meals").select("id,name").order("name"),
      supabase.from("vendor_meals").select("*"),
    ]);
    setRows(data || []);
    setMarkets(m || []);
    setMeals(mealsRows || []);
    setLinks(vm || []);
    if (!marketId && m?.[0]) setMarketId(m[0].id);
    setLoading(false);
  }
  useEffect(() => {
    load();
  }, []);

  async function add() {
    if (!name.trim() || !whatsapp.trim() || !marketId) {
      return Alert.alert("Vendor", "Name, WhatsApp and market are required.");
    }
    const { error } = await supabase.from("vendors").insert({
      name: name.trim(),
      contact_name: contact.trim() || null,
      whatsapp: whatsapp.trim(),
      phone: whatsapp.trim(),
      payout_number: payout.trim() || null,
      market_id: marketId,
      is_active: true,
      is_available: true,
    });
    if (error) return Alert.alert("Vendor", error.message);
    setName("");
    setContact("");
    setWhatsapp("");
    setPayout("");
    load();
  }

  async function savePayout(v: any) {
    const value = (payoutEdit[v.id] ?? v.payout_number ?? "").trim();
    const { error } = await supabase.from("vendors").update({ payout_number: value || null }).eq("id", v.id);
    if (error) return Alert.alert("Payout number", error.message);
    setPayoutEdit((m) => {
      const n = { ...m };
      delete n[v.id];
      return n;
    });
    Alert.alert("Saved", "Payments for this vendor go to this number.");
    load();
  }

  async function toggle(v: any, field: "is_available" | "is_active") {
    const { error } = await supabase.from("vendors").update({ [field]: !v[field] }).eq("id", v.id);
    if (error) Alert.alert("Vendor", error.message);
    load();
  }

  async function toggleMeal(vendorId: string, mealId: string, on: boolean) {
    if (on) {
      const { error } = await supabase.from("vendor_meals").delete().eq("vendor_id", vendorId).eq("meal_id", mealId);
      if (error) Alert.alert("Menu", error.message);
    } else {
      const { error } = await supabase.from("vendor_meals").insert({ vendor_id: vendorId, meal_id: mealId, is_available: true });
      if (error) Alert.alert("Menu", error.message);
    }
    load();
  }

  if (loading && rows.length === 0) return <View style={{ flex: 1, backgroundColor: colors.adminBg, padding: 16 }}><ListSkeleton /></View>;

  return (
    <ScrollView style={{ flex: 1, backgroundColor: colors.adminBg }} contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>
      <Text style={{ fontFamily: fonts.title, fontSize: 18, color: colors.adminText }}>Add vendor</Text>
      <Field value={name} onChangeText={setName} placeholder="Vendor name" />
      <View style={{ height: 8 }} />
      <Field value={contact} onChangeText={setContact} placeholder="Contact person" />
      <View style={{ height: 8 }} />
      <Field value={whatsapp} onChangeText={setWhatsapp} placeholder="WhatsApp 2609..." />
      <View style={{ height: 8 }} />
      <Field value={payout} onChangeText={setPayout} placeholder="Mobile money number for payments (optional)" keyboardType="phone-pad" />
      <Text style={{ marginVertical: 8, color: colors.adminMuted, fontFamily: fonts.body }}>Market</Text>
      {markets.map((m) => (
        <Pressable key={m.id} onPress={() => setMarketId(m.id)}>
          <Text style={{ fontFamily: marketId === m.id ? fonts.title : fonts.body, marginBottom: 4, color: marketId === m.id ? colors.customerDeep : colors.ink }}>
            {m.name}
          </Text>
        </Pressable>
      ))}
      <View style={{ height: 10 }} />
      <PrimaryButton label="Save vendor" onPress={add} />
      <View style={{ height: 16 }} />
      {rows.length === 0 && <Text style={{ color: colors.adminMuted, fontFamily: fonts.body }}>No vendors yet.</Text>}
      {rows.map((v) => (
        <View key={v.id} style={{ backgroundColor: colors.adminCard, borderWidth: 1, borderColor: colors.adminCardBorder, borderRadius: radius.md, padding: 12, marginBottom: 8 }}>
          <Text style={{ fontFamily: fonts.title, color: colors.adminText }}>{v.name}</Text>
          <Text style={{ color: colors.adminMuted, fontFamily: fonts.body }}>
            {v.markets?.name} · {v.whatsapp}
          </Text>
          <Text style={{ marginTop: 10, fontFamily: fonts.bodySemi }}>Mobile money number for payments</Text>
          <Field
            value={payoutEdit[v.id] ?? v.payout_number ?? ""}
            onChangeText={(t) => setPayoutEdit((m) => ({ ...m, [v.id]: t }))}
            placeholder={v.phone || v.whatsapp || "2609..."}
            keyboardType="phone-pad"
          />
          {payoutEdit[v.id] !== undefined && payoutEdit[v.id] !== (v.payout_number ?? "") ? (
            <Pressable onPress={() => savePayout(v)} style={{ marginTop: 6 }}>
              <Text style={{ fontFamily: fonts.bodySemi, color: colors.customerDeep }}>Save number</Text>
            </Pressable>
          ) : null}
          <Pressable onPress={() => toggle(v, "is_available")} style={{ marginTop: 8 }}>
            <Text style={{ fontFamily: fonts.bodySemi, color: colors.customerDeep }}>
              {v.is_available ? "Available for orders" : "Unavailable"}
            </Text>
          </Pressable>
          <Text style={{ marginTop: 10, fontFamily: fonts.bodySemi }}>Meals this vendor can fulfil</Text>
          {meals.length === 0 && (
            <Text style={{ color: colors.adminMuted, fontFamily: fonts.body }}>Add meals in Menu first.</Text>
          )}
          {meals.map((meal) => {
            const on = links.some((l) => l.vendor_id === v.id && l.meal_id === meal.id);
            return (
              <Pressable key={meal.id} onPress={() => toggleMeal(v.id, meal.id, on)} style={{ paddingVertical: 4 }}>
                <Text style={{ fontFamily: fonts.body, color: on ? colors.customerDeep : colors.muted }}>
                  {on ? "✓" : "○"} {meal.name}
                </Text>
              </Pressable>
            );
          })}
        </View>
      ))}
    </ScrollView>
  );
}
