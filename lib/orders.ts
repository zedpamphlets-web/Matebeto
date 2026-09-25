import { supabase } from "@/lib/supabase";
import { NOTIFY_VENDOR_URL } from "@/lib/config";
import { SUPABASE_ANON_KEY } from "@/lib/supabase";

export type BasketItem = {
  meal_id: string;
  name: string;
  price: number;
  quantity: number;
  sides: string[];
  image_url?: string;
};

export async function createOrder(input: {
  marketId: string;
  deliveryType: "bicycle" | "motorbike";
  address: { text: string; notes?: string };
  items: BasketItem[];
}) {
  const { data, error } = await supabase.rpc("create_order", {
    p_market_id: input.marketId,
    p_delivery_type: input.deliveryType,
    p_address: input.address,
    p_items: input.items.map((i) => ({
      meal_id: i.meal_id,
      quantity: i.quantity,
      sides: i.sides,
    })),
  });
  if (error) throw error;
  return data;
}

export async function startVendorSearch(orderId: string) {
  const { data, error } = await supabase.rpc("offer_next_vendor", { p_order: orderId });
  if (error) throw error;
  if (data?.ok && NOTIFY_VENDOR_URL) {
    const { data: session } = await supabase.auth.getSession();
    await fetch(NOTIFY_VENDOR_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${session.session?.access_token}`,
        apikey: SUPABASE_ANON_KEY,
      },
      body: JSON.stringify({ orderId }),
    }).catch(() => null);
  }
  return data;
}

export async function startRiderSearch(orderId: string) {
  const { data, error } = await supabase.rpc("offer_next_rider", { p_order: orderId });
  if (error) throw error;
  return data;
}

export const TRACK_STEPS = [
  { key: "CREATED", label: "Order received" },
  { key: "SEARCHING_VENDOR", label: "Finding your food partner" },
  { key: "VENDOR_ACCEPTED", label: "Vendor confirmed" },
  { key: "PREPARING", label: "Preparing your order" },
  { key: "RIDER_ASSIGNED", label: "Rider on the way" },
  { key: "OUT_FOR_DELIVERY", label: "Out for delivery" },
  { key: "COMPLETED", label: "Delivered" },
];

export function stepDone(status: string, key: string) {
  const rank: Record<string, number> = {
    CREATED: 0,
    PAYMENT_CONFIRMED: 1,
    SEARCHING_VENDOR: 1,
    VENDOR_OFFERED: 1,
    VENDOR_ACCEPTED: 2,
    SEARCHING_RIDER: 3,
    NO_RIDER_AVAILABLE: 3,
    PREPARING: 3,
    RIDER_ASSIGNED: 4,
    PICKED_UP: 5,
    OUT_FOR_DELIVERY: 5,
    OTP_VERIFIED: 6,
    COMPLETED: 6,
  };
  const keyRank: Record<string, number> = {
    CREATED: 0,
    SEARCHING_VENDOR: 1,
    VENDOR_ACCEPTED: 2,
    PREPARING: 3,
    RIDER_ASSIGNED: 4,
    OUT_FOR_DELIVERY: 5,
    COMPLETED: 6,
  };
  return (rank[status] ?? -1) >= (keyRank[key] ?? 99);
}
