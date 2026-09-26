import AsyncStorage from "@react-native-async-storage/async-storage";

const KEY = "matebeto.preview.session";
const APPLY_KEY = "matebeto.preview.rider.apply";

export const PREVIEW_OTP = "123456";

export type PreviewSession = {
  mode: "customer" | "rider";
  phone: string;
};

export type PreviewRiderApplication = {
  id: string;
  user_id: string;
  full_name: string;
  phone: string;
  address_text: string;
  vehicle_type: "bicycle" | "motorbike";
  licence_info: string;
  ownership_note: string;
  licence_front_url?: string | null;
  licence_back_url?: string | null;
  status: "PENDING" | "APPROVED" | "REJECTED" | "SUSPENDED";
  is_online: boolean;
};

export async function setPreviewSession(session: PreviewSession) {
  await AsyncStorage.setItem(KEY, JSON.stringify(session));
}

export async function getPreviewSession(): Promise<PreviewSession | null> {
  const raw = await AsyncStorage.getItem(KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as PreviewSession;
  } catch {
    return null;
  }
}

export async function clearPreviewSession() {
  await AsyncStorage.removeItem(KEY);
}

export async function savePreviewRiderApplication(row: PreviewRiderApplication) {
  await AsyncStorage.setItem(APPLY_KEY, JSON.stringify(row));
}

export async function getPreviewRiderApplication(): Promise<PreviewRiderApplication | null> {
  const raw = await AsyncStorage.getItem(APPLY_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as PreviewRiderApplication;
  } catch {
    return null;
  }
}

export async function clearPreviewRiderApplication() {
  await AsyncStorage.removeItem(APPLY_KEY);
}
