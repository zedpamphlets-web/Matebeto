import { useEffect, useState } from "react";
import { ListSkeleton } from "@/components/skeleton";
import { Alert, Pressable, ScrollView, Text, View } from "react-native";
import { supabase } from "@/lib/supabase";
import { colors, fonts, radius, ui } from "@/lib/theme";
import { Field } from "@/components/ui";
import { AdminButton as PrimaryButton } from "@/components/admin-ui";
import { PhotoPicker } from "@/components/photo-picker";

const label = { fontFamily: fonts.bodySemi, color: colors.adminMuted, fontSize: 12, marginBottom: 6, marginTop: 4 } as const;

export default function AdminMarkets() {
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState("");
  const [distance, setDistance] = useState("");
  const [image, setImage] = useState<string | null>(null);

  async function load() {
    const { data } = await supabase.from("markets").select("*").order("sort_order");
    setRows(data || []);
    setLoading(false);
  }
  useEffect(() => {
    load();
  }, []);

  const km = (v: string) => (v.trim() ? Number(v) : null);

  async function add() {
    if (!name.trim()) return Alert.alert("Market", "Name is required.");
    if (distance.trim() && Number.isNaN(Number(distance))) return Alert.alert("Market", "Distance must be a number.");
    const slug = name.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-");
    const { error } = await supabase.from("markets").insert({
      name: name.trim(),
      slug,
      image_url: image,
      distance_km: km(distance),
      is_active: true,
      sort_order: rows.length + 1,
    });
    if (error) return Alert.alert("Market", error.message);
    setName("");
    setDistance("");
    setImage(null);
    load();
  }

  async function saveDetails(m: any, newName: string, newDistance: string) {
    if (!newName.trim()) return Alert.alert("Market", "Name is required.");
    if (newDistance.trim() && Number.isNaN(Number(newDistance))) return Alert.alert("Market", "Distance must be a number.");
    const { error } = await supabase
      .from("markets")
      .update({ name: newName.trim(), distance_km: km(newDistance) })
      .eq("id", m.id);
    if (error) Alert.alert("Market", error.message);
    else Alert.alert("Saved");
    load();
  }

  async function toggle(m: any) {
    const { error } = await supabase.from("markets").update({ is_active: !m.is_active }).eq("id", m.id);
    if (error) Alert.alert("Market", error.message);
    load();
  }

  async function saveImage(m: any, url: string | null) {
    const { error } = await supabase.from("markets").update({ image_url: url }).eq("id", m.id);
    if (error) Alert.alert("Market", error.message);
    load();
  }

  async function move(idx: number, dir: -1 | 1) {
    const j = idx + dir;
    if (j < 0 || j >= rows.length) return;
    const next = [...rows];
    [next[idx], next[j]] = [next[j], next[idx]];
    await Promise.all(next.map((m, i) => supabase.from("markets").update({ sort_order: i + 1 }).eq("id", m.id)));
    load();
  }

  function deleteMarket(id: string) {
    Alert.alert("Delete market", "Remove this market from the app?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          const { error } = await supabase.from("markets").delete().eq("id", id);
          if (error) Alert.alert("Market", error.message);
          load();
        },
      },
    ]);
  }

  if (loading && rows.length === 0) return <View style={{ flex: 1, backgroundColor: colors.adminBg, padding: 16 }}><ListSkeleton /></View>;

  return (
    <ScrollView style={{ flex: 1, backgroundColor: colors.adminBg }} contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>
      <Text style={{ fontFamily: fonts.title, fontSize: 18, marginBottom: 4, color: colors.adminText }}>Add market</Text>
      <Text style={{ color: colors.adminMuted, fontFamily: fonts.body, marginBottom: 10 }}>
        Shows as a card on Home, in this order.
      </Text>
      <Field value={name} onChangeText={setName} placeholder="Market name (e.g. Longacres)" />
      <Field value={distance} onChangeText={setDistance} placeholder="Distance in km (optional, e.g. 2.1)" keyboardType="decimal-pad" />
      <PhotoPicker folder="markets" uri={image} name={name || "Market"} onChange={setImage} />
      <PrimaryButton label="Save market" onPress={add} />
      <View style={{ height: 18 }} />
      {rows.map((m, i) => (
        <MarketCard
          key={m.id + String(m.sort_order)}
          m={m}
          onSave={(n, d) => saveDetails(m, n, d)}
          onImage={(u) => saveImage(m, u)}
          onToggle={() => toggle(m)}
          onDelete={() => deleteMarket(m.id)}
          onUp={i > 0 ? () => move(i, -1) : undefined}
          onDown={i < rows.length - 1 ? () => move(i, 1) : undefined}
        />
      ))}
    </ScrollView>
  );
}

function MarketCard({
  m,
  onSave,
  onImage,
  onToggle,
  onDelete,
  onUp,
  onDown,
}: {
  m: any;
  onSave: (name: string, distance: string) => void;
  onImage: (url: string | null) => void;
  onToggle: () => void;
  onDelete: () => void;
  onUp?: () => void;
  onDown?: () => void;
}) {
  const [name, setName] = useState(m.name || "");
  const [distance, setDistance] = useState(m.distance_km != null ? String(m.distance_km) : "");
  return (
    <View
      style={{
        backgroundColor: colors.adminCard,
        borderWidth: 1,
        borderColor: colors.adminCardBorder,
        borderRadius: radius.md,
        padding: 12,
        marginBottom: 10,
      }}
    >
      <Text style={{ color: m.is_active ? ui.red : colors.adminMuted, fontFamily: fonts.bodySemi, marginBottom: 8 }}>
        {m.is_active ? "Showing on Home" : "Hidden"}
      </Text>
      <Text style={label}>Name</Text>
      <Field value={name} onChangeText={setName} placeholder="Market name" />
      <Text style={label}>Distance in km</Text>
      <Field value={distance} onChangeText={setDistance} placeholder="e.g. 2.1" keyboardType="decimal-pad" />
      <PhotoPicker folder={`markets/${m.id}`} uri={m.image_url} name={m.name} onChange={onImage} />
      <PrimaryButton label="Save details" onPress={() => onSave(name, distance)} />
      <View style={{ flexDirection: "row", gap: 18, marginTop: 12 }}>
        {onUp ? <Link text="Move up" onPress={onUp} /> : null}
        {onDown ? <Link text="Move down" onPress={onDown} /> : null}
        <Link text={m.is_active ? "Hide" : "Show"} onPress={onToggle} />
        <View style={{ flex: 1 }} />
        <Link text="Delete" danger onPress={onDelete} />
      </View>
    </View>
  );
}

function Link({ text, onPress, danger }: { text: string; onPress: () => void; danger?: boolean }) {
  return (
    <Pressable onPress={onPress} hitSlop={8}>
      <Text style={{ fontFamily: fonts.bodySemi, color: danger ? "#FF6B6B" : ui.red }}>{text}</Text>
    </Pressable>
  );
}
