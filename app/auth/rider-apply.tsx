import { useEffect, useState } from "react";
import { Alert, Pressable, ScrollView, Text, View, Image } from "react-native";
import * as ImagePicker from "expo-image-picker";
import { router } from "expo-router";
import { DarkField, DarkScreen, GoldButton, AppHeader } from "@/components/app-shell";
import { FaceCamera } from "@/components/face-camera";
import { isSupabaseConfigured, supabase } from "@/lib/supabase";
import { currentProfile } from "@/lib/session";
import { savePreviewRiderApplication } from "@/lib/preview";
import { uploadBase64 } from "@/lib/upload";
import { colors, fonts, radius } from "@/lib/theme";

export default function RiderApply() {
  const [step, setStep] = useState(1);
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [gender, setGender] = useState<"Male" | "Female" | "">("");
  const [vehicle, setVehicle] = useState<"bicycle" | "motorbike">("bicycle");
  const [area, setArea] = useState("");
  const [docType, setDocType] = useState<"NRC" | "Licence">("NRC");
  const [front, setFront] = useState<string | null>(null);
  const [frontB64, setFrontB64] = useState<string | undefined>();
  const [back, setBack] = useState<string | null>(null);
  const [backB64, setBackB64] = useState<string | undefined>();
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [photoB64, setPhotoB64] = useState<string | undefined>();
  const [loading, setLoading] = useState(false);
  const [preview, setPreview] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => {
    currentProfile().then(({ preview: isPreview }) => setPreview(!!isPreview));
  }, []);

  function nextFromStep1() {
    if (!fullName.trim() || !phone.trim() || !gender) {
      Alert.alert("Missing details", "Name, phone and gender are required.");
      return;
    }
    setStep(2);
  }

  
  async function pickDoc(side: "front" | "back", source: "camera" | "library") {
    if (source === "camera") {
      const perm = await ImagePicker.requestCameraPermissionsAsync();
      if (!perm.granted) return Alert.alert("Camera", "Allow camera to capture the document.");
    } else {
      const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!perm.granted) return Alert.alert("Photos", "Allow photo access to choose a document.");
    }
    const res = source === "camera"
      ? await ImagePicker.launchCameraAsync({ quality: 0.7, base64: true })
      : await ImagePicker.launchImageLibraryAsync({ quality: 0.7, base64: true });
    if (res.canceled || !res.assets?.[0]) return;
    const a = res.assets[0];
    if (side === "front") { setFront(a.uri); setFrontB64(a.base64 || undefined); }
    else { setBack(a.uri); setBackB64(a.base64 || undefined); }
  }

  function chooseDoc(side: "front" | "back") {
    Alert.alert("Upload document", "Choose how to add the page", [
      { text: "Camera", onPress: () => pickDoc(side, "camera") },
      { text: "Phone photos", onPress: () => pickDoc(side, "library") },
      { text: "Cancel", style: "cancel" },
    ]);
  }

  function nextFromStep2() {
    if (!front || !back) {
      Alert.alert("Documents", "Please capture the front and back of your document.");
      return;
    }
    setStep(3);
  }

  async function submit() {
    if (!photoUri) {
      Alert.alert("Photo needed", "Capture your face to finish.");
      return;
    }
    setLoading(true);
    try {
      let photoUrl = photoUri;
      let frontUrl = front;
      let backUrl = back;
      if (isSupabaseConfigured && !preview) {
        if (photoB64) photoUrl = (await uploadBase64("riders", photoB64, "image/jpeg")) || photoUri;
        if (frontB64) frontUrl = (await uploadBase64("riders", frontB64, "image/jpeg")) || front;
        if (backB64) backUrl = (await uploadBase64("riders", backB64, "image/jpeg")) || back;
      }
      const packed = [
        docType,
        frontUrl ? `FRONT:${frontUrl}` : "",
        backUrl ? `BACK:${backUrl}` : "",
        gender ? `GENDER:${gender}` : "",
      ].filter(Boolean).join("\n");

      if (preview || !isSupabaseConfigured) {
        await savePreviewRiderApplication({
          id: "preview-rider",
          user_id: "preview-user",
          full_name: fullName.trim(),
          phone: phone.trim(),
          address_text: area.trim(),
          vehicle_type: vehicle,
          licence_info: packed,
          ownership_note: "",
          licence_front_url: frontUrl,
          licence_back_url: backUrl,
          photo_url: photoUrl,
          status: "PENDING",
        } as any);
      } else {
        const { data: user } = await supabase.auth.getUser();
        const uid = user.user?.id;
        if (!uid) throw new Error("Not signed in");
        const { error } = await supabase.from("riders").upsert({
          user_id: uid,
          full_name: fullName.trim(),
          phone: phone.trim(),
          address_text: area.trim(),
          vehicle_type: vehicle,
          licence_info: packed,
          photo_url: photoUrl,
          licence_front_url: frontUrl,
          licence_back_url: backUrl,
          status: "PENDING",
        }, { onConflict: "user_id" });
        if (error) throw error;
      }
      setDone(true);
      setStep(4);
    } catch (e: any) {
      Alert.alert("Could not submit", e?.message || "Try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <DarkScreen>
      <AppHeader title={step === 4 ? "Application" : "Rider application"} back />
      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 40 }} keyboardShouldPersistTaps="handled">
        {step < 4 ? (
          <Text style={{ fontFamily: fonts.body, color: "#6B6A78", marginBottom: 12 }}>
            Step {step} of 3
          </Text>
        ) : null}

        {step === 1 && (
          <>
            <DarkField value={fullName} onChangeText={setFullName} placeholder="Full name" />
            <DarkField value={phone} onChangeText={setPhone} placeholder="Mobile number" keyboardType="phone-pad" />
            <Text style={{ fontFamily: fonts.title, color: "#1C1B26", marginTop: 6, marginBottom: 8 }}>Gender</Text>
            <View style={{ flexDirection: "row", gap: 10, marginBottom: 14 }}>
              {(["Male", "Female"] as const).map((g) => (
                <Pressable key={g} onPress={() => setGender(g)} style={chip(gender === g)}>
                  <Text style={chipText(gender === g)}>{g}</Text>
                </Pressable>
              ))}
            </View>
            <Text style={{ fontFamily: fonts.title, color: "#1C1B26", marginBottom: 8 }}>Vehicle</Text>
            <View style={{ flexDirection: "row", gap: 10, marginBottom: 18 }}>
              {(["bicycle", "motorbike"] as const).map((v) => (
                <Pressable key={v} onPress={() => setVehicle(v)} style={chip(vehicle === v)}>
                  <Text style={chipText(vehicle === v)}>{v === "bicycle" ? "Bicycle" : "Motorbike"}</Text>
                </Pressable>
              ))}
            </View>
            <GoldButton label="Continue" onPress={nextFromStep1} />
          </>
        )}

        {step === 2 && (
          <>
            <Text style={{ fontFamily: fonts.title, color: "#1C1B26", marginBottom: 8 }}>Document</Text>
            <View style={{ flexDirection: "row", gap: 10, marginBottom: 14 }}>
              {(["NRC", "Licence"] as const).map((d) => (
                <Pressable key={d} onPress={() => setDocType(d)} style={chip(docType === d)}>
                  <Text style={chipText(docType === d)}>{d === "Licence" ? "Driving licence" : "NRC"}</Text>
                </Pressable>
              ))}
            </View>
            <Text style={{ fontFamily: fonts.title, color: "#1C1B26", marginBottom: 10 }}>Select document to upload</Text>
            <Pressable onPress={() => chooseDoc("front")} style={box}>
              {front ? (
                <Image source={{ uri: front }} style={{ width: "100%", height: 120, borderRadius: 10 }} resizeMode="cover" />
              ) : (
                <>
                  <Text style={{ color: "#4A6CF7", fontFamily: fonts.title, fontSize: 16 }}>Front Page</Text>
                  <Text style={{ color: "#6B6A78", fontFamily: fonts.body, marginTop: 4 }}>Tap to take a photo or choose from phone</Text>
                </>
              )}
            </Pressable>
            <Pressable onPress={() => chooseDoc("back")} style={box}>
              {back ? (
                <Image source={{ uri: back }} style={{ width: "100%", height: 120, borderRadius: 10 }} resizeMode="cover" />
              ) : (
                <>
                  <Text style={{ color: "#4A6CF7", fontFamily: fonts.title, fontSize: 16 }}>Back Page</Text>
                  <Text style={{ color: "#6B6A78", fontFamily: fonts.body, marginTop: 4 }}>Tap to take a photo or choose from phone</Text>
                </>
              )}
            </Pressable>
            <View style={{ height: 8 }} />
            <GoldButton label="Continue" onPress={nextFromStep2} />
            <View style={{ height: 10 }} />
            <Pressable onPress={() => setStep(1)} style={{ alignItems: "center", padding: 10 }}>
              <Text style={{ fontFamily: fonts.bodySemi, color: "#6B6A78" }}>Back</Text>
            </Pressable>
          </>
        )}

        {step === 3 && (
          <>
            <DarkField value={area} onChangeText={setArea} placeholder="Area (e.g. Lusaka)" />
            <FaceCamera uri={photoUri} label="Your photo" facing="front" buttonLabel="Capture face" height={200} onCapture={(uri, b64) => { setPhotoUri(uri); setPhotoB64(b64); }} />
            <View style={{ backgroundColor: "#fff", borderRadius: 14, padding: 14, marginVertical: 12, borderWidth: 1, borderColor: "#E8DFD2" }}>
              <Text style={{ fontFamily: fonts.title, color: "#1C1B26" }}>{fullName}</Text>
              <Text style={{ fontFamily: fonts.body, color: "#6B6A78", marginTop: 4 }}>{phone} · {gender}</Text>
              <Text style={{ fontFamily: fonts.body, color: "#6B6A78" }}>{vehicle} · {docType}</Text>
              {area ? <Text style={{ fontFamily: fonts.body, color: "#6B6A78" }}>{area}</Text> : null}
            </View>
            <GoldButton label="Submit for review" onPress={submit} loading={loading} />
            <View style={{ height: 10 }} />
            <Pressable onPress={() => setStep(2)} style={{ alignItems: "center", padding: 10 }}>
              <Text style={{ fontFamily: fonts.bodySemi, color: "#6B6A78" }}>Back</Text>
            </Pressable>
          </>
        )}

        {step === 4 && (
          <View style={{ backgroundColor: "#fff", borderRadius: 16, padding: 18, borderWidth: 1, borderColor: "#E8DFD2" }}>
            <Text style={{ fontFamily: fonts.title, fontSize: 18, color: "#1C1B26" }}>Pending</Text>
            <Text style={{ fontFamily: fonts.body, color: "#6B6A78", marginTop: 8 }}>
              Your rider application is pending review. An admin will approve or reject it.
            </Text>
            <Text style={{ fontFamily: fonts.body, color: "#1C1B26", marginTop: 12 }}>NRC / {docType}: uploaded</Text>
            <Text style={{ fontFamily: fonts.body, color: "#1C1B26" }}>Area: {area || "—"}</Text>
            <Text style={{ fontFamily: fonts.body, color: "#1C1B26" }}>Vehicle: {vehicle}</Text>
            <View style={{ height: 16 }} />
            <GoldButton label="Done" onPress={() => router.replace("/(customer)")} />
          </View>
        )}
      </ScrollView>
    </DarkScreen>
  );
}

function chip(on: boolean) {
  return {
    flex: 1,
    borderRadius: radius.md,
    padding: 14,
    borderWidth: 2,
    borderColor: on ? colors.gold : "#E8DFD2",
    backgroundColor: on ? "#FFF8E1" : "#FFFFFF",
    alignItems: "center" as const,
  };
}
function chipText(on: boolean) {
  return { color: "#1C1B26", fontFamily: fonts.title, textAlign: "center" as const };
}

const box = {
  borderWidth: 1,
  borderStyle: "dashed" as const,
  borderColor: "#C8C6D0",
  borderRadius: 14,
  backgroundColor: "#F7F7FA",
  minHeight: 140,
  alignItems: "center" as const,
  justifyContent: "center" as const,
  marginBottom: 12,
  padding: 16,
};
