/** "K 85.00" - the price style used across the customer screens. */
export const kw = (amount: number | string | null | undefined) => `K ${Number(amount || 0).toFixed(2)}`;

/** Put "Food Market" after a market name unless the name already says it. */
export const marketLabel = (name?: string | null) => {
  const n = String(name || "").trim();
  if (!n) return "";
  return /food market/i.test(n) ? n : `${n} Food Market`;
};
export const marketShortName = (name?: string | null) => String(name || "").replace(/\s*food market\s*$/i, "").trim();

/** "Good morning", "Good afternoon" or "Good evening" from the phone's clock. */
export const greeting = (date: Date = new Date()) => {
  const h = date.getHours();
  return h < 12 ? "Good morning" : h < 17 ? "Good afternoon" : "Good evening";
};

/** "2.1 km away" / "850 m away". Empty when the distance is not known. */
export const distanceText = (km?: number | null) => {
  if (km == null || !Number.isFinite(km)) return "";
  if (km < 1) return `${Math.max(50, Math.round((km * 1000) / 50) * 50)} m away`;
  return `${km.toFixed(1)} km away`;
};

export const countLabel = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;

/** "K95" for whole amounts, "K95.50" otherwise (menu tiles). */
export const kwShort = (amount: number | string | null | undefined) => {
  const n = Number(amount || 0);
  return `K${Number.isInteger(n) ? n : n.toFixed(2)}`;
};
