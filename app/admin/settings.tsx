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
  promoTitle: "More markets coming soon!",
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
  const [txnPct, setTxnPct] = useState("");
  const [restaurants, setRestaurants] = useState<any[]>([]);
  // Promotion (one static banner on Home)
  const [promotion, setPromotion] = useState<any>(null);
  // Legal links shown in the app under Profile > About
  const [termsUrl, setTermsUrl] = useState("");
  const [privacyUrl, setPrivacyUrl] = useState("");
  const [cookiesUrl, setCookiesUrl] = useState("");

  async function load() {
    const { data } = await supabase.from("settings").select("*").eq("id", 1).single();
    if (data) {
      setPlatform(String(data.platform_fee));
      setBike(String(data.bicycle_delivery_fee));
      setMoto(String(data.motorbike_delivery_fee));
      setTxnPct(data.transaction_fee_percent != null ? String(data.transaction_fee_percent) : "0");
      setTagline(data.home_tagline || "");
      setCity(data.home_city || "");
      setMarketsTitle(data.home_markets_title || "");
      setPromoOn(data.promo_enabled !== false);
      setPromoTitle(data.promo_title || "");
      setPromoSub(data.promo_subtitle || "");
      setTermsUrl(data.terms_url || "");
      setPrivacyUrl(data.privacy_url || "");
      setCookiesUrl(data.cookies_url || "");
    }
    const { data: p } = await supabase.from("promotion").select("*").eq("id", 1).maybeSingle();
    setPromotion(p || null);
    const { data: vs } = await supabase.from("vendors").select("id,name,markets(name)").eq("is_active", true).order("name");
    setRestaurants(vs || []);
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
    if (txnPct.trim() && (isNaN(Number(txnPct)) || Number(txnPct) < 0 || Number(txnPct) > 20)) {
      Alert.alert("Fees", "Transaction charge must be a percent from 0 to 20.");
      return;
    }
    const { error } = await supabase
      .from("settings")
      .update({
        platform_fee: Number(platform),
        bicycle_delivery_fee: Number(bike),
        motorbike_delivery_fee: Number(moto),
        transaction_fee_percent: txnPct.trim() ? Number(txnPct) : 0,
      })
      .eq("id", 1);
    if (error) Alert.alert("Fees", error.message);
    else Alert.alert("Saved");
  }

  async function savePromotion(_id: string | null, v: BannerValues) {
    if (!v.title.trim()) {
      Alert.alert("Promotion", "Add the promotion text.");
      return false;
    }
    const { error } = await supabase.from("promotion").upsert({
      id: 1,
      title: v.title.trim(),
      subtitle: v.subtitle.trim() || null,
      amount: v.amount.trim() ? Number(v.amount) : null,
      image_url: v.image,
      vendor_id: v.vendorId,
      label: v.label.trim() || null,
      button_text: v.buttonText.trim() || null,
      is_active: v.active,
      updated_at: new Date().toISOString(),
    });
    if (error) {
      Alert.alert("Promotion", error.message);
      return false;
    }
    await load();
    Alert.alert("Saved", "Customers see the new promotion next time Home opens.");
    return true;
  }

  async function saveLegal() {
    const clean = (v: string) => v.trim() || null;
    const { error } = await supabase
      .from("settings")
      .update({ terms_url: clean(termsUrl), privacy_url: clean(privacyUrl), cookies_url: clean(cookiesUrl) })
      .eq("id", 1);
    if (error) Alert.alert("Legal links", error.message);
    else Alert.alert("Saved", "The links open from Profile > About.");
  }

  if (loading) return <View style={{ flex: 1, backgroundColor: colors.adminBg, padding: 16 }}><FormSkeleton /></View>;

  return (
    <ScrollView style={{ flex: 1, backgroundColor: colors.adminBg }} contentContainerStyle={{ padding: 20, paddingBottom: 48 }}>
      <Text style={{ fontFamily: fonts.display, fontSize: 28, color: colors.adminText }}>Home</Text>

      <Text style={heading}>Promotion</Text>
      <Text style={label}>One fixed banner at the top of Home. It does not move.</Text>
      <BannerForm
        key={promotion?.updated_at || "empty"}
        initial={promotion || { is_active: true }}
        restaurants={restaurants}
        saveLabel="Save promotion"
        onSave={(v) => savePromotion(null, v)}
      />

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
      <Field value={promoSub} onChangeText={setPromoSub} placeholder={`We're adding more food markets across ${city.trim() || DEFAULTS.city}.`} />
      <View style={{ height: 6 }} />
      <PrimaryButton label="Save home text" onPress={saveHomeText} />

      <Text style={heading}>Legal links</Text>
      <Text style={label}>Terms and Conditions link</Text>
      <Field value={termsUrl} onChangeText={setTermsUrl} placeholder="https://..." autoCapitalize="none" keyboardType="url" />
      <Text style={label}>Privacy Policy link</Text>
      <Field value={privacyUrl} onChangeText={setPrivacyUrl} placeholder="https://..." autoCapitalize="none" keyboardType="url" />
      <Text style={label}>Cookie Policy link</Text>
      <Field value={cookiesUrl} onChangeText={setCookiesUrl} placeholder="https://..." autoCapitalize="none" keyboardType="url" />
      <View style={{ height: 10 }} />
      <PrimaryButton label="Save legal links" onPress={saveLegal} />

      <Text style={heading}>Fees</Text>
      <Field value={platform} onChangeText={setPlatform} placeholder="Platform fee" keyboardType="decimal-pad" />
      <View style={{ height: 10 }} />
      <Field value={bike} onChangeText={setBike} placeholder="Bicycle delivery fee" keyboardType="decimal-pad" />
      <View style={{ height: 10 }} />
      <Field value={moto} onChangeText={setMoto} placeholder="Motorbike delivery fee" keyboardType="decimal-pad" />
      <View style={{ height: 10 }} />
      <Text style={label}>Payment transaction charge in % (0 = not charged). Shown to customers at checkout.</Text>
      <Field value={txnPct} onChangeText={setTxnPct} placeholder="e.g. 3.5" keyboardType="decimal-pad" />
      <View style={{ height: 12 }} />
      <PrimaryButton label="Save fees" onPress={saveFees} />

    </ScrollView>
  );
}

