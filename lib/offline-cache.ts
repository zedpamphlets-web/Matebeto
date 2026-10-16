import { useCallback, useRef, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useFocusEffect } from "expo-router";
import { withTimeout } from "@/lib/network";

const PREFIX = "matebeto.cache.v1:";

/** Last good copy of anything we loaded from Supabase, kept on the phone. */
export async function readCache<T>(key: string): Promise<{ value: T } | null> {
  try {
    const raw = await AsyncStorage.getItem(PREFIX + key);
    if (!raw) return null;
    return JSON.parse(raw) as { value: T };
  } catch {
    return null;
  }
}

export async function writeCache<T>(key: string, value: T) {
  try {
    await AsyncStorage.setItem(PREFIX + key, JSON.stringify({ value }));
  } catch {
    /* storage full or unavailable: the screen still works, it just won't be saved */
  }
}

export async function clearCache() {
  try {
    const keys = await AsyncStorage.getAllKeys();
    const mine = keys.filter((k) => k.startsWith(PREFIX));
    if (mine.length) await AsyncStorage.multiRemove(mine);
  } catch {
    /* ignore */
  }
}

type Result<T> = PromiseLike<{ data: T | null; error: any }>;

/**
 * Loads a Supabase query and keeps a saved copy on the phone.
 *
 *  - If a saved copy exists it shows straight away (no skeleton), then refreshes in the background.
 *  - If the request fails (no internet, timeout, server error) the saved copy stays on screen and
 *    `stale` is true, so the app never shows "no products" just because the network dropped.
 *  - `failed` is true only when there is nothing saved AND the request failed.
 *  - supabase-js does not throw on network errors, it returns `{ error }`, so that is checked here.
 */
export function useCachedLoad<T>(key: string, run: () => Result<T>) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [stale, setStale] = useState(false);
  const [failed, setFailed] = useState(false);
  const alive = useRef(true);
  const runRef = useRef(run);
  runRef.current = run;

  const reload = useCallback(async () => {
    setFailed(false);
    const saved = await readCache<T>(key);
    if (!alive.current) return;
    if (saved) {
      setData(saved.value);
      setLoading(false);
    } else {
      setLoading(true);
    }
    try {
      const res = await withTimeout(Promise.resolve(runRef.current()), 10000);
      if (res.error) throw res.error;
      if (!alive.current) return;
      setData(res.data as T);
      setStale(false);
      setLoading(false);
      await writeCache(key, res.data ?? null);
    } catch {
      if (!alive.current) return;
      if (saved) setStale(true);
      else setFailed(true);
      setLoading(false);
    }
  }, [key]);

  useFocusEffect(
    useCallback(() => {
      alive.current = true;
      reload();
      return () => {
        alive.current = false;
      };
    }, [reload])
  );

  return { data, loading, stale, failed, reload };
}
