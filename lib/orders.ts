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
  { key: "PAYMENT_CONFIRMED", label: "Payment confirmed" },
  { key: "VENDOR_ACCEPTED", label: "Vendor preparing" },
  { key: "RIDER_ASSIGNED", label: "Rider assigned" },
  { key: "PICKED_UP", label: "Picked up" },
  { key: "OUT_FOR_DELIVERY", label: "Out for delivery" },
  { key: "COMPLETED", label: "Delivered" },
];

export function stepDone(status: string, key: string) {
  const order = [
    "CREATED",
    "PAYMENT_CONFIRMED",
    "SEARCHING_VENDOR",
    "VENDOR_OFFERED",
    "VENDOR_ACCEPTED",
    "SEARCHING_RIDER",
    "RIDER_ASSIGNED",
    "PICKED_UP",
    "OUT_FOR_DELIVERY",
    "OTP_VERIFIED",
    "COMPLETED",
  ];
  const map: Record<string, string> = {
    PAYMENT_CONFIRMED: "PAYMENT_CONFIRMED",
    SEARCHING_VENDOR: "PAYMENT_CONFIRMED",
    VENDOR_OFFERED: "PAYMENT_CONFIRMED",
    VENDOR_ACCEPTED: "VENDOR_ACCEPTED",
    SEARCHING_RIDER: "VENDOR_ACCEPTED",
    NO_RIDER_AVAILABLE: "VENDOR_ACCEPTED",
    RIDER_ASSIGNED: "RIDER_ASSIGNED",
    PICKED_UP: "PICKED_UP",
    OUT_FOR_DELIVERY: "OUT_FOR_DELIVERY",
    OTP_VERIFIED: "COMPLETED",
    COMPLETED: "COMPLETED",
  };
  const current = map[status] || status;
  return order.indexOf(current) >= order.indexOf(key);
}
