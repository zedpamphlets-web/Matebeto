import AsyncStorage from "@react-native-async-storage/async-storage";
import type { BasketItem } from "@/lib/orders";

const KEY = "matebeto.basket";

export type BasketState = {
  marketId: string | null;
  marketName: string | null;
  /** Restaurant (vendor) — one restaurant per order */
  vendorId: string | null;
  vendorName: string | null;
  items: BasketItem[];
};

const empty: BasketState = {
  marketId: null,
  marketName: null,
  vendorId: null,
  vendorName: null,
  items: [],
};

export async function loadBasket(): Promise<BasketState> {
  const raw = await AsyncStorage.getItem(KEY);
  if (!raw) return empty;
  const parsed = JSON.parse(raw);
  // older builds could save the text "null" as the market id
  if (parsed.marketId === "null" || parsed.marketId === "undefined") parsed.marketId = null;
  if (parsed.marketName === "null" || parsed.marketName === "undefined") parsed.marketName = null;
  if (parsed.vendorId === "null" || parsed.vendorId === "undefined") parsed.vendorId = null;
  if (parsed.vendorName === "null" || parsed.vendorName === "undefined") parsed.vendorName = null;
  if (parsed.vendorId === undefined) parsed.vendorId = null;
  if (parsed.vendorName === undefined) parsed.vendorName = null;
  return parsed;
}

export async function saveBasket(state: BasketState) {
  await AsyncStorage.setItem(KEY, JSON.stringify(state));
}

export async function clearBasket() {
  await AsyncStorage.removeItem(KEY);
}

export function foodTotal(items: BasketItem[]) {
  return items.reduce((sum, i) => sum + i.price * i.quantity, 0);
}
