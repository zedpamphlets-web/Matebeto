import { useEffect, useMemo, useState } from "react";
import { Linking, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { MkHeader, MkScreen } from "@/components/mk";
import { supabase } from "@/lib/supabase";
import { HELP_CATEGORIES, POPULAR_IDS, allArticles, type HelpArticle } from "@/lib/help";
import { fonts, ui } from "@/lib/theme";

export default function Help() {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState<string | null>(null);
  const [showAll, setShowAll] = useState<Record<string, boolean>>({});
  const [supportPhone, setSupportPhone] = useState<string | null>(null);

  useEffect(() => {
    supabase
      .from("settings")
      .select("support_phone")
      .eq("id", 1)
      .maybeSingle()
      .then(({ data }) => setSupportPhone(data?.support_phone || null), () => {});
  }, []);

  const everything = useMemo(() => allArticles(), []);
  const popular = useMemo(
    () => POPULAR_IDS.map((id) => everything.find((a) => a.id === id)).filter(Boolean) as HelpArticle[],
    [everything]
  );
  const term = query.trim().toLowerCase();
  const results = term ? everything.filter((a) => (a.q + " " + a.a).toLowerCase().includes(term)) : [];

  const toggle = (id: string) => setOpen((cur) => (cur === id ? null : id));

  function Article({ a, preview }: { a: HelpArticle; preview?: boolean }) {
    const isOpen = open === a.id;
    return (
      <Pressable onPress={() => toggle(a.id)} style={s.article}>
        <View style={s.qRow}>
          <Text style={s.q}>{a.q}</Text>
          <Ionicons name={isOpen ? "chevron-up" : "chevron-down"} size={18} color={ui.hint} />
        </View>
        {isOpen ? (
          <Text style={s.a}>{a.a}</Text>
        ) : preview ? (
          <Text style={s.preview} numberOfLines={2}>
            {a.a}
          </Text>
        ) : null}
      </Pressable>
    );
  }

  return (
    <MkScreen>
      <MkHeader title="Help" />
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 40 }} keyboardShouldPersistTaps="handled">
        <View style={s.search}>
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder="Ask a question..."
            placeholderTextColor={ui.hint}
            style={s.input}
            returnKeyType="search"
          />
          <Ionicons name="search" size={20} color={ui.sub} />
        </View>

        {term ? (
          <>
            <Text style={s.section}>Results</Text>
            {results.length === 0 ? (
              <Text style={s.empty}>No answers found. Try different words, or contact support below.</Text>
            ) : (
              results.map((a) => <Article key={a.id} a={a} />)
            )}
          </>
        ) : (
          <>
            <Text style={s.section}>Popular articles</Text>
            {popular.map((a) => (
              <Article key={a.id} a={a} preview />
            ))}

            <Text style={[s.section, { marginTop: 26 }]}>Browse by categories</Text>
            {HELP_CATEGORIES.map((c) => {
              const expanded = !!showAll[c.id];
              const list = expanded ? c.articles : c.articles.slice(0, 3);
              return (
                <View key={c.id} style={s.category}>
                  <Text style={s.catTitle}>{c.title}</Text>
                  <Text style={s.catCount}>{c.articles.length} articles</Text>
                  <View style={{ marginTop: 6 }}>
                    {list.map((a) => (
                      <Article key={a.id} a={a} />
                    ))}
                  </View>
                  {c.articles.length > 3 ? (
                    <Pressable onPress={() => setShowAll((m) => ({ ...m, [c.id]: !expanded }))} style={s.showAll}>
                      <Text style={s.showAllText}>{expanded ? "Show less" : "Show all"}</Text>
                      <Ionicons name={expanded ? "arrow-up" : "arrow-forward"} size={16} color={ui.ink} />
                    </Pressable>
                  ) : null}
                </View>
              );
            })}
          </>
        )}

        {supportPhone ? (
          <View style={s.support}>
            <Text style={s.catTitle}>Still need help?</Text>
            <Text style={[s.a, { marginTop: 6 }]}>Call our support team and have your order number ready.</Text>
            <Pressable onPress={() => Linking.openURL(`tel:${supportPhone}`).catch(() => {})} style={s.call}>
              <Ionicons name="call" size={18} color="#fff" />
              <Text style={s.callText}>Call {supportPhone}</Text>
            </Pressable>
          </View>
        ) : null}
      </ScrollView>
    </MkScreen>
  );
}

const s = StyleSheet.create({
  search: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F5F5F7",
    borderRadius: 14,
    paddingHorizontal: 14,
    height: 50,
  },
  input: { flex: 1, fontFamily: fonts.body, fontSize: 15, color: ui.ink, paddingVertical: 0 },
  section: { fontFamily: fonts.title, fontSize: 17, color: ui.ink, marginTop: 22, marginBottom: 6 },
  article: { paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: ui.line },
  qRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  q: { flex: 1, fontFamily: fonts.title, fontSize: 15, color: ui.ink, lineHeight: 21 },
  a: { fontFamily: fonts.body, fontSize: 14.5, lineHeight: 22, color: ui.sub, marginTop: 8 },
  preview: { fontFamily: fonts.body, fontSize: 13.5, lineHeight: 20, color: ui.hint, marginTop: 6 },
  empty: { fontFamily: fonts.body, fontSize: 14.5, color: ui.sub, marginTop: 8, lineHeight: 22 },
  category: { backgroundColor: "#F7F7F9", borderRadius: 16, padding: 16, marginTop: 12 },
  catTitle: { fontFamily: fonts.title, fontSize: 17, color: ui.ink },
  catCount: { fontFamily: fonts.body, fontSize: 13, color: ui.hint, marginTop: 2 },
  showAll: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    gap: 8,
    marginTop: 12,
    paddingHorizontal: 14,
    height: 40,
    borderRadius: 10,
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: ui.line,
  },
  showAllText: { fontFamily: fonts.title, fontSize: 14, color: ui.ink },
  support: { marginTop: 26, borderWidth: 1, borderColor: ui.line, borderRadius: 16, padding: 16 },
  call: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    marginTop: 14,
    height: 48,
    borderRadius: 14,
    backgroundColor: ui.red,
  },
  callText: { fontFamily: fonts.title, fontSize: 15, color: "#fff" },
});
