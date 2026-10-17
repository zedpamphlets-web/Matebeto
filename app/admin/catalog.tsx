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
  const [categories, setCategories] = useState<any[]>([]);
  const [sides, setSides] = useState<any[]>([]);
  const [name, setName] = useState("");
  const [price, setPrice] = useState("");
  const [desc, setDesc] = useState("");
  const [image, setImage] = useState<string | null>(null);
  const [sideList, setSideList] = useState("");
  const [prep, setPrep] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [catName, setCatName] = useState("");
  const [catImage, setCatImage] = useState<string | null>(null);

  async function load() {
    const [{ data: m }, { data: c }, { data: s }] = await Promise.all([
      supabase.from("meals").select("*").order("name"),
      supabase.from("categories").select("*").order("sort_order"),
      supabase.from("meal_sides").select("*"),
    ]);
    setMeals(m || []);
    setLoading(false);
    setCategories(c || []);
    setSides(s || []);
    if (!categoryId && c?.[0]) setCategoryId(c[0].id);
  }
  useEffect(() => {
    load();
  }, []);

  async function addCategory() {
    if (!catName.trim()) return Alert.alert("Category", "Name is required.");
    const { error } = await supabase.from("categories").insert({
      name: catName.trim(),
      image_url: catImage,
      sort_order: categories.length + 1,
    });
    if (error) return Alert.alert("Category", error.message);
    setCatName("");
    setCatImage(null);
    load();
  }

  async function saveCategoryPhoto(c: any, url: string | null) {
    const { error } = await supabase.from("categories").update({ image_url: url }).eq("id", c.id);
    if (error) Alert.alert("Category", error.message);
    load();
  }

  async function moveCategory(idx: number, dir: -1 | 1) {
    const j = idx + dir;
    if (j < 0 || j >= categories.length) return;
    const next = [...categories];
    [next[idx], next[j]] = [next[j], next[idx]];
    await Promise.all(next.map((c, i) => supabase.from("categories").update({ sort_order: i + 1 }).eq("id", c.id)));
    load();
  }

  async function deleteCategory(c: any) {
    const ok = await confirmDialog({
      title: "Delete category?",
      message: `Are you sure you want to delete ${c.name}? Its meals stay but lose their category.`,
      confirmLabel: "Delete",
      destructive: true,
    });
    if (!ok) return;
    const { error } = await supabase.from("categories").delete().eq("id", c.id);
    if (error) Alert.alert("Category", error.message);
    load();
  }

  async function add() {
    if (!name.trim() || !price) return Alert.alert("Meal", "Name and price are required.");
    const { data, error } = await supabase
      .from("meals")
      .insert({
        name: name.trim(),
        description: desc.trim() || null,
        price: Number(price),
        image_url: image,
        category_id: categoryId || null,
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

  async function deleteMeal(id: string) {
    const ok = await confirmDialog({
      title: "Delete meal?",
      message: "Are you sure you want to delete this meal?",
      confirmLabel: "Delete",
      destructive: true,
    });
    if (!ok) return;
    const { error } = await supabase.from("meals").delete().eq("id", id);
    if (error) Alert.alert("Meal", error.message);
    load();
  }

  if (loading) return <View style={{ flex: 1, backgroundColor: colors.adminBg, padding: 16 }}><ListSkeleton /></View>;

  return (
    <ScrollView style={{ flex: 1, backgroundColor: colors.adminBg }} contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>
      <Text style={{ fontFamily: fonts.title, fontSize: 18, color: colors.adminText }}>Categories</Text>
      <Field value={catName} onChangeText={setCatName} placeholder="Category name" />
      <View style={{ height: 8 }} />
      <PhotoPicker folder="categories" uri={catImage} name={catName || "Category"} onChange={setCatImage} height={110} />
      <PrimaryButton label="Save category" onPress={addCategory} />
      <View style={{ height: 12 }} />
      {categories.map((c, i) => (
        <View key={c.id} style={{ backgroundColor: colors.adminCard, borderWidth: 1, borderColor: colors.adminCardBorder, borderRadius: radius.md, padding: 12, marginBottom: 8 }}>
          <Text style={{ fontFamily: fonts.title, marginBottom: 8, color: colors.adminText }}>{c.name}</Text>
          <PhotoPicker folder={`categories/${c.id}`} uri={c.image_url} name={c.name} onChange={(url) => saveCategoryPhoto(c, url)} height={110} />
          <View style={{ flexDirection: "row", gap: 18 }}>
            {i > 0 ? <Pressable onPress={() => moveCategory(i, -1)}><Text style={{ fontFamily: fonts.bodySemi, color: ui.red }}>Move up</Text></Pressable> : null}
            {i < categories.length - 1 ? <Pressable onPress={() => moveCategory(i, 1)}><Text style={{ fontFamily: fonts.bodySemi, color: ui.red }}>Move down</Text></Pressable> : null}
            <View style={{ flex: 1 }} />
            <Pressable onPress={() => deleteCategory(c)}><Text style={{ fontFamily: fonts.bodySemi, color: "#D32F2F" }}>Delete</Text></Pressable>
          </View>
        </View>
      ))}

      <Text style={{ fontFamily: fonts.title, fontSize: 18, marginTop: 10, color: colors.adminText }}>Add meal</Text>
      <Text style={{ fontFamily: fonts.bodySemi, marginBottom: 8, color: colors.adminText }}>Choose category</Text>
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 12 }}>
        {categories.map((c) => {
          const on = categoryId === c.id;
          return (
            <Pressable key={c.id} onPress={() => setCategoryId(c.id)} style={{ paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, backgroundColor: on ? "#FFF8E1" : "#fff", borderWidth: 2, borderColor: on ? "#F4B400" : "#EBEBEF" }}>
              <Text style={{ fontFamily: on ? fonts.title : fonts.body, color: "#1C1B26" }}>{c.name}</Text>
            </Pressable>
          );
        })}
      </View>
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
