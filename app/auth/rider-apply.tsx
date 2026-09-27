import { useEffect, useState } from "react";
import { Alert, Pressable, ScrollView, Text, View } from "react-native";
import { router } from "expo-router";
import { DarkField, DarkScreen, GoldButton, AppHeader } from "@/components/app-shell";
import { FaceCamera } from "@/components/face-camera";
import { PhotoPicker } from "@/components/photo-picker";
import { isSupabaseConfigured, supabase } from "@/lib/supabase";
import { currentProfile } from "@/lib/session";
import { savePreviewRiderApplication } from "@/lib/preview";
import { uploadBase64 } from "@/lib/upload";
import { colors, fonts, radius } from "@/lib/theme";

export default function RiderApply() {
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [vehicle, setVehicle] = useState<"bicycle" | "motorbike">("bicycle");
  const [licence, setLicence] = useState("");
  const [ownership, setOwnership] = useState("");
  const [front, setFront] = useState<string | null>(null);
  const [back, setBack] = useState<string | null>(null);
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [photoB64, setPhotoB64] = useState<string | undefined>();
  const [loading, setLoading] = useState(false);
  const [preview, setPreview] = useState(false);

  useEffect(() => {
    currentProfile().then(({ user, profile, preview }) => {
      setPreview(!!preview);
      setPhone(String(user?.phone || profile?.phone || ""));
      if (profile?.full_name) setFullName(profile.full_name);
      if (profile?.address_text) setAddress(profile.address_text);
    });
  }, []);

  async function submit() {
    if (!fullName.trim() || !phone.trim()) {
      Alert.alert("Missing details", "Name and phone are required.");
      return;
    }
    if (!photoUri) {
      Alert.alert("Photo needed", "Capture your face in the camera box.");
      return;
    }
    setLoading(true);
    try {
      let photoUrl = photoUri;
      if (isSupabaseConfigured && !preview && photoB64) {
        photoUrl = (await uploadBase64("riders", photoB64, "image/jpeg")) || photoUri;
      }

      const packed = [licence.trim(), front ? `FRONT:${front}` : "", back ? `BACK:${back}` : ""]
        .filter(Boolean)
        .join("\n");

      if (preview || !isSupabaseConfigured) {
        await savePreviewRiderApplication({
          id: "preview-rider",
          user_id: "preview-user",
          full_name: fullName.trim(),
          phone: phone.trim(),
          address_text: address.trim(),
          vehicle_type: vehicle,
          licence_info: packed,
          ownership_note: ownership.trim(),
          licence_front_url: front,
          licence_back_url: back,
          status: "PENDING",
          is_online: false,
        });
        Alert.alert("Submitted", "Your rider account is pending review. You can order food while you wait.");
        router.replace("/(customer)");
        return;
      }

      const payload: Record<string, string | null> = {
        p_full_name: fullName.trim(),
        p_phone: phone.trim(),
        p_address: address.trim(),
        p_vehicle: vehicle,
        p_licence: packed,
        p_ownership: ownership.trim(),
        p_photo: photoUrl,
        p_licence_front: front,
        p_licence_back: back,
      };

      let { error } = await supabase.rpc("apply_rider", payload);
      if (error) {
        const retry = await supabase.rpc("apply_rider", {
          p_full_name: payload.p_full_name,
          p_phone: payload.p_phone,
          p_address: payload.p_address,
          p_vehicle: payload.p_vehicle,
          p_licence: payload.p_licence,
          p_ownership: payload.p_ownership,
        });
        error = retry.error;
      }
      if (error) {
        Alert.alert("Could not submit", error.message);
        return;
      }
      Alert.alert("Submitted", "Your rider account is pending review. You can order food while you wait.");
      router.replace("/(customer)");
    } finally {
      setLoading(false);
    }
  }

  return (
    <DarkScreen>
      <AppHeader title="Rider application" back />
      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 48 }}>
        <Text style={{ color: "#fff", fontFamily: fonts.display, fontSize: 28, marginBottom: 8 }}>
          Rider application
        </Text>
        <Text style={{ color: "#B3B3B3", fontFamily: fonts.body, lineHeight: 22, marginBottom: 18 }}>
          Capture your face in the box. The app stays open. After OTP you fill this form first — jobs open after Admin
          approves you.
        </Text>

        <FaceCamera
          uri={photoUri}
          onCapture={(uri, b64) => {
            setPhotoUri(uri);
            setPhotoB64(b64);
          }}
        />

        <DarkField value={fullName} onChangeText={setFullName} placeholder="Full name" />
        <DarkField value={phone} onChangeText={setPhone} placeholder="Mobile number" keyboardType="phone-pad" />
        <DarkField value={address} onChangeText={setAddress} placeholder="Residential address" />

        <Text style={{ color: "#fff", fontFamily: fonts.title, marginTop: 8, marginBottom: 8 }}>Vehicle type</Text>
        <View style={{ flexDirection: "row", gap: 10, marginBottom: 14 }}>
          {(["bicycle", "motorbike"] as const).map((v) => (
            <Pressable
              key={v}
              onPress={() => setVehicle(v)}
              style={{
                flex: 1,
                borderRadius: radius.md,
                padding: 14,
                borderWidth: 2,
                borderColor: vehicle === v ? colors.gold : "rgba(255,255,255,0.14)",
                backgroundColor: vehicle === v ? "rgba(244,163,0,0.12)" : "#161616",
              }}
            >
              <Text style={{ color: "#fff", fontFamily: fonts.title, textTransform: "capitalize", textAlign: "center" }}>
                {v}
              </Text>
            </Pressable>
          ))}
        </View>

        <DarkField value={licence} onChangeText={setLicence} placeholder="Licence / ID number" />
        <DarkField value={ownership} onChangeText={setOwnership} placeholder="Proof of ownership or permission" />

        <Text style={{ color: "#fff", fontFamily: fonts.title, marginTop: 8, marginBottom: 8 }}>
          Licence / ID front
        </Text>
        <PhotoPicker folder="riders/licence-front" uri={front} name="Front" onChange={setFront} height={150} />

        <Text style={{ color: "#fff", fontFamily: fonts.title, marginTop: 8, marginBottom: 8 }}>
          Licence / ID back
        </Text>
        <PhotoPicker folder="riders/licence-back" uri={back} name="Back" onChange={setBack} height={150} />

        <View style={{ height: 12 }} />
        <GoldButton label={loading ? "Submitting…" : "Submit for review"} onPress={submit} disabled={loading} />
      </ScrollView>
    </DarkScreen>
  );
}
