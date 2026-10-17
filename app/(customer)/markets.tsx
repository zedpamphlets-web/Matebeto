import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { EmptyState } from "@/components/empty-state";
import { MkHeader, MkScreen } from "@/components/mk";
import { Photo } from "@/components/photo";
import { LoadingScreen } from "@/components/spinner";
import { supabase } from "@/lib/supabase";
import { useCachedLoad } from "@/lib/offline-cache";
import { OfflineNotice } from "@/components/offline-notice";
import { OfflineBanner } from "@/components/offline-banner";
import { fonts, ui } from "@/lib/theme";

export default function Markets() {
  const q = useCachedLoad<any[]>("home.markets", () =>
    supabase.from("markets").select("*").eq("is_active", true).order("sort_order")
  );
  const markets = q.data || [];

  return (
    <MkScreen>
      <MkHeader title="Choose your market" />
      {q.failed ? (
        <OfflineNotice onRetry={q.reload} />
      ) : q.loading ? (
        <LoadingScreen />
      ) : (
        <ScrollView contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 32 }} showsVerticalScrollIndicator={false}>
          {q.stale ? <OfflineBanner /> : null}
          {markets.length === 0 ? (
            <EmptyState icon="storefront" color={ui.red} title="No markets yet" />
          ) : (
            markets.map((m, i) => (
              <Pressable
                key={m.id}
                onPress={() => router.push(`/(customer)/market/${m.id}`)}
                style={[s.row, i < markets.length - 1 && s.rule]}
              >
                <View style={s.photo}>
                  <Photo uri={m.image_url} name={m.name} height={64} width={84} hideLabel />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={s.name}>{m.name}</Text>
                  {m.area ? <Text style={s.meta}>{m.area}</Text> : null}
                </View>
                <Ionicons name="chevron-forward" size={18} color={ui.hint} />
              </Pressable>
            ))
          )}
        </ScrollView>
      )}
    </MkScreen>
  );
}

const s = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center", gap: 14, paddingVertical: 14 },
  rule: { borderBottomWidth: 1, borderBottomColor: ui.line },
  photo: { borderRadius: 10, overflow: "hidden" },
  name: { fontFamily: fonts.title, fontSize: 16, color: ui.ink },
  meta: { fontFamily: fonts.body, fontSize: 13, color: ui.sub, marginTop: 2 },
});
