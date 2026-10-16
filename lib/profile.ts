import AsyncStorage from "@react-native-async-storage/async-storage";
import { supabase } from "@/lib/supabase";
import { currentProfile } from "@/lib/session";

/** Everything a customer keeps on their account. Saved in Supabase and also on the phone. */
export type AccountDetails = {
  full_name: string;
  contact_phone: string; // the number the rider calls
  location_area: string; // area / neighbourhood
  plot_number: string;
  address_text: string; // street / landmark
  address_notes: string;
  payment_provider: "airtel" | "mtn" | "zamtel" | "";
  payment_number: string; // mobile money number
};

export const EMPTY_ACCOUNT: AccountDetails = {
  full_name: "",
  contact_phone: "",
  location_area: "",
  plot_number: "",
  address_text: "",
  address_notes: "",
  payment_provider: "",
  payment_number: "",
};

const LOCAL_KEY = "matebeto.account.v1";

function fromRow(row: any, loginPhone: string): AccountDetails {
  return {
    full_name: row?.full_name || "",
    contact_phone: row?.contact_phone || loginPhone || "",
    location_area: row?.location_area || "",
    plot_number: row?.plot_number || "",
    address_text: row?.address_text || "",
    address_notes: row?.address_notes || "",
    payment_provider: (row?.payment_provider as AccountDetails["payment_provider"]) || "",
    payment_number: row?.payment_number || "",
  };
}

export async function readLocalAccount(): Promise<AccountDetails | null> {
  try {
    const raw = await AsyncStorage.getItem(LOCAL_KEY);
    return raw ? ({ ...EMPTY_ACCOUNT, ...JSON.parse(raw) } as AccountDetails) : null;
  } catch {
    return null;
  }
}

export async function clearLocalAccount() {
  await AsyncStorage.removeItem(LOCAL_KEY).catch(() => {});
}

/** Local copy first (instant, works offline), then the Supabase copy replaces it when it arrives. */
export async function loadAccount(): Promise<{ details: AccountDetails; fromServer: boolean }> {
  const local = await readLocalAccount();
  try {
    const { user, profile, preview } = await currentProfile();
    if (!user) return { details: local || EMPTY_ACCOUNT, fromServer: false };
    const loginPhone = String(user.phone || profile?.phone || "");
    if (preview) return { details: local || fromRow(profile, loginPhone), fromServer: false };
    // currentProfile swallows network errors and returns an empty profile, so only trust it when it has a row
    if (!profile) return { details: local || fromRow(null, loginPhone), fromServer: false };
    const details = fromRow(profile, loginPhone);
    await AsyncStorage.setItem(LOCAL_KEY, JSON.stringify(details));
    return { details, fromServer: true };
  } catch {
    return { details: local || EMPTY_ACCOUNT, fromServer: false };
  }
}

/** Saves to Supabase (permanent) and to the phone. Throws if the server save fails. */
export async function saveAccount(details: AccountDetails): Promise<{ savedOnServer: boolean }> {
  await AsyncStorage.setItem(LOCAL_KEY, JSON.stringify(details));
  // keep the delivery screens in step with what the customer saved
  const addressLine = [details.plot_number && `Plot ${details.plot_number}`, details.address_text, details.location_area]
    .filter(Boolean)
    .join(", ");
  if (addressLine) {
    await AsyncStorage.setItem(
      "matebeto.address",
      JSON.stringify({ text: addressLine, notes: details.address_notes })
    );
  }

  const { user, preview } = await currentProfile();
  if (preview || !user) return { savedOnServer: false };

  const { error } = await supabase.from("profiles").upsert(
    {
      user_id: user.id,
      full_name: details.full_name,
      contact_phone: details.contact_phone,
      location_area: details.location_area,
      plot_number: details.plot_number,
      address_text: details.address_text,
      address_notes: details.address_notes,
      payment_provider: details.payment_provider || null,
      payment_number: details.payment_number,
    },
    { onConflict: "user_id" }
  );
  if (error) throw error;
  return { savedOnServer: true };
}

export function deliveryAddressFrom(details: AccountDetails) {
  const text = [details.plot_number && `Plot ${details.plot_number}`, details.address_text, details.location_area]
    .filter(Boolean)
    .join(", ");
  return { text, notes: details.address_notes };
}
