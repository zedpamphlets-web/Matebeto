import { useEffect, useState } from "react";
import { ListSkeleton } from "@/components/skeleton";
import { Alert, Pressable, ScrollView, Text, View } from "react-native";
import { supabase } from "@/lib/supabase";
import { colors, fonts, radius, ui } from "@/lib/theme";
import { Field } from "@/components/ui";
import { AdminButton as PrimaryButton } from "@/components/admin-ui";
import { PhotoPicker } from "@/components/photo-picker";
import { formatKw } from "@/lib/lipila";
import { confirmDialog } from "@/components/confirm";

export default function Catalog() {
  const [meals, setMeals] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [sides, setSides] = useState<any[]>([]);
  const [name, setName] = useState("");
  const [price, setPrice] = useState("");
  const [desc, setDesc] = useState("");
  const [image, setImage] = useState<string | null>(null);
  const [sideList, setSideList] = useState("");
  const [prep, setPrep] = useState("");
  // editing an existing meal
  const [editingId, setEditingId] = useState<string | null>(null);
  const [eName, setEName] = useState("");
  const [ePrice, setEPrice] = useState("");
  const [eDesc, setEDesc] = useState("");
  const [eSides, setESides] = useState("");
  const [ePrep, setEPrep] = useState("");

  async function load() {
    const [{ data: m }, { data: s }] = await Promise.all([
      supabase.from("meals").select("*").order("name"),
      supabase.from("meal_sides").select("*"),
    ]);
    setMeals(m || []);
    setLoading(false);
    setSides(s || []);
  }
  useEffect(() => {
    load();
  }, []);

  async function add() {
    if (!name.trim() || !price) return Alert.alert("Meal", "Name and price are required.");
    const { data, error } = await supabase
      .from("meals")
      .insert({
        name: name.trim(),
        description: desc.trim() || null,
        price: Number(price),
        image_url: image,
        is_available: true,
        is_featured: false,
        ...(prep.trim() ? { prep_time: prep.trim() } : {}),
      })
      .select("*")
      .single();
    if (error) return Alert.alert("Meal", error.message);
    const names = sideList
      .split(",")
      .map((x) => x.trim())
      .filter(Boolean);
    if (data && names.length) {
      await supabase.from("meal_sides").insert(names.map((n) => ({ meal_id: data.id, name: n })));
    }
    setName("");
    setPrice("");
    setDesc("");
    setImage(null);
    setSideList("");
    setPrep("");
    load();
  }

  async function saveMealPhoto(m: any, url: string | null) {
    const { error } = await supabase.from("meals").update({ image_url: url }).eq("id", m.id);
    if (error) Alert.alert("Meal", error.message);
    load();
  }

  async function toggle(m: any, field: "is_featured" | "is_available") {
    const { error } = await supabase.from("meals").update({ [field]: !m[field] }).eq("id", m.id);
    if (error) Alert.alert("Meal", error.message);
    load();
  }

  function startEdit(m: any) {
    setEditingId(m.id);
    setEName(m.name || "");
    setEPrice(m.price != null ? String(m.price) : "");
    setEDesc(m.description || "");
    setEPrep(m.prep_time || "");
    setESides(
      sides
        .filter((x) => x.meal_id === m.id)
        .map((x) => x.name)
        .join(", ")
    );
  }

  async function saveEdit() {
    if (!editingId) return;
    if (!eName.trim() || !ePrice || Number.isNaN(Number(ePrice))) {
      return Alert.alert("Meal", "Name and a valid price are required.");
    }
    const { error } = await supabase
      .from("meals")
      .update({
        name: eName.trim(),
        price: Number(ePrice),
        description: eDesc.trim() || null,
        prep_time: ePrep.trim() || null,
      })
      .eq("id", editingId);
    if (error) return Alert.alert("Meal", error.message);

    const names = eSides
      .split(",")
      .map((x) => x.trim())
      .filter(Boolean);
    const { error: delError } = await supabase.from("meal_sides").delete().eq("meal_id", editingId);
    if (delError) return Alert.alert("Sides", delError.message);
    if (names.length) {
      const { error: insError } = await supabase.from("meal_sides").insert(names.map((n) => ({ meal_id: editingId, name: n })));
      if (insError) return Alert.alert("Sides", insError.message);
    }
    setEditingId(null);
    load();
  }

  async function deleteMeal(id: string) {
    const ok = await confirmDialog({
      title: "Delete meal?",
      message: "Are you sure you want to delete this meal?",
      confirmLabel: "Delete",
      destructive: true,
    });
    if (!ok) return;
    const { error } = await supabase.from("meals").delete().eq("id", id);
    if (error) Alert.alert("Could not delete", "This meal could not be deleted. Ask the developer to run the latest Supabase update, or hide the meal instead.\n\n" + error.message);
    else if (editingId === id) setEditingId(null);
    load();
  }

  if (loading) return <View style={{ flex: 1, backgroundColor: colors.adminBg, padding: 16 }}><ListSkeleton /></View>;

  return (
    <ScrollView style={{ flex: 1, backgroundColor: colors.adminBg }} contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>
      <Text style={{ fontFamily: fonts.title, fontSize: 18, marginTop: 10, color: colors.adminText }}>Add meal</Text>
      <View style={{ height: 8 }} />
      <Field value={name} onChangeText={setName} placeholder="Meal name" />
      <View style={{ height: 8 }} />
      <Field value={price} onChangeText={setPrice} placeholder="Price K" keyboardType="decimal-pad" />
      <View style={{ height: 8 }} />
      <Field value={desc} onChangeText={setDesc} placeholder="Description" />
      <View style={{ height: 8 }} />
      <PhotoPicker folder="meals" uri={image} name={name || "Meal"} onChange={setImage} />
      <Field value={sideList} onChangeText={setSideList} placeholder="Included sides, comma separated" />
      <View style={{ height: 8 }} />
      <Field value={prep} onChangeText={setPrep} placeholder="Preparation time (optional, e.g. 15 – 20 minutes)" />
      <View style={{ height: 10 }} />
      <PrimaryButton label="Save meal" onPress={add} />
      <View style={{ height: 16 }} />
      {meals.length === 0 && <Text style={{ color: colors.adminMuted, fontFamily: fonts.body }}>No meals yet.</Text>}
      {meals.map((m) => (
        <View key={m.id} style={{ backgroundColor: colors.adminCard, borderWidth: 1, borderColor: colors.adminCardBorder, borderRadius: radius.md, padding: 12, marginBottom: 8 }}>
          <Text style={{ fontFamily: fonts.title, color: colors.adminText }}>
            {m.name} · {formatKw(m.price)}
          </Text>
          <Text style={{ color: colors.adminMuted, fontFamily: fonts.body, marginBottom: 8 }}>
            {sides.filter((s) => s.meal_id === m.id).map((s) => s.name).join(", ") || "No sides"}
          </Text>
          {editingId === m.id ? (
            <View style={{ marginBottom: 10 }}>
              <Field value={eName} onChangeText={setEName} placeholder="Meal name" />
              <View style={{ height: 8 }} />
              <Field value={ePrice} onChangeText={setEPrice} placeholder="Price K" keyboardType="decimal-pad" />
              <View style={{ height: 8 }} />
              <Field value={eDesc} onChangeText={setEDesc} placeholder="Description" />
              <View style={{ height: 8 }} />
              <Field value={eSides} onChangeText={setESides} placeholder="Included sides, comma separated" />
              <View style={{ height: 8 }} />
              <Field value={ePrep} onChangeText={setEPrep} placeholder="Preparation time (optional)" />
              <View style={{ height: 10 }} />
              <PrimaryButton label="Save changes" onPress={saveEdit} />
              <Pressable onPress={() => setEditingId(null)} style={{ marginTop: 10, alignItems: "center" }}>
                <Text style={{ fontFamily: fonts.bodySemi, color: colors.adminMuted }}>Cancel</Text>
              </Pressable>
            </View>
          ) : (
            <Pressable onPress={() => startEdit(m)} style={{ marginBottom: 8 }}>
              <Text style={{ fontFamily: fonts.bodySemi, color: ui.red }}>Edit meal, price and sides</Text>
            </Pressable>
          )}
          <PhotoPicker folder={`meals/${m.id}`} uri={m.image_url} name={m.name} onChange={(url) => saveMealPhoto(m, url)} height={110} />
          <Pressable onPress={() => toggle(m, "is_featured")} style={{ marginTop: 4 }}>
            <Text style={{ fontFamily: fonts.bodySemi, color: ui.red }}>
              {m.is_featured ? "Featured on home" : "Not featured"}
            </Text>
          </Pressable>
          <Pressable onPress={() => toggle(m, "is_available")}>
            <Text style={{ fontFamily: fonts.bodySemi, color: colors.customerDeep }}>
              {m.is_available ? "Available" : "Hidden"}
            </Text>
          </Pressable>
          <Pressable onPress={() => deleteMeal(m.id)} style={{ marginTop: 6 }}>
            <Text style={{ fontFamily: fonts.bodySemi, color: "#c00" }}>Delete meal</Text>
          </Pressable>
        </View>
      ))}
    </ScrollView>
  );
}
