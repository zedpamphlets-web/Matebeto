import type { ImageSourcePropType } from "react-native";

/**
 * Pictures from the approved app-flow mockups. They are only a fallback: a photo uploaded in
 * Admin (Supabase `catalog` bucket) always wins. Matching is by name so it works for any row.
 */
const key = (name?: string | null) => String(name || "").toLowerCase().replace(/[^a-z]/g, "");

const FOOD: [string, ImageSourcePropType][] = [
  ["tbone", require("../assets/mockup/cat-tbone.jpg")],
  ["chicken", require("../assets/mockup/cat-chicken.jpg")],
  ["fish", require("../assets/mockup/cat-fish.jpg")],
  ["goat", require("../assets/mockup/cat-goat.jpg")],
  ["offal", require("../assets/mockup/cat-offals.jpg")],
  ["kapenta", require("../assets/mockup/cat-kapenta.jpg")],
];

const MARKETS: [string, ImageSourcePropType][] = [
  ["longacres", require("../assets/mockup/market-longacres.jpg")],
  ["olympia", require("../assets/mockup/market-olympia.jpg")],
  ["thornpark", require("../assets/mockup/market-thornpark.jpg")],
  ["avondale", require("../assets/mockup/market-avondale.jpg")],
];

function find(list: [string, ImageSourcePropType][], name?: string | null) {
  const k = key(name);
  if (!k) return undefined;
  return list.find(([m]) => k.includes(m))?.[1];
}

export const foodFallback = (name?: string | null) => find(FOOD, name);
export const marketFallback = (name?: string | null) => find(MARKETS, name);

/** Wide hero used on the meal page. Only T-Bone has a wide picture in the mockups. */
export const mealHeroFallback = (name?: string | null): ImageSourcePropType | undefined =>
  key(name).includes("tbone") ? require("../assets/mockup/meal-tbone.jpg") : foodFallback(name);

/** Wide strip at the top of a market menu. Longacres has its own; others reuse their card photo. */
export const marketBannerFallback = (name?: string | null): ImageSourcePropType | undefined =>
  key(name).includes("longacres") ? require("../assets/mockup/market-banner-longacres.jpg") : marketFallback(name);

export const homeBannerFood: ImageSourcePropType = require("../assets/mockup/banner-food.jpg");
