import { useEffect, useState } from "react";
import { Alert, Pressable, ScrollView, Text, View } from "react-native";
import { router } from "expo-router";
import { DarkField, DarkScreen, GoldButton, AppHeader } from "@/components/app-shell";
import { FaceCamera } from "@/components/face-camera";
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
  const [frontB64, setFrontB64] = useState<string | undefined>();
  const [back, setBack] = useState<string | null>(null);
  const [backB64, setBackB64] = useState<string | undefined>();
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [photoB64, setPhotoB64] = useState<string | undefined>();
  const [loading, setLoading] = useState(false);
  const [preview, setPreview] = useState(false);

  useEffect(() => {
    // Only detect preview mode — do NOT prefill name/phone/address (no hardcoded test values)
    currentProfile().then(({ preview: isPreview }) => {
      setPreview(!!isPreview);
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
      let frontUrl = front;
      let backUrl = back;

      if (isSupabaseConfigured && !preview) {
        if (photoB64) {
          photoUrl = (await uploadBase64("riders", photoB64, "image/jpeg")) || photoUri;
        }
        if (frontB64) {
          frontUrl = (await uploadBase64("riders", frontB64, "image/jpeg")) || front;
        }
        if (backB64) {
          backUrl = (await uploadBase64("riders", backB64, "image/jpeg")) || back;
        }
      }

      const packed = [
        licence.trim(),
        frontUrl ? `FRONT:${frontUrl}` : "",
        backUrl ? `BACK:${backUrl}` : "",
      ]
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
          licence_front_url: frontUrl,
          licence_back_url: backUrl,
          status: "PENDING",
          is_online: false,
        });
        Alert.alert(
          "Submitted",
          "Your rider account is pending review. You can order food while you wait."
        );
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
        p_licence_front: frontUrl,
        p_licence_back: backUrl,
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
      Alert.alert(
        "Submitted",
        "Your rider account is pending review. You can order food while you wait."
      );
      router.replace("/(customer)");
    } finally {
      setLoading(false);
    }
  }

  return (
    <DarkScreen>
      <AppHeader title="Rider application" back />
      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 48 }}>
        <Text style={{ color: "#fff", fontFamily: fonts.display, fontSize: 28, marginBottom: 18 }}>
          Rider application
        </Text>

        {/* Face photo — same embed camera as before */}
        <FaceCamera
          uri={photoUri}
          label="Your photo"
          facing="front"
          buttonLabel="Capture face"
          onCapture={(uri, b64) => {
            setPhotoUri(uri);
            setPhotoB64(b64);
          }}
        />

        <DarkField value={fullName} onChangeText={setFullName} placeholder="Full name" />
        <DarkField
          value={phone}
          onChangeText={setPhone}
          placeholder="Mobile number"
          keyboardType="phone-pad"
        />
        <DarkField value={address} onChangeText={setAddress} placeholder="Residential address" />

        <Text style={{ color: "#fff", fontFamily: fonts.title, marginTop: 8, marginBottom: 8 }}>
          Vehicle type
        </Text>
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
              <Text
                style={{
                  color: "#fff",
                  fontFamily: fonts.title,
                  textTransform: "capitalize",
                  textAlign: "center",
                }}
              >
                {v}
              </Text>
            </Pressable>
          ))}
        </View>

        <DarkField value={licence} onChangeText={setLicence} placeholder="Licence / ID number" />
        <DarkField
          value={ownership}
          onChangeText={setOwnership}
          placeholder="Proof of ownership or permission"
        />

        {/* Licence front & back — same embed camera style (stays in app) */}
        <FaceCamera
          uri={front}
          label="Licence / ID front"
          facing="back"
          buttonLabel="Capture front"
          height={200}
          onCapture={(uri, b64) => {
            setFront(uri);
            setFrontB64(b64);
          }}
        />

        <FaceCamera
          uri={back}
          label="Licence / ID back"
          facing="back"
          buttonLabel="Capture back"
          height={200}
          onCapture={(uri, b64) => {
            setBack(uri);
            setBackB64(b64);
          }}
        />

        <View style={{ height: 12 }} />
        <GoldButton
          label={loading ? "Submitting…" : "Submit for review"}
          onPress={submit}
          disabled={loading}
        />
      </ScrollView>
    </DarkScreen>
  );
}
