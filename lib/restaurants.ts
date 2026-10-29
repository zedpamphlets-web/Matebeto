import { supabase } from "@/lib/supabase";

export type Restaurant = {
  id: string;
  market_id: string;
  name: string;
  image_url: string | null;
  stand_number: string | null;
  cuisine: string | null;
  description: string | null;
  rating: number | null;
  rating_count: number | null;
  is_open: boolean;
};

export type MenuMeal = {
  meal_id: string;
  name: string;
  description: string | null;
  price: number;
  image_url: string | null;
  prep_time: string | null;
};

/** Restaurants customers may see (no phone or payout numbers). One market, or all when null. */
export const loadRestaurants = (marketId: string | null = null) =>
  supabase.rpc("app_restaurants", { p_market: marketId }) as unknown as PromiseLike<{ data: Restaurant[] | null; error: any }>;

/** One restaurant's own menu with its own prices and photos. */
export const loadRestaurantMenu = (vendorId: string) =>
  supabase.rpc("app_restaurant_menu", { p_vendor: vendorId }) as unknown as PromiseLike<{ data: MenuMeal[] | null; error: any }>;

export const standLabel = (stand?: string | null) => {
  const s = String(stand || "").trim();
  if (!s) return "";
  return /^stand\b/i.test(s) ? s : `Stand ${s}`;
};

export const NSHIMA_LINE = "Prepared and served with nshima.";
export const DEFAULT_SIDES = ["Beans", "Okra", "Rape"];
export const MAX_SIDES = 3;
