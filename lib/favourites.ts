import { useCallback, useEffect, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";

const KEY = "matebeto.favourites";

async function read(): Promise<string[]> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    const list = raw ? JSON.parse(raw) : [];
    return Array.isArray(list) ? list : [];
  } catch {
    return [];
  }
}

/** Heart button state for a market or meal. Saved on the phone. */
export function useFavourite(kind: "market" | "meal" | "restaurant", id?: string | null) {
  const full = id ? `${kind}:${id}` : "";
  const [on, setOn] = useState(false);

  useEffect(() => {
    if (!full) return;
    read().then((l) => setOn(l.includes(full)));
  }, [full]);

  const toggle = useCallback(async () => {
    if (!full) return;
    const list = await read();
    const next = list.includes(full) ? list.filter((x) => x !== full) : [...list, full];
    setOn(next.includes(full));
    try {
      await AsyncStorage.setItem(KEY, JSON.stringify(next));
    } catch {}
  }, [full]);

  return { on, toggle };
}
