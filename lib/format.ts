/** "K 85.00" - the price style used across the customer screens. */
export const kw = (amount: number | string | null | undefined) => `K ${Number(amount || 0).toFixed(2)}`;

/** Put "Food Market" after a market name unless the name already says it. */
export const marketLabel = (name?: string | null) => {
  const n = String(name || "").trim();
  if (!n) return "";
  return /food market/i.test(n) ? n : `${n} Food Market`;
};
export const marketShortName = (name?: string | null) => String(name || "").replace(/\s*food market\s*$/i, "").trim();
