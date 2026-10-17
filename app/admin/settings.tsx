import { useEffect, useState } from "react";
import { FormSkeleton } from "@/components/skeleton";
import { Alert, Switch, Text, TextInput, View, ScrollView, Pressable } from "react-native";
import { supabase } from "@/lib/supabase";
import { Field } from "@/components/ui";
import { AdminButton as PrimaryButton } from "@/components/admin-ui";
import { PhotoPicker } from "@/components/photo-picker";
import { confirmDialog } from "@/components/confirm";
import { colors, fonts, radius, ui } from "@/lib/theme";

const DEFAULTS = {
  tagline: "Good Food. Closer to You.",
  city: "Lusaka",
  marketsTitle: "Food Markets Near You",
  promoTitle: "Great food. Great places.",
};

const label = { fontFamily: fonts.bodySemi, color: colors.adminMuted, fontSize: 12, marginBottom: 6, marginTop: 4 } as const;
const heading = { fontFamily: fonts.title, fontSize: 18, color: colors.adminText, marginTop: 24, marginBottom: 6 } as const;

export default function HomeAdmin() {
  // Home screen text
  const [tagline, setTagline] = useState("");
  const [loading, setLoading] = useState(true);
  const [city, setCity] = useState("");
  const [marketsTitle, setMarketsTitle] = useState("");
  const [promoOn, setPromoOn] = useState(true);
  const [promoTitle, setPromoTitle] = useState("");
  const [promoSub, setPromoSub] = useState("");
  // Fees
  const [platform, setPlatform] = useState("");
  const [bike, setBike] = useState("");
  const [moto, setMoto] = useState("");
  // Banners
  const [banners, setBanners] = useState<any[]>([]);

  async function load() {
    const { data } = await supabase.from("settings").select("*").eq("id", 1).single();
    if (data) {
      setPlatform(String(data.platform_fee));
      setBike(String(data.bicycle_delivery_fee));
      setMoto(String(data.motorbike_delivery_fee));
      setTagline(data.home_tagline || "");
      setCity(data.home_city || "");
      setMarketsTitle(data.home_markets_title || "");
      setPromoOn(data.promo_enabled !== false);
      setPromoTitle(data.promo_title || "");
      setPromoSub(data.promo_subtitle || "");
    }
    const { data: b } = await supabase.from("banners").select("*").order("sort_order");
    setBanners(b || []);
  }

  useEffect(() => {
    load().finally(() => setLoading(false));
  }, []);

  async function saveHomeText() {
    const { error } = await supabase
      .from("settings")
      .update({
        home_tagline: tagline.trim() || null,
        home_city: city.trim() || null,
        home_markets_title: marketsTitle.trim() || null,
        promo_enabled: promoOn,
        promo_title: promoTitle.trim() || null,
        promo_subtitle: promoSub.trim() || null,
      })
      .eq("id", 1);
    if (error) Alert.alert("Home", error.message);
    else Alert.alert("Saved", "Customers see this next time Home opens.");
  }

  async function saveFees() {
    const { error } = await supabase
      .from("settings")
      .update({
        platform_fee: Number(platform),
        bicycle_delivery_fee: Number(bike),
        motorbike_delivery_fee: Number(moto),
      })
      .eq("id", 1);
    if (error) Alert.alert("Fees", error.message);
    else Alert.alert("Saved");
  }

  async function saveBanner(id: string | null, v: BannerValues) {
    if (!v.title.trim()) {
      Alert.alert("Banner", "Add the banner text.");
      return false;
    }
    const row = {
      title: v.title.trim(),
      subtitle: v.subtitle.trim() || null,
      amount: v.amount.trim() ? Number(v.amount) : null,
      image_url: v.image,
      is_active: v.active,
    };
    const { error } = id
      ? await supabase.from("banners").update(row).eq("id", id)
      : await supabase.from("banners").insert({ ...row, sort_order: banners.length + 1 });
    if (error) {
      Alert.alert("Banner", error.message);
      return false;
    }
    await load();
    return true;
  }

  async function deleteBanner(id: string) {
    const ok = await confirmDialog({
      title: "Delete banner?",
      message: "Are you sure you want to delete this banner?",
      confirmLabel: "Delete",
      destructive: true,
    });
    if (!ok) return;
    const { error } = await supabase.from("banners").delete().eq("id", id);
    if (error) Alert.alert("Banner", error.message);
    load();
  }

  async function move(idx: number, dir: -1 | 1) {
    const j = idx + dir;
    if (j < 0 || j >= banners.length) return;
    const next = [...banners];
    [next[idx], next[j]] = [next[j], next[idx]];
    await Promise.all(next.map((b, i) => supabase.from("banners").update({ sort_order: i + 1 }).eq("id", b.id)));
    load();
  }

  if (loading) return <View style={{ flex: 1, backgroundColor: colors.adminBg, padding: 16 }}><FormSkeleton /></View>;

  return (
    <ScrollView style={{ flex: 1, backgroundColor: colors.adminBg }} contentContainerStyle={{ padding: 20, paddingBottom: 48 }}>
      <Text style={{ fontFamily: fonts.display, fontSize: 28, color: colors.adminText }}>Home</Text>

      <Text style={heading}>Banners</Text>
      {banners.map((b, i) => (
        <BannerForm
          key={b.id + String(b.sort_order)}
          initial={b}
          onSave={(v) => saveBanner(b.id, v)}
          onDelete={() => deleteBanner(b.id)}
          onUp={i > 0 ? () => move(i, -1) : undefined}
          onDown={i < banners.length - 1 ? () => move(i, 1) : undefined}
        />
      ))}
      <Text style={label}>New banner</Text>
      <BannerForm key={"new" + banners.length} onSave={(v) => saveBanner(null, v)} />

      <Text style={heading}>Home text</Text>
      <Text style={label}>Line under the logo</Text>
      <Field value={tagline} onChangeText={setTagline} placeholder={DEFAULTS.tagline} />
      <Text style={label}>City shown under the markets heading</Text>
      <Field value={city} onChangeText={setCity} placeholder={DEFAULTS.city} />
      <Text style={label}>Markets heading</Text>
      <Field value={marketsTitle} onChangeText={setMarketsTitle} placeholder={DEFAULTS.marketsTitle} />

      <Text style={heading}>Bottom strip</Text>
      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
        <Text style={{ fontFamily: fonts.bodySemi, color: colors.adminText }}>Show the strip on Home</Text>
        <Switch value={promoOn} onValueChange={setPromoOn} trackColor={{ true: ui.red }} />
      </View>
      <Text style={label}>Title</Text>
      <Field value={promoTitle} onChangeText={setPromoTitle} placeholder={DEFAULTS.promoTitle} />
      <Text style={label}>Second line</Text>
      <Field value={promoSub} onChangeText={setPromoSub} placeholder={`Your favourite food markets in ${city.trim() || DEFAULTS.city}.`} />
      <View style={{ height: 6 }} />
      <PrimaryButton label="Save home text" onPress={saveHomeText} />

      <Text style={heading}>Fees</Text>
      <Field value={platform} onChangeText={setPlatform} placeholder="Platform fee" keyboardType="decimal-pad" />
      <View style={{ height: 10 }} />
      <Field value={bike} onChangeText={setBike} placeholder="Bicycle delivery fee" keyboardType="decimal-pad" />
      <View style={{ height: 10 }} />
      <Field value={moto} onChangeText={setMoto} placeholder="Motorbike delivery fee" keyboardType="decimal-pad" />
      <View style={{ height: 12 }} />
      <PrimaryButton label="Save fees" onPress={saveFees} />

    </ScrollView>
  );
}

