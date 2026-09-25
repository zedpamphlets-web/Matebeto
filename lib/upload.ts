import * as ImagePicker from "expo-image-picker";
import { decode } from "base64-arraybuffer";
import { supabase } from "@/lib/supabase";

export type PickSource = "library" | "camera";

async function ask(source: PickSource) {
  if (source === "camera") {
    const perm = await ImagePicker.requestCameraPermissionsAsync();
    if (!perm.granted) throw new Error("Camera permission is needed to take a photo.");
    return;
  }
  const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!perm.granted) throw new Error("Photo library permission is needed to upload from your phone.");
}

export async function pickImage(source: PickSource) {
  await ask(source);
  const options: ImagePicker.ImagePickerOptions = {
    mediaTypes: ImagePicker.MediaTypeOptions.Images,
    allowsEditing: true,
    aspect: [4, 3],
    quality: 0.78,
    base64: true,
  };
  const result =
    source === "camera"
      ? await ImagePicker.launchCameraAsync(options)
      : await ImagePicker.launchImageLibraryAsync(options);
  if (result.canceled) return null;
  return result.assets[0];
}

export async function uploadCatalogImage(folder: string, source: PickSource): Promise<string | null> {
  const asset = await pickImage(source);
  if (!asset) return null;
  if (!asset.base64) throw new Error("Could not read that photo. Try another image.");

  const png = (asset.mimeType || "").includes("png") || (asset.uri || "").toLowerCase().endsWith(".png");
  const ext = png ? "png" : "jpg";
  const path = `${folder}/${Date.now()}-${Math.floor(Math.random() * 9999)}.${ext}`;

  const { error } = await supabase.storage.from("catalog").upload(path, decode(asset.base64), {
    contentType: asset.mimeType || (png ? "image/png" : "image/jpeg"),
    upsert: false,
  });
  if (error) throw error;

  const { data } = supabase.storage.from("catalog").getPublicUrl(path);
  return data.publicUrl;
}
