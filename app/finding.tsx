import { useEffect } from "react";
import { router, useLocalSearchParams } from "expo-router";
import { PlateLoader } from "@/components/plate-loader";
import { supabase } from "@/lib/supabase";
import { writeCache } from "@/lib/offline-cache";
import { withTimeout } from "@/lib/network";

const SHOW_AT_LEAST_MS = 1600;

/**
 * Shown right after login (and when the app opens with a saved login).
 * While the plate animates it quietly saves the menu on the phone, then opens Home.
 */
export default function Finding() {
  const { next } = useLocalSearchParams<{ next?: string }>();

  useEffect(() => {
    let cancelled = false;
    const started = Date.now();

    async function warm() {
      try {
        const [markets, featured] = await withTimeout(
          Promise.all([
            supabase.from("markets").select("*").eq("is_active", true).order("sort_order"),
            supabase.from("meals").select("*").eq("is_featured", true).eq("is_available", true),
          ]),
          6000
        );
        if (!markets.error) await writeCache("home.markets", markets.data ?? []);
        if (!featured.error) await writeCache("home.featured", featured.data ?? []);
      } catch {
        /* offline: Home will show the last saved menu */
      }
    }

    warm().finally(() => {
      const wait = Math.max(0, SHOW_AT_LEAST_MS - (Date.now() - started));
      setTimeout(() => {
        if (!cancelled) router.replace((next as any) || "/(customer)");
      }, wait);
    });

    return () => {
      cancelled = true;
    };
  }, [next]);

  return <PlateLoader />;
}
