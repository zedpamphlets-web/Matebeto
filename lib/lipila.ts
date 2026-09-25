export type LipilaProvider = "airtel" | "mtn" | "zamtel";

export const LIPILA_PROVIDERS: { id: LipilaProvider; label: string }[] = [
  { id: "airtel", label: "Airtel Money" },
  { id: "mtn", label: "MTN MoMo" },
  { id: "zamtel", label: "Zamtel Kwacha" },
];

export function toZambianMsisdn(raw: string): string {
  const digits = raw.replace(/\D/g, "");
  if (digits.startsWith("260") && digits.length === 12) return digits;
  if (digits.startsWith("0") && digits.length === 10) return `260${digits.slice(1)}`;
  if (digits.length === 9) return `260${digits}`;
  return digits;
}

export function formatKw(amount: number | string) {
  const n = Number(amount || 0);
  return `K${n % 1 === 0 ? n.toFixed(0) : n.toFixed(2)}`;
}
