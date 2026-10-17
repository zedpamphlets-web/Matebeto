import { useCallback, useState } from "react";
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { router, useFocusEffect } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { MkField, MkHeader, MkScreen, RedButton } from "@/components/mk";
import { LoadingScreen } from "@/components/spinner";
import { confirmDialog } from "@/components/confirm";
import { LOGIN_ROUTE, currentProfile, signOutApp } from "@/lib/session";
import { EMPTY_ACCOUNT, loadAccount, saveAccount, type AccountDetails } from "@/lib/profile";
import { LIPILA_PROVIDERS } from "@/lib/lipila";
import { fonts, ui } from "@/lib/theme";

const hasDetails = (d: AccountDetails) =>
  !!(d.full_name || d.location_area || d.plot_number || d.address_text || d.payment_number);

export default function Settings() {
  const [form, setForm] = useState<AccountDetails>(EMPTY_ACCOUNT);
  const [saved, setSaved] = useState<AccountDetails>(EMPTY_ACCOUNT);
  const [editing, setEditing] = useState(false);
  const [loginPhone, setLoginPhone] = useState("");
  const [rider, setRider] = useState<any>(null);
  const [admin, setAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [note, setNote] = useState("");

  useFocusEffect(
    useCallback(() => {
      let alive = true;
      (async () => {
        const [{ details }, session] = await Promise.all([loadAccount(), currentProfile()]);
        if (!alive) return;
        setForm(details);
        setSaved(details);
        setEditing(!hasDetails(details)); // nothing saved yet: open the form; otherwise show the card
        setLoginPhone(String(session.user?.phone || session.profile?.phone || ""));
        setRider(session.rider);
        setAdmin(!!session.admin);
        setLoading(false);
      })();
      return () => {
        alive = false;
      };
    }, [])
  );

  function set<K extends keyof AccountDetails>(key: K, value: AccountDetails[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function save() {
    try {
      const { savedOnServer } = await saveAccount(form);
      setSaved(form);
      setEditing(false);
      setNote(savedOnServer ? "Saved to your account" : "Saved on this phone");
    } catch {
      setNote("");
      Alert.alert("Not saved yet", "Your details are kept on this phone. Connect to the internet and tap Save again.");
    }
  }

  function cancelEdit() {
    setForm(saved);
    setEditing(false);
  }

  async function logout() {
    const ok = await confirmDialog({
      title: "Log out?",
      message: "Are you sure you want to log out?",
      confirmLabel: "Log out",
      destructive: true,
    });
    if (!ok) return;
    await signOutApp();
    router.replace(LOGIN_ROUTE);
  }

  if (loading) {
    return (
      <MkScreen>
        <MkHeader title="Account" />
        <LoadingScreen />
      </MkScreen>
    );
  }

  const provider = LIPILA_PROVIDERS.find((p) => p.id === saved.payment_provider)?.label;
  const location = [saved.plot_number && `Plot ${saved.plot_number}`, saved.address_text, saved.location_area]
    .filter(Boolean)
    .join(", ");

  return (
    <MkScreen>
      <MkHeader title="Account" />
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 40 }} keyboardShouldPersistTaps="handled">
        {editing ? (
          <>
            <Text style={s.group}>About you</Text>
            <MkField value={form.full_name} onChangeText={(t) => set("full_name", t)} placeholder="Your name" />
            <MkField
              value={form.contact_phone}
              onChangeText={(t) => set("contact_phone", t)}
              placeholder="Phone number the rider can call"
              keyboardType="phone-pad"
            />

            <Text style={s.group}>Delivery location</Text>
            <MkField value={form.location_area} onChangeText={(t) => set("location_area", t)} placeholder="Area, for example Chelston" />
            <MkField value={form.plot_number} onChangeText={(t) => set("plot_number", t)} placeholder="Plot number" />
            <MkField value={form.address_text} onChangeText={(t) => set("address_text", t)} placeholder="Street or landmark" />
            <MkField value={form.address_notes} onChangeText={(t) => set("address_notes", t)} placeholder="Notes for the rider (optional)" />

            <Text style={s.group}>Payment method</Text>
            <View style={s.chips}>
              {LIPILA_PROVIDERS.map((p) => {
                const on = form.payment_provider === p.id;
                return (
                  <Pressable key={p.id} onPress={() => set("payment_provider", p.id)} style={[s.chip, on && s.chipOn]}>
                    <Text style={[s.chipText, on && { color: "#fff" }]}>{p.label}</Text>
                  </Pressable>
                );
              })}
            </View>
            <MkField
              value={form.payment_number}
              onChangeText={(t) => set("payment_number", t)}
              placeholder="Mobile money number"
              keyboardType="phone-pad"
            />

            <View style={{ height: 8 }} />
            <RedButton label="Save" onPress={save} />
            {hasDetails(saved) ? (
              <Pressable onPress={cancelEdit} style={s.cancel} hitSlop={8}>
                <Text style={s.cancelText}>Cancel</Text>
              </Pressable>
            ) : null}
          </>
        ) : (
          <>
            <View style={s.card}>
              <View style={s.cardHead}>
                <View style={{ flex: 1 }}>
                  <Text style={s.name}>{saved.full_name || "Your account"}</Text>
                  {loginPhone ? <Text style={s.login}>{loginPhone}</Text> : null}
                </View>
                <Pressable onPress={() => setEditing(true)} style={s.edit} hitSlop={8}>
                  <Ionicons name="create-outline" size={16} color={ui.red} />
                  <Text style={s.editText}>Edit</Text>
                </Pressable>
              </View>

              <Detail icon="call-outline" label="Rider calls" value={saved.contact_phone} />
              <Detail icon="location-outline" label="Delivery location" value={location} />
              <Detail icon="chatbubble-outline" label="Note for the rider" value={saved.address_notes} />
              <Detail
                icon="wallet-outline"
                label="Payment"
                value={[provider, saved.payment_number].filter(Boolean).join(" · ")}
                last
              />
            </View>
            {note ? (
              <View style={s.saved}>
                <Ionicons name="checkmark-circle" size={18} color="#1F9D55" />
                <Text style={s.savedText}>{note}</Text>
              </View>
            ) : null}
          </>
        )}

        <View style={{ height: 22 }} />
        {rider?.status === "APPROVED" ? <Row label="Open rider mode" icon="bicycle-outline" onPress={() => router.push("/(rider)")} /> : null}
        {rider?.status === "PENDING" ? <Row label="Rider application in review" icon="time-outline" onPress={() => router.push("/auth/rider-apply")} /> : null}
        {!rider ? <Row label="Apply to become a rider" icon="bicycle-outline" onPress={() => router.push("/auth/rider-apply")} /> : null}
        {admin ? <Row label="Admin" icon="shield-outline" onPress={() => router.push("/admin")} /> : null}
        <Row label="Log out" icon="log-out-outline" onPress={logout} danger />
      </ScrollView>
    </MkScreen>
  );
}

function Detail({ icon, label, value, last }: { icon: keyof typeof Ionicons.glyphMap; label: string; value?: string; last?: boolean }) {
  if (!value) return null;
  return (
    <View style={[s.detail, !last && s.detailRule]}>
      <Ionicons name={icon} size={20} color={ui.sub} style={{ marginTop: 1 }} />
      <View style={{ flex: 1 }}>
        <Text style={s.detailLabel}>{label}</Text>
        <Text style={s.detailValue}>{value}</Text>
      </View>
    </View>
  );
}

function Row({ label, icon, onPress, danger }: { label: string; icon: keyof typeof Ionicons.glyphMap; onPress: () => void; danger?: boolean }) {
  return (
    <Pressable onPress={onPress} style={s.row}>
      <Ionicons name={icon} size={21} color={danger ? ui.red : ui.ink} />
      <Text style={[s.rowText, danger && { color: ui.red }]}>{label}</Text>
      {!danger ? <Ionicons name="chevron-forward" size={16} color={ui.hint} /> : null}
    </Pressable>
  );
}

const s = StyleSheet.create({
  group: { fontFamily: fonts.title, fontSize: 15, color: ui.ink, marginTop: 8, marginBottom: 10 },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 12 },
  chip: { paddingHorizontal: 14, paddingVertical: 11, borderRadius: 12, backgroundColor: "#fff", borderWidth: 1, borderColor: ui.line },
  chipOn: { backgroundColor: ui.red, borderColor: ui.red },
  chipText: { fontFamily: fonts.bodySemi, color: ui.ink, fontSize: 14 },
  cancel: { alignItems: "center", paddingVertical: 14 },
  cancelText: { fontFamily: fonts.bodySemi, fontSize: 15, color: ui.sub },
  card: { borderWidth: 1, borderColor: ui.line, borderRadius: 16, backgroundColor: "#fff", padding: 16 },
  cardHead: { flexDirection: "row", alignItems: "center", paddingBottom: 14, marginBottom: 2 },
  name: { fontFamily: fonts.display, fontSize: 20, color: ui.ink },
  login: { fontFamily: fonts.body, fontSize: 14, color: ui.sub, marginTop: 3 },
  edit: { flexDirection: "row", alignItems: "center", gap: 5, paddingHorizontal: 12, height: 34, borderRadius: 17, backgroundColor: ui.redSoft },
  editText: { fontFamily: fonts.title, fontSize: 13.5, color: ui.red },
  detail: { flexDirection: "row", gap: 12, paddingVertical: 13 },
  detailRule: { borderBottomWidth: 1, borderBottomColor: ui.line },
  detailLabel: { fontFamily: fonts.body, fontSize: 13, color: ui.sub },
  detailValue: { fontFamily: fonts.bodySemi, fontSize: 15.5, color: ui.ink, marginTop: 2, lineHeight: 21 },
  saved: { flexDirection: "row", alignItems: "center", gap: 8, marginTop: 12 },
  savedText: { fontFamily: fonts.bodySemi, fontSize: 14, color: ui.ink },
  row: { flexDirection: "row", alignItems: "center", gap: 14, paddingVertical: 16, borderTopWidth: 1, borderTopColor: ui.line },
  rowText: { flex: 1, fontFamily: fonts.title, fontSize: 16, color: ui.ink },
});
