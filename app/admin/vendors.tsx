import { useEffect, useState } from "react";
import { ListSkeleton } from "@/components/skeleton";
import { Alert, Pressable, ScrollView, Text, View } from "react-native";
import { supabase } from "@/lib/supabase";
import { colors, fonts, radius } from "@/lib/theme";
import { Field } from "@/components/ui";
import { AdminButton as PrimaryButton } from "@/components/admin-ui";
import { PhotoPicker } from "@/components/photo-picker";

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
  // what customers see on the restaurant page: photo, stand, cuisine, rating, description
  const [info, setInfo] = useState<Record<string, Record<string, string>>>({});
  const [priceEdit, setPriceEdit] = useState<Record<string, string>>({});
  const infoVal = (v: any, k: string) => info[v.id]?.[k] ?? (v[k] == null ? "" : String(v[k]));
  const setInfoVal = (v: any, k: string, t: string) => setInfo((m) => ({ ...m, [v.id]: { ...(m[v.id] || {}), [k]: t } }));

  async function saveInfo(v: any) {
    const rating = infoVal(v, "rating").trim();
    const count = infoVal(v, "rating_count").trim();
    if (rating && (isNaN(Number(rating)) || Number(rating) < 0 || Number(rating) > 5)) {
      return Alert.alert("Restaurant", "Rating must be a number from 0 to 5.");
    }
    const { error } = await supabase
      .from("vendors")
      .update({
        stand_number: infoVal(v, "stand_number").trim() || null,
        cuisine: infoVal(v, "cuisine").trim() || null,
        description: infoVal(v, "description").trim() || null,
        rating: rating ? Number(rating) : null,
        rating_count: count ? Math.round(Number(count)) : null,
      })
      .eq("id", v.id);
    if (error) return Alert.alert("Restaurant", error.message);
    setInfo((m) => {
      const n = { ...m };
      delete n[v.id];
      return n;
    });
    Alert.alert("Saved", "Customers will see these details on the restaurant page.");
    load();
  }

  async function saveVendorPhoto(v: any, url: string | null) {
    const { error } = await supabase.from("vendors").update({ image_url: url }).eq("id", v.id);
    if (error) Alert.alert("Photo", error.message);
    load();
  }

  async function saveMealPrice(v: any, mealId: string, mainPrice: number) {
    const key = `${v.id}:${mealId}`;
    const raw = (priceEdit[key] ?? "").trim();
    const price = raw === "" ? null : Number(raw);
    if (price !== null && (isNaN(price) || price < 0)) return Alert.alert("Price", "Enter a valid price.");
    const { error } = await supabase.from("vendor_meals").update({ price }).eq("vendor_id", v.id).eq("meal_id", mealId);
    if (error) return Alert.alert("Price", error.message);
    Alert.alert("Saved", "This restaurant's price is updated.");
    setPriceEdit((m) => {
      const n = { ...m };
      delete n[key];
      return n;
    });
    load();
  }

  async function saveMealPhoto(v: any, mealId: string, url: string | null) {
    const { error } = await supabase.from("vendor_meals").update({ image_url: url }).eq("vendor_id", v.id).eq("meal_id", mealId);
    if (error) Alert.alert("Photo", error.message);
    load();
  }

  async function load() {
    const [{ data }, { data: m }, { data: mealsRows }, { data: vm }] = await Promise.all([
      supabase.from("vendors").select("*, markets(name)").order("name"),
      supabase.from("markets").select("*").order("sort_order"),
      supabase.from("meals").select("id,name,price").order("name"),
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
          <Text style={{ marginTop: 10, marginBottom: 6, fontFamily: fonts.bodySemi }}>Restaurant page (what customers see)</Text>
          <PhotoPicker folder={`restaurants/${v.id}`} uri={v.image_url} name={v.name} onChange={(url) => saveVendorPhoto(v, url)} height={120} />
          <Field value={infoVal(v, "stand_number")} onChangeText={(t) => setInfoVal(v, "stand_number", t)} placeholder="Stand number, e.g. 12" />
          <View style={{ height: 6 }} />
          <Field value={infoVal(v, "cuisine")} onChangeText={(t) => setInfoVal(v, "cuisine", t)} placeholder="Cuisine, e.g. Traditional · Local Dishes" />
          <View style={{ height: 6 }} />
          <Field value={infoVal(v, "rating")} onChangeText={(t) => setInfoVal(v, "rating", t)} placeholder="Rating 0-5, e.g. 4.6 (leave empty to hide)" keyboardType="decimal-pad" />
          <View style={{ height: 6 }} />
          <Field value={infoVal(v, "rating_count")} onChangeText={(t) => setInfoVal(v, "rating_count", t)} placeholder="Number of ratings, e.g. 120" keyboardType="number-pad" />
          <View style={{ height: 6 }} />
          <Field value={infoVal(v, "description")} onChangeText={(t) => setInfoVal(v, "description", t)} placeholder="Short description" />
          <View style={{ height: 10 }} />
          <PrimaryButton label="Save restaurant details" onPress={() => saveInfo(v)} />
          <Text style={{ marginTop: 14, fontFamily: fonts.bodySemi }}>Mobile money number for payments</Text>
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
          <Text style={{ color: colors.adminMuted, fontFamily: fonts.body, fontSize: 12, marginBottom: 4 }}>
            Tick a meal to put it on this restaurant's menu, then set its own price and food photo.
          </Text>
          {meals.map((meal) => {
            const link = links.find((l) => l.vendor_id === v.id && l.meal_id === meal.id);
            const on = !!link;
            const key = `${v.id}:${meal.id}`;
            return (
              <View key={meal.id} style={{ paddingVertical: 4 }}>
                <Pressable onPress={() => toggleMeal(v.id, meal.id, on)}>
                  <Text style={{ fontFamily: fonts.body, color: on ? colors.customerDeep : colors.muted }}>
                    {on ? "✓" : "○"} {meal.name}
                  </Text>
                </Pressable>
                {on ? (
                  <View style={{ marginLeft: 20, marginTop: 6 }}>
                    <Field
                      value={priceEdit[key] ?? (link.price == null ? "" : String(link.price))}
                      onChangeText={(t) => setPriceEdit((m) => ({ ...m, [key]: t }))}
                      placeholder={`Price in K (empty = ${Number(meal.price)})`}
                      keyboardType="decimal-pad"
                    />
                    <Pressable onPress={() => saveMealPrice(v, meal.id, Number(meal.price))} style={{ marginTop: 6, marginBottom: 6, backgroundColor: colors.customerDeep, borderRadius: 10, paddingVertical: 10, alignItems: "center" }}>
                      <Text style={{ fontFamily: fonts.bodySemi, color: "#fff" }}>Save price</Text>
                    </Pressable>
                    <View style={{ height: 6 }} />
                    <PhotoPicker folder={`restaurants/${v.id}/meals`} uri={link.image_url} name={meal.name} onChange={(url) => saveMealPhoto(v, meal.id, url)} height={90} />
                  </View>
                ) : null}
              </View>
            );
          })}
        </View>
      ))}
    </ScrollView>
  );
}
