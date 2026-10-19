import { useEffect, useState } from "react";
import { Alert, Pressable, ScrollView, StyleSheet, Text } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as WebBrowser from "expo-web-browser";
import { MkHeader, MkScreen } from "@/components/mk";
import { supabase } from "@/lib/supabase";
import { fonts, ui } from "@/lib/theme";

type Links = { terms_url?: string | null; privacy_url?: string | null; cookies_url?: string | null };

const ROWS: { label: string; key: keyof Links }[] = [
  { label: "Terms and Conditions", key: "terms_url" },
  { label: "Privacy Policy", key: "privacy_url" },
  { label: "Cookie Policy", key: "cookies_url" },
];

export default function About() {
  const [links, setLinks] = useState<Links>({});

  useEffect(() => {
    supabase
      .from("settings")
      .select("terms_url, privacy_url, cookies_url")
      .eq("id", 1)
      .maybeSingle()
      .then(({ data }) => setLinks((data as Links) || {}), () => {});
  }, []);

  async function open(key: keyof Links) {
    const url = String(links[key] || "").trim();
    if (!/^https?:\/\//i.test(url)) {
      Alert.alert("Coming soon", "This page is not available yet. Please check again later.");
      return;
    }
    try {
      await WebBrowser.openBrowserAsync(url);
    } catch {
      Alert.alert("Could not open", "Please check your internet connection and try again.");
    }
  }

  return (
    <MkScreen>
      <MkHeader title="About" />
      <ScrollView contentContainerStyle={{ paddingBottom: 32 }}>
        {ROWS.map((r) => (
          <Pressable key={r.key} onPress={() => open(r.key)} style={s.row}>
            <Text style={s.label}>{r.label}</Text>
            <Ionicons name="chevron-forward" size={18} color={ui.hint} />
          </Pressable>
        ))}
      </ScrollView>
    </MkScreen>
  );
}

const s = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 18,
    borderBottomWidth: 1,
    borderBottomColor: ui.line,
  },
  label: { flex: 1, fontFamily: fonts.title, fontSize: 16, color: ui.ink },
});
