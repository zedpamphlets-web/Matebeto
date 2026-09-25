import { useEffect, useState } from "react";
import { Alert, Pressable, ScrollView, Text, View } from "react-native";
import { supabase } from "@/lib/supabase";
import { colors, fonts, radius } from "@/lib/theme";
import { Field, PrimaryButton } from "@/components/ui";
import { formatKw } from "@/lib/lipila";

export default function Catalog() {
  const [meals, setMeals] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [sides, setSides] = useState<any[]>([]);
  const [name, setName] = useState("");
  const [price, setPrice] = useState("");
  const [desc, setDesc] = useState("");
  const [image, setImage] = useState("");
  const [sideList, setSideList] = useState("");
  const [categoryId, setCategoryId] = useState("");

  async function load() {
    const [{ data: m }, { data: c }, { data: s }] = await Promise.all([
      supabase.from("meals").select("*").order("name"),
      supabase.from("categories").select("*").order("sort_order"),
      supabase.from("meal_sides").select("*"),
    ]);
    setMeals(m || []);
    setCategories(c || []);
    setSides(s || []);
    if (!categoryId && c?.[0]) setCategoryId(c[0].id);
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
        image_url: image.trim() || null,
        category_id: categoryId || null,
        is_available: true,
        is_featured: false,
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
    setImage("");
    load();
  }

  async function toggle(m: any, field: "is_featured" | "is_available") {
    const { error } = await supabase.from("meals").update({ [field]: !m[field] }).eq("id", m.id);
    if (error) Alert.alert("Meal", error.message);
    load();
  }

  return (
    <ScrollView style={{ flex: 1, backgroundColor: colors.cream }} contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>
      <Text style={{ fontFamily: fonts.title, fontSize: 18 }}>Add meal</Text>
      <Text style={{ color: colors.muted, fontFamily: fonts.body, marginBottom: 10 }}>
        Use a real meal name, Kwacha price, and a photo URL you own. Sides are included in the price.
      </Text>
      <Text style={{ fontFamily: fonts.bodySemi, marginBottom: 6 }}>Category</Text>
      {categories.map((c) => (
        <Pressable key={c.id} onPress={() => setCategoryId(c.id)}>
          <Text style={{ fontFamily: categoryId === c.id ? fonts.title : fonts.body, marginBottom: 4, color: categoryId === c.id ? colors.customerDeep : colors.ink }}>
            {c.name}
          </Text>
        </Pressable>
      ))}
      <View style={{ height: 8 }} />
      <Field value={name} onChangeText={setName} placeholder="Meal name" />
      <View style={{ height: 8 }} />
      <Field value={price} onChangeText={setPrice} placeholder="Price K" keyboardType="decimal-pad" />
      <View style={{ height: 8 }} />
      <Field value={desc} onChangeText={setDesc} placeholder="Description" />
      <View style={{ height: 8 }} />
      <Field value={image} onChangeText={setImage} placeholder="Photo URL (optional)" />
      <View style={{ height: 8 }} />
      <Field value={sideList} onChangeText={setSideList} placeholder="Included sides, comma separated" />
      <View style={{ height: 10 }} />
      <PrimaryButton label="Save meal" onPress={add} />
      <View style={{ height: 16 }} />
      {meals.length === 0 && <Text style={{ color: colors.muted, fontFamily: fonts.body }}>No meals yet.</Text>}
      {meals.map((m) => (
        <View key={m.id} style={{ backgroundColor: "#fff", borderRadius: radius.md, padding: 12, marginBottom: 8 }}>
          <Text style={{ fontFamily: fonts.title }}>
            {m.name} · {formatKw(m.price)}
          </Text>
          <Text style={{ color: colors.muted, fontFamily: fonts.body }}>
            {(sides.filter((s) => s.meal_id === m.id).map((s) => s.name).join(", ") || "No sides")}
          </Text>
          <Pressable onPress={() => toggle(m, "is_featured")} style={{ marginTop: 8 }}>
            <Text style={{ fontFamily: fonts.bodySemi, color: colors.goldDeep }}>
              {m.is_featured ? "Featured on home" : "Not featured"}
            </Text>
          </Pressable>
          <Pressable onPress={() => toggle(m, "is_available")}>
            <Text style={{ fontFamily: fonts.bodySemi, color: colors.customerDeep }}>
              {m.is_available ? "Available" : "Hidden"}
            </Text>
          </Pressable>
        </View>
      ))}
    </ScrollView>
  );
}
