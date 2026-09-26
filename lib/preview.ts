import AsyncStorage from "@react-native-async-storage/async-storage";

const KEY = "matebeto.preview.session";

export const PREVIEW_OTP = "123456";

export type PreviewSession = {
  mode: "customer" | "rider";
  phone: string;
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