type BannerValues = { title: string; subtitle: string; amount: string; image: string | null; active: boolean };

function BannerForm({
  initial,
  onSave,
  onDelete,
  onUp,
  onDown,
}: {
  initial?: any;
  onSave: (v: BannerValues) => Promise<boolean>;
  onDelete?: () => void;
  onUp?: () => void;
  onDown?: () => void;
}) {
  const [title, setTitle] = useState(initial?.title || "");
  const [subtitle, setSubtitle] = useState(initial?.subtitle || "");
  const [amount, setAmount] = useState(initial?.amount != null ? String(initial.amount) : "");
  const [image, setImage] = useState<string | null>(initial?.image_url || null);
  const [active, setActive] = useState(initial ? initial.is_active !== false : true);
  const isNew = !initial;

  return (
    <View
      style={{
        backgroundColor: colors.adminCard,
        borderWidth: 1,
        borderColor: colors.adminCardBorder,
        borderRadius: radius.md,
        padding: 12,
        marginBottom: 12,
      }}
    >
      <Text style={label}>Text (press Enter for a new line)</Text>
      <TextInput
        value={title}
        onChangeText={setTitle}
        multiline
        placeholder={"Delicious\nMeals from\nYour Favourite\nFood Markets"}
        placeholderTextColor={colors.muted}
        style={{
          minHeight: 92,
          textAlignVertical: "top",
          borderRadius: radius.md,
          backgroundColor: "#fff",
          paddingHorizontal: 14,
          paddingVertical: 12,
          fontFamily: fonts.body,
          fontSize: 16,
          color: colors.ink,
          marginBottom: 10,
        }}
      />
      <Text style={label}>Small line under it (optional)</Text>
      <Field value={subtitle} onChangeText={setSubtitle} placeholder="Fresh. Tasty. Local." />
      <Text style={label}>Amount (optional)</Text>
      <Field value={amount} onChangeText={setAmount} placeholder="e.g. 85" keyboardType="decimal-pad" />
      <Text style={label}>Food photo (shown on the right)</Text>
      <PhotoPicker folder="banner" uri={image} name="Banner photo" onChange={setImage} height={110} />
      {!isNew ? (
        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
          <Text style={{ fontFamily: fonts.bodySemi, color: colors.adminText }}>Show on Home</Text>
          <Switch value={active} onValueChange={setActive} trackColor={{ true: ui.red }} />
        </View>
      ) : null}
      <PrimaryButton
        label={isNew ? "Add banner" : "Save banner"}
        onPress={async () => {
          const ok = await onSave({ title, subtitle, amount, image, active });
          if (ok && isNew) {
            setTitle("");
            setSubtitle("");
            setAmount("");
            setImage(null);
          }
        }}
      />
      {!isNew ? (
        <View style={{ flexDirection: "row", gap: 18, marginTop: 12 }}>
          {onUp ? <Link text="Move up" onPress={onUp} /> : null}
          {onDown ? <Link text="Move down" onPress={onDown} /> : null}
          <View style={{ flex: 1 }} />
          {onDelete ? <Link text="Delete" danger onPress={onDelete} /> : null}
        </View>
      ) : null}
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
