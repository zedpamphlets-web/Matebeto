import { useCallback, useState } from "react";
import { Alert, Pressable, ScrollView, Text, View } from "react-native";
import { router, useFocusEffect } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { AppHeader, DarkField, DarkScreen, GoldButton } from "@/components/app-shell";
import { FormSkeleton } from "@/components/skeleton";
import { SpinPressable } from "@/components/spin-pressable";
import { LOGIN_ROUTE, currentProfile, signOutApp } from "@/lib/session";
import { EMPTY_ACCOUNT, loadAccount, saveAccount, type AccountDetails } from "@/lib/profile";
import { LIPILA_PROVIDERS } from "@/lib/lipila";
import { colors, fonts, radius } from "@/lib/theme";

export default function Settings() {
  const [form, setForm] = useState<AccountDetails>(EMPTY_ACCOUNT);
  const [loginPhone, setLoginPhone] = useState("");
  const [rider, setRider] = useState<any>(null);
  const [admin, setAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [dirty, setDirty] = useState(false);
  const [savedNote, setSavedNote] = useState("");

  useFocusEffect(
    useCallback(() => {
      let alive = true;
      (async () => {
        const [{ details }, session] = await Promise.all([loadAccount(), currentProfile()]);
        if (!alive) return;
        setForm(details);
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
    setDirty(true);
    setSavedNote("");
  }

  async function save() {
    try {
      const { savedOnServer } = await saveAccount(form);
      setDirty(false);
      setSavedNote(savedOnServer ? "Saved to your account" : "Saved on this phone");
    } catch {
      setSavedNote("");
      Alert.alert("Not saved yet", "Your details are kept on this phone. Connect to the internet and tap Save again.");
    }
  }

  function logout() {
    Alert.alert("Log out", "Are you sure you want to log out?", [
      { text: "No", style: "cancel" },
      { text: "Yes", style: "destructive", onPress: async () => {
        await signOutApp();
        router.replace(LOGIN_ROUTE);
      }},
    ]);
  }

  return (
    <View style={{ flex: 1, backgroundColor: '#FFF0E6' }}>
      <AppHeader title="Account" onMenu={() => router.push("/(customer)/menu")} />
      {loading ? (
        <FormSkeleton />
      ) : (
        <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 48 }} keyboardShouldPersistTaps="handled">
          <Text style={{ color: "#1C1B26", fontFamily: fonts.display, fontSize: 28 }}>Your account</Text>
          {loginPhone ? (
            <Text style={{ color: colors.onGreenMuted, fontFamily: fonts.body, marginTop: 4, marginBottom: 18 }}>
              Logged in with {loginPhone}
            </Text>
          ) : (
            <View style={{ height: 18 }} />
          )}

          <Section title="About you" />
          <DarkField value={form.full_name} onChangeText={(t) => set("full_name", t)} placeholder="Your name" />
          <DarkField
            value={form.contact_phone}
            onChangeText={(t) => set("contact_phone", t)}
            placeholder="Phone number the rider can call"
            keyboardType="phone-pad"
          />

          <Section title="Delivery location" />
          <DarkField value={form.location_area} onChangeText={(t) => set("location_area", t)} placeholder="Area, for example Chelston" />
          <DarkField value={form.plot_number} onChangeText={(t) => set("plot_number", t)} placeholder="Plot number" />
          <DarkField value={form.address_text} onChangeText={(t) => set("address_text", t)} placeholder="Street or landmark" />
          <DarkField value={form.address_notes} onChangeText={(t) => set("address_notes", t)} placeholder="Notes for the rider (optional)" />

          <Section title="Payment method" />
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 10 }}>
            {LIPILA_PROVIDERS.map((p) => {
              const on = form.payment_provider === p.id;
              return (
                <Pressable
                  key={p.id}
                  onPress={() => set("payment_provider", p.id)}
                  style={{
                    paddingHorizontal: 14,
                    paddingVertical: 11,
                    borderRadius: radius.sm,
                    backgroundColor: on ? colors.gold : colors.surface,
                    borderWidth: 1.5,
                    borderColor: on ? colors.gold : "rgba(255,255,255,0.14)",
                  }}
                >
                  <Text style={{ fontFamily: fonts.bodySemi, color: "#1C1B26" }}>{p.label}</Text>
                </Pressable>
              );
            })}
          </View>
          <DarkField
            value={form.payment_number}
            onChangeText={(t) => set("payment_number", t)}
            placeholder="Mobile money number"
            keyboardType="phone-pad"
          />

          <View style={{ height: 6 }} />
          <GoldButton label={dirty ? "Save changes" : "Save"} onPress={save} />
          {savedNote ? (
            <View style={{ backgroundColor: "#fff", borderRadius: 14, padding: 14, marginTop: 12, borderWidth: 1, borderColor: "#E8DFD2", flexDirection: "row", alignItems: "center", gap: 8 }}>
              <Ionicons name="checkmark-circle" size={20} color={colors.customer} />
              <Text style={{ color: "#1C1B26", fontFamily: fonts.bodySemi }}>{savedNote}</Text>
            </View>
          ) : null}

          <View style={{ height: 26 }} />
          {rider?.status === "APPROVED" && (
            <>
              <GoldButton label="Open rider mode" onPress={() => router.push("/(rider)")} />
              <View style={{ height: 12 }} />
            </>
          )}
          {rider?.status === "PENDING" && (
            <Text style={{ color: colors.gold, fontFamily: fonts.body, marginBottom: 12 }}>
              Your rider application is being reviewed.
            </Text>
          )}
          {!rider && (
            <>
              <GoldButton label="Apply to become a rider" onPress={() => router.push("/auth/rider-apply")} />
              <View style={{ height: 12 }} />
            </>
          )}
          {admin && (
            <>
              <GoldButton label="Admin" onPress={() => router.push("/admin")} />
              <View style={{ height: 12 }} />
            </>
          )}

          <SpinPressable
            onPress={logout}
            spinnerColor="#fff"
            style={{
              height: 54,
              borderRadius: radius.pill,
              alignItems: "center",
              justifyContent: "center",
              borderWidth: 1.5,
              borderColor: "rgba(255,255,255,0.35)",
            }}
          >
            <Text style={{ color: "#1C1B26", fontFamily: fonts.title, fontSize: 16 }}>Log out</Text>
          </SpinPressable>
        </ScrollView>
      )}
    </View>
  );
}

function Section({ title }: { title: string }) {
  return (
    <Text style={{ color: colors.gold, fontFamily: fonts.title, fontSize: 15, marginTop: 8, marginBottom: 10 }}>
      {title}
    </Text>
  );
}
