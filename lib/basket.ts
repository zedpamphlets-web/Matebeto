import AsyncStorage from "@react-native-async-storage/async-storage";
import type { BasketItem } from "@/lib/orders";

const KEY = "matebeto.basket";

export type BasketState = {
  marketId: string | null;
  marketName: string | null;
  /** The one restaurant this basket belongs to (V1: one restaurant per order). */
  vendorId: string | null;
  vendorName: string | null;
  items: BasketItem[];
};

export const EMPTY_BASKET: BasketState = { marketId: null, marketName: null, vendorId: null, vendorName: null, items: [] };
const empty = EMPTY_BASKET;

export async function loadBasket(): Promise<BasketState> {
  const raw = await AsyncStorage.getItem(KEY);
  if (!raw) return empty;
  const parsed = JSON.parse(raw);
  // older builds could save the text "null" as the market id
  for (const k of ["marketId", "marketName", "vendorId", "vendorName"]) {
    if (parsed[k] === "null" || parsed[k] === "undefined" || parsed[k] === undefined) parsed[k] = null;
  }
  if (!Array.isArray(parsed.items)) parsed.items = [];
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
