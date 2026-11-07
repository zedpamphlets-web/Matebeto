import { useEffect, useState } from "react";
import { ListSkeleton } from "@/components/skeleton";
import { Alert, Pressable, ScrollView, Text, View } from "react-native";
import { supabase } from "@/lib/supabase";
import { colors, fonts, radius } from "@/lib/theme";
import { Field } from "@/components/ui";
import { AdminButton as PrimaryButton } from "@/components/admin-ui";
import { PhotoPicker } from "@/components/photo-picker";
import { Photo } from "@/components/photo";
import { Ionicons } from "@expo/vector-icons";

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
  const [showAdd, setShowAdd] = useState(false);
  const [openId, setOpenId] = useState<string | null>(null);
  const [openSec, setOpenSec] = useState<Record<string, string>>({});
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
      return Alert.alert("Restaurant", "Name, WhatsApp and market are required.");
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
    setShowAdd(false);
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

  const sec = (v: any) => openSec[v.id] || "";
  const toggleSec = (v: any, name: string) => setOpenSec((m) => ({ ...m, [v.id]: m[v.id] === name ? "" : name }));
  const mealCount = (v: any) => links.filter((l) => l.vendor_id === v.id).length;

  const Row = ({ v, name, icon, title, hint }: { v: any; name: string; icon: any; title: string; hint?: string }) => (
    <Pressable
      onPress={() => toggleSec(v, name)}
      style={{ flexDirection: "row", alignItems: "center", paddingVertical: 14, borderTopWidth: 1, borderTopColor: colors.adminCardBorder }}
    >
      <View style={{ width: 34, height: 34, borderRadius: 17, backgroundColor: "#FDECEE", alignItems: "center", justifyContent: "center", marginRight: 12 }}>
        <Ionicons name={icon} size={18} color="#D6263A" />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={{ fontFamily: fonts.title, fontSize: 14.5, color: colors.adminText }}>{title}</Text>
        {hint ? <Text style={{ fontFamily: fonts.body, fontSize: 12, color: colors.adminMuted, marginTop: 1 }}>{hint}</Text> : null}
      </View>
      <Ionicons name={sec(v) === name ? "chevron-up" : "chevron-down"} size={18} color={colors.adminMuted} />
    </Pressable>
  );

  const label = { fontFamily: fonts.bodySemi, fontSize: 12.5, color: colors.adminMuted, marginTop: 10, marginBottom: 6 } as const;

  return (
    <ScrollView style={{ flex: 1, backgroundColor: colors.adminBg }} contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>
      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
        <View>
          <Text style={{ fontFamily: fonts.title, fontSize: 20, color: colors.adminText }}>Restaurants</Text>
          <Text style={{ fontFamily: fonts.body, fontSize: 12.5, color: colors.adminMuted }}>{rows.length} in total</Text>
        </View>
        <Pressable onPress={() => setShowAdd((x) => !x)} style={{ backgroundColor: "#D6263A", borderRadius: 20, paddingHorizontal: 16, paddingVertical: 10 }}>
          <Text style={{ fontFamily: fonts.bodySemi, color: "#fff" }}>{showAdd ? "Close" : "+ Add restaurant"}</Text>
        </Pressable>
      </View>

      {showAdd ? (
        <View style={{ backgroundColor: colors.adminCard, borderWidth: 1, borderColor: colors.adminCardBorder, borderRadius: radius.md, padding: 14, marginBottom: 14 }}>
          <Text style={{ fontFamily: fonts.title, fontSize: 16, color: colors.adminText, marginBottom: 4 }}>New restaurant</Text>
          <Text style={label}>Restaurant name</Text>
          <Field value={name} onChangeText={setName} placeholder="e.g. Mama Choice" />
          <Text style={label}>Contact person</Text>
          <Field value={contact} onChangeText={setContact} placeholder="Name of the owner or cook" />
          <Text style={label}>WhatsApp number (orders are sent here)</Text>
          <Field value={whatsapp} onChangeText={setWhatsapp} placeholder="2609..." keyboardType="phone-pad" />
          <Text style={label}>Mobile money number for payments (optional)</Text>
          <Field value={payout} onChangeText={setPayout} placeholder="2609..." keyboardType="phone-pad" />
          <Text style={label}>Market</Text>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
            {markets.map((m) => {
              const on = marketId === m.id;
              return (
                <Pressable key={m.id} onPress={() => setMarketId(m.id)} style={{ paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, borderWidth: 1.5, borderColor: on ? "#D6263A" : colors.adminCardBorder, backgroundColor: on ? "#FDECEE" : "#fff" }}>
                  <Text style={{ fontFamily: on ? fonts.title : fonts.body, color: on ? "#D6263A" : colors.adminText }}>{m.name}</Text>
                </Pressable>
              );
            })}
          </View>
          <View style={{ height: 14 }} />
          <PrimaryButton label="Save restaurant" onPress={add} />
          <Text style={{ fontFamily: fonts.body, fontSize: 12, color: colors.adminMuted, marginTop: 8 }}>
            After saving, open it to add the photo, stand, rating and its menu.
          </Text>
        </View>
      ) : null}

      {rows.length === 0 && <Text style={{ color: colors.adminMuted, fontFamily: fonts.body }}>No restaurants yet.</Text>}

      {rows.map((v) => {
        const open = openId === v.id;
        return (
          <View key={v.id} style={{ backgroundColor: colors.adminCard, borderWidth: 1, borderColor: colors.adminCardBorder, borderRadius: radius.md, marginBottom: 12, paddingHorizontal: 14 }}>
            <Pressable onPress={() => setOpenId(open ? null : v.id)} style={{ flexDirection: "row", alignItems: "center", paddingVertical: 14 }}>
              <View style={{ width: 56, height: 56, borderRadius: 14, overflow: "hidden", marginRight: 12 }}>
                <Photo uri={v.image_url} name={v.name} width={56} height={56} hideLabel />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontFamily: fonts.title, fontSize: 16, color: colors.adminText }} numberOfLines={1}>{v.name}</Text>
                <Text style={{ fontFamily: fonts.body, fontSize: 12.5, color: colors.adminMuted, marginTop: 2 }} numberOfLines={1}>
                  {[v.markets?.name, v.stand_number ? `Stand ${String(v.stand_number).replace(/^stand\s*/i, "")}` : ""].filter(Boolean).join(" · ")}
                </Text>
                <View style={{ flexDirection: "row", alignItems: "center", marginTop: 4, gap: 6 }}>
                  <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: v.is_available ? "#1F9D55" : "#9A9AA6" }} />
                  <Text style={{ fontFamily: fonts.bodySemi, fontSize: 12, color: v.is_available ? "#1F9D55" : colors.adminMuted }}>
                    {v.is_available ? "Open for orders" : "Closed"} · {mealCount(v)} meals
                  </Text>
                </View>
              </View>
              <Ionicons name={open ? "chevron-up" : "chevron-down"} size={20} color={colors.adminMuted} />
            </Pressable>

            {open ? (
              <View>
                <Row v={v} name="page" icon="storefront-outline" title="Restaurant page" hint="Photo, stand, cuisine, rating" />
                {sec(v) === "page" ? (
                  <View style={{ paddingBottom: 14 }}>
                    <Text style={label}>Photo customers see</Text>
                    <PhotoPicker folder={`restaurants/${v.id}`} uri={v.image_url} name={v.name} onChange={(url) => saveVendorPhoto(v, url)} height={120} />
                    <Text style={label}>Stand number</Text>
                    <Field value={infoVal(v, "stand_number")} onChangeText={(t) => setInfoVal(v, "stand_number", t)} placeholder="e.g. 12" />
                    <Text style={label}>Cuisine</Text>
                    <Field value={infoVal(v, "cuisine")} onChangeText={(t) => setInfoVal(v, "cuisine", t)} placeholder="e.g. Traditional · Local Dishes" />
                    <Text style={label}>Rating (0 to 5, empty hides it)</Text>
                    <Field value={infoVal(v, "rating")} onChangeText={(t) => setInfoVal(v, "rating", t)} placeholder="e.g. 4.6" keyboardType="decimal-pad" />
                    <Text style={label}>Number of ratings</Text>
                    <Field value={infoVal(v, "rating_count")} onChangeText={(t) => setInfoVal(v, "rating_count", t)} placeholder="e.g. 120" keyboardType="number-pad" />
                    <Text style={label}>Short description</Text>
                    <Field value={infoVal(v, "description")} onChangeText={(t) => setInfoVal(v, "description", t)} placeholder="One or two lines" />
                    <View style={{ height: 12 }} />
                    <PrimaryButton label="Save restaurant details" onPress={() => saveInfo(v)} />
                  </View>
                ) : null}

                <Row v={v} name="contact" icon="logo-whatsapp" title="Orders and payments" hint={v.whatsapp || "WhatsApp and payout number"} />
                {sec(v) === "contact" ? (
                  <View style={{ paddingBottom: 14 }}>
                    <Text style={label}>Orders go to this WhatsApp: {v.whatsapp}</Text>
                    <Text style={label}>Mobile money number for payouts</Text>
                    <Field
                      value={payoutEdit[v.id] ?? v.payout_number ?? ""}
                      onChangeText={(t) => setPayoutEdit((m) => ({ ...m, [v.id]: t }))}
                      placeholder={v.phone || v.whatsapp || "2609..."}
                      keyboardType="phone-pad"
                    />
                    <View style={{ height: 10 }} />
                    <PrimaryButton label="Save number" onPress={() => savePayout(v)} />
                    <Pressable onPress={() => toggle(v, "is_available")} style={{ marginTop: 14, flexDirection: "row", alignItems: "center", gap: 8 }}>
                      <Ionicons name={v.is_available ? "toggle" : "toggle-outline"} size={30} color={v.is_available ? "#1F9D55" : "#9A9AA6"} />
                      <Text style={{ fontFamily: fonts.bodySemi, color: colors.adminText }}>{v.is_available ? "Open for orders" : "Closed (no orders)"}</Text>
                    </Pressable>
                  </View>
                ) : null}

                <Row v={v} name="menu" icon="restaurant-outline" title="Menu and prices" hint={`${mealCount(v)} meals · own prices and photos`} />
                {sec(v) === "menu" ? (
                  <View style={{ paddingBottom: 14 }}>
                    {meals.length === 0 && <Text style={{ color: colors.adminMuted, fontFamily: fonts.body }}>Add meals in Menu first.</Text>}
                    <Text style={{ color: colors.adminMuted, fontFamily: fonts.body, fontSize: 12, marginBottom: 6 }}>
                      Tick a meal to put it on this restaurant's menu, then set its own price and food photo.
                    </Text>
                    {meals.map((meal) => {
                      const link = links.find((l) => l.vendor_id === v.id && l.meal_id === meal.id);
                      const on = !!link;
                      const key = `${v.id}:${meal.id}`;
                      return (
                        <View key={meal.id} style={{ borderWidth: 1, borderColor: colors.adminCardBorder, borderRadius: radius.md, padding: 12, marginTop: 8 }}>
                          <Pressable onPress={() => toggleMeal(v.id, meal.id, on)} style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
                            <Ionicons name={on ? "checkbox" : "square-outline"} size={22} color={on ? "#D6263A" : colors.adminMuted} />
                            <Text style={{ fontFamily: fonts.title, fontSize: 14.5, color: colors.adminText }}>{meal.name}</Text>
                          </Pressable>
                          {on ? (
                            <View style={{ marginTop: 8 }}>
                              <Text style={label}>This restaurant's price in K (empty = {Number(meal.price)})</Text>
                              <Field
                                value={priceEdit[key] ?? (link.price == null ? "" : String(link.price))}
                                onChangeText={(t) => setPriceEdit((m) => ({ ...m, [key]: t }))}
                                placeholder={String(Number(meal.price))}
                                keyboardType="decimal-pad"
                              />
                              <View style={{ height: 8 }} />
                              <PrimaryButton label="Save price" onPress={() => saveMealPrice(v, meal.id, Number(meal.price))} />
                              <Text style={label}>Food photo</Text>
                              <PhotoPicker folder={`restaurants/${v.id}/meals`} uri={link.image_url} name={meal.name} onChange={(url) => saveMealPhoto(v, meal.id, url)} height={90} />
                            </View>
                          ) : null}
                        </View>
                      );
                    })}
                  </View>
                ) : null}
              </View>
            ) : null}
          </View>
        );
      })}
    </ScrollView>
  );
}
