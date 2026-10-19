import { useCallback, useState } from "react";
import { ActivityIndicator, Alert, Modal, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { router, useFocusEffect, useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { MkField, MkHeader, MkScreen, RedButton } from "@/components/mk";
import { LoadingScreen } from "@/components/spinner";
import { confirmDialog } from "@/components/confirm";
import { LOGIN_ROUTE, currentProfile, signOutApp } from "@/lib/session";
import { EMPTY_ACCOUNT, loadAccount, saveAccount, type AccountDetails } from "@/lib/profile";
import { LIPILA_PROVIDERS } from "@/lib/lipila";
import { supabase } from "@/lib/supabase";
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
  const { edit } = useLocalSearchParams<{ edit?: string }>();
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [confirmPhone, setConfirmPhone] = useState("");
  const [deleting, setDeleting] = useState(false);

  useFocusEffect(
    useCallback(() => {
      let alive = true;
      (async () => {
        const [{ details }, session] = await Promise.all([loadAccount(), currentProfile()]);
        if (!alive) return;
        setForm(details);
        setSaved(details);
        setEditing(!hasDetails(details) || edit === "1"); // nothing saved yet (or sent here to complete it): open the form; otherwise show the card
        setLoginPhone(String(session.user?.phone || session.profile?.phone || ""));
        setRider(session.rider);
        setAdmin(!!session.admin);
        setLoading(false);
      })();
      return () => {
        alive = false;
      };
    }, [edit])
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

  async function deleteAccount() {
    if (!confirmPhone.trim() || deleting) return;
    setDeleting(true);
    try {
      const { data, error } = await supabase.rpc("delete_my_account", { p_phone: confirmPhone.trim() });
      if (error) throw error;
      if (data?.ok) {
        setDeleteOpen(false);
        await signOutApp();
        Alert.alert("Account deleted", "Your data has been deleted from Matebeto.");
        router.replace(LOGIN_ROUTE);
        return;
      }
      const reason = String(data?.reason || "");
      Alert.alert(
        "Could not delete",
        reason === "PHONE_MISMATCH"
          ? "That phone number does not match this account."
          : reason === "ADMIN_ACCOUNT"
          ? "Admin accounts cannot be deleted from the app."
          : reason === "IN_PROGRESS"
          ? "You still have an order or a refund in progress. Please try again when it is finished."
          : "Please try again."
      );
    } catch (e: any) {
      Alert.alert("Could not delete", e?.message || "Check your internet connection and try again.");
    } finally {
      setDeleting(false);
    }
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

        <Text style={s.dangerTitle}>Danger zone</Text>
        <View style={s.dangerBox}>
          <Text style={s.dangerText}>Deleting your account removes all your data on Matebeto. This cannot be undone.</Text>
          <Pressable
            onPress={() => {
              setConfirmPhone("");
              setDeleteOpen(true);
            }}
            style={s.dangerBtn}
          >
            <Ionicons name="trash-outline" size={18} color={ui.red} />
            <Text style={s.dangerBtnText}>Delete my account</Text>
          </Pressable>
        </View>
      </ScrollView>

      <Modal visible={deleteOpen} transparent animationType="fade" onRequestClose={() => setDeleteOpen(false)}>
        <View style={s.overlay}>
          <View style={s.dialog}>
            <Text style={s.dialogTitle}>Delete your account?</Text>
            <Text style={s.dialogText}>Please, we will delete all your data on Matebeto.</Text>
            <Text style={[s.dialogText, { marginTop: 10 }]}>Enter your phone number to confirm.</Text>
            <View style={{ width: "100%", marginTop: 12 }}>
              <MkField value={confirmPhone} onChangeText={setConfirmPhone} placeholder="Your phone number" keyboardType="phone-pad" />
            </View>
            <View style={s.dialogRow}>
              <Pressable onPress={() => setDeleteOpen(false)} style={s.dialogCancel} disabled={deleting}>
                <Text style={s.dialogCancelText}>Cancel</Text>
              </Pressable>
              <Pressable
                onPress={deleteAccount}
                disabled={deleting || !confirmPhone.trim()}
                style={[s.dialogDelete, (!confirmPhone.trim() || deleting) && { opacity: 0.5 }]}
              >
                {deleting ? <ActivityIndicator color="#fff" /> : <Text style={s.dialogDeleteText}>Delete</Text>}
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
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
  dangerTitle: { fontFamily: fonts.title, fontSize: 15, color: ui.red, marginTop: 30, marginBottom: 8 },
  dangerBox: { borderWidth: 1, borderColor: "#F3C5CB", backgroundColor: "#FFF7F8", borderRadius: 14, padding: 14 },
  dangerText: { fontFamily: fonts.body, fontSize: 14, lineHeight: 21, color: ui.sub },
  dangerBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    marginTop: 12,
    height: 46,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: ui.red,
    backgroundColor: "#fff",
  },
  dangerBtnText: { fontFamily: fonts.title, fontSize: 15, color: ui.red },
  overlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.45)", alignItems: "center", justifyContent: "center", padding: 24 },
  dialog: { width: "100%", maxWidth: 380, backgroundColor: "#fff", borderRadius: 20, padding: 22, alignItems: "center" },
  dialogTitle: { fontFamily: fonts.display, fontSize: 20, color: ui.ink, textAlign: "center" },
  dialogText: { fontFamily: fonts.body, fontSize: 15, lineHeight: 22, color: ui.sub, textAlign: "center", marginTop: 8 },
  dialogRow: { flexDirection: "row", gap: 10, marginTop: 14, width: "100%" },
  dialogCancel: { flex: 1, height: 48, borderRadius: 14, backgroundColor: "#F5F5F7", alignItems: "center", justifyContent: "center" },
  dialogCancelText: { fontFamily: fonts.title, fontSize: 15, color: ui.ink },
  dialogDelete: { flex: 1, height: 48, borderRadius: 14, backgroundColor: ui.red, alignItems: "center", justifyContent: "center" },
  dialogDeleteText: { fontFamily: fonts.title, fontSize: 15, color: "#fff" },
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