type BannerValues = { title: string; subtitle: string; amount: string; image: string | null; active: boolean; vendorId: string | null; label: string; buttonText: string };

function BannerForm({
  initial,
  onSave,
  saveLabel,
  restaurants = [],
}: {
  initial?: any;
  restaurants?: any[];
  onSave: (v: BannerValues) => Promise<boolean>;
  saveLabel?: string;
}) {
  const [title, setTitle] = useState(initial?.title || "");
  const [subtitle, setSubtitle] = useState(initial?.subtitle || "");
  const [amount, setAmount] = useState(initial?.amount != null ? String(initial.amount) : "");
  const [image, setImage] = useState<string | null>(initial?.image_url || null);
  const [active, setActive] = useState(initial ? initial.is_active !== false : true);
  const [vendorId, setVendorId] = useState<string | null>(initial?.vendor_id || null);
  const [label, setLabel] = useState(initial?.label || "");
  const [buttonText, setButtonText] = useState(initial?.button_text || "");
  const isNew = !initial;
  const onDelete: (() => void) | undefined = undefined;
  const onUp: (() => void) | undefined = undefined;
  const onDown: (() => void) | undefined = undefined;

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
      <Text style={label}>Restaurant this banner opens (customers tap the banner to see its menu)</Text>
      <Pressable onPress={() => setVendorId(null)} style={{ paddingVertical: 4 }}>
        <Text style={{ fontFamily: vendorId === null ? fonts.title : fonts.body, color: vendorId === null ? ui.red : colors.adminText }}>
          {vendorId === null ? "● " : "○ "}None (banner is not tappable)
        </Text>
      </Pressable>
      {restaurants.map((r) => (
        <Pressable key={r.id} onPress={() => setVendorId(r.id)} style={{ paddingVertical: 4 }}>
          <Text style={{ fontFamily: vendorId === r.id ? fonts.title : fonts.body, color: vendorId === r.id ? ui.red : colors.adminText }}>
            {vendorId === r.id ? "● " : "○ "}
            {r.name}
            {r.markets?.name ? ` · ${r.markets.name}` : ""}
          </Text>
        </Pressable>
      ))}
      <View style={{ height: 8 }} />
      <Text style={label}>Restaurant name shown on the banner (optional, uses the restaurant's name if empty)</Text>
      <Field value={label} onChangeText={setLabel} placeholder="e.g. Mama B's Kitchen" />
      <Text style={label}>Button text (optional)</Text>
      <Field value={buttonText} onChangeText={setButtonText} placeholder="Tap to view menu" />
      <Text style={label}>Food photo (shown on the right). Use a different photo for each restaurant.</Text>
      <PhotoPicker folder="banner" uri={image} name="Banner photo" onChange={setImage} height={110} />
      {!isNew ? (
        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
          <Text style={{ fontFamily: fonts.bodySemi, color: colors.adminText }}>Show on Home</Text>
          <Switch value={active} onValueChange={setActive} trackColor={{ true: ui.red }} />
        </View>
      ) : null}
      <PrimaryButton
        label={saveLabel || (isNew ? "Add banner" : "Save banner")}
        onPress={async () => {
          const ok = await onSave({ title, subtitle, amount, image, active, vendorId, label, buttonText });
          if (ok && isNew) {
            setTitle("");
            setSubtitle("");
            setAmount("");
            setImage(null);
            setVendorId(null);
            setLabel("");
            setButtonText("");
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
