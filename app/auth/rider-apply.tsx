import { useEffect, useState } from "react";
import { Alert, Pressable, ScrollView, StyleSheet, Text, View, Image } from "react-native";
import * as ImagePicker from "expo-image-picker";
import { router } from "expo-router";
import { MkField, MkHeader, MkScreen } from "@/components/mk";
import { SpinPressable } from "@/components/spin-pressable";
import { confirmDialog } from "@/components/confirm";
import Svg, { Circle } from "react-native-svg";
import { FaceCamera } from "@/components/face-camera";
import { isSupabaseConfigured, supabase } from "@/lib/supabase";
import { currentProfile } from "@/lib/session";
import { savePreviewRiderApplication } from "@/lib/preview";
import { uploadBase64 } from "@/lib/upload";
import { fonts, ui } from "@/lib/theme";

export default function RiderApply() {
  const [step, setStep] = useState(1);
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [gender, setGender] = useState<"Male" | "Female" | "">("");
  const [vehicle, setVehicle] = useState<"bicycle" | "motorbike">("bicycle");
  const [area, setArea] = useState("");
  const [docType, setDocType] = useState<"NRC" | "Licence" | "Passport">("NRC");
  const [front, setFront] = useState<string | null>(null);
  const [frontB64, setFrontB64] = useState<string | undefined>();
  const [back, setBack] = useState<string | null>(null);
  const [backB64, setBackB64] = useState<string | undefined>();
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [photoB64, setPhotoB64] = useState<string | undefined>();
  const [loading, setLoading] = useState(false);
  const [preview, setPreview] = useState(false);
  const [done, setDone] = useState(false);
  const [existing, setExisting] = useState<any>(null);
  const [reapply, setReapply] = useState(false);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    currentProfile()
      .then(({ preview: isPreview, rider }) => {
        setPreview(!!isPreview);
        if (rider?.status === "APPROVED") {
          router.replace("/(rider)");
          return;
        }
        if (rider) setExisting(rider);
      })
      .catch(() => {})
      .finally(() => setChecking(false));
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
      ? await ImagePicker.launchCameraAsync({ quality: 0.3, base64: true })
      : await ImagePicker.launchImageLibraryAsync({ quality: 0.3, base64: true });
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
        // Upload all three photos at the same time instead of one after another.
        const [p1, p2, p3] = await Promise.all([
          photoB64 ? uploadBase64("riders", photoB64, "image/jpeg") : Promise.resolve(null),
          frontB64 ? uploadBase64("riders", frontB64, "image/jpeg") : Promise.resolve(null),
          backB64 ? uploadBase64("riders", backB64, "image/jpeg") : Promise.resolve(null),
        ]);
        if (p1) photoUrl = p1;
        if (p2) frontUrl = p2;
        if (p3) backUrl = p3;
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
        // Riders cannot write to the table directly (security rules). apply_rider saves it safely.
        const { error } = await supabase.rpc("apply_rider", {
          p_full_name: fullName.trim(),
          p_phone: phone.trim(),
          p_address: area.trim(),
          p_vehicle: vehicle,
          p_licence: packed,
          p_ownership: "",
          p_licence_front: frontUrl,
          p_licence_back: backUrl,
          p_photo: photoUrl,
        });
        if (error) throw error;
      }
      setDone(true);
      setStep(4);
    } catch (e: any) {
      const raw = String(e?.message || "");
      let msg = raw || "Try again.";
      if (/row-level security|violates/i.test(raw)) msg = "Photo upload was not allowed. Ask the admin to finish the rider setup in Supabase, then try again.";
      else if (/apply_rider|schema cache|does not exist/i.test(raw)) msg = "The rider form is not set up in the database yet. Ask the admin to run the rider setup SQL.";
      else if (/network|fetch/i.test(raw)) msg = "No internet. Check your connection and try again.";
      Alert.alert("Could not submit", msg);
    } finally {
      setLoading(false);
    }
  }

  const progress = step === 1 ? 0 : step === 2 ? 33 : step === 3 ? 66 : 100;
  const canContinue2 = !!front && !!back;
  const DOCS = [
    { id: "Licence", label: "Driver's licence" },
    { id: "NRC", label: "National Registration Card" },
    { id: "Passport", label: "International passport" },
  ] as const;
  const docLabel = DOCS.find((d) => d.id === docType)?.label || docType;

  function leave() {
    if (step === 2) return setStep(1);
    if (step === 3) return setStep(2);
    router.back();
  }

  // Someone who already applied sees the status of that application, not an empty form.
  if (checking) {
    return (
      <MkScreen>
        <MkHeader title="Rider application" onBack={() => router.back()} />
      </MkScreen>
    );
  }
  if (existing && !reapply && step !== 4) {
    const st = String(existing.status || "PENDING").toUpperCase();
    const firstLine = String(existing.licence_info || "").split("\n")[0];
    const idLabel =
      firstLine === "NRC" ? "National Registration Card" : firstLine === "Licence" ? "Driver's licence" : firstLine === "Passport" ? "International passport" : "";
    const title = st === "REJECTED" ? "Application not approved" : st === "SUSPENDED" ? "Account suspended" : "Application pending";
    const sub =
      st === "REJECTED"
        ? "You can apply again"
        : st === "SUSPENDED"
        ? "Please contact support"
        : "An admin is reviewing it";
    const statusLabel = st === "REJECTED" ? "Not approved" : st === "SUSPENDED" ? "Suspended" : "Pending review";
    return (
      <MkScreen>
        <MkHeader title="Rider application" onBack={() => router.back()} />
        <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 24 }}>
          <View style={s.card}>
            <View style={s.cardHead}>
              <View style={{ flex: 1, paddingRight: 12 }}>
                <Text style={s.cardTitle}>{title}</Text>
                <Text style={s.cardSub}>{sub}</Text>
              </View>
              <ProgressRing percent={100} />
            </View>
            <View style={s.divider} />
            <View style={s.summary}>
              <SummaryRow label="Status" value={statusLabel} />
              {idLabel ? <SummaryRow label="ID" value={`${idLabel} uploaded`} /> : null}
              <SummaryRow label="Area" value={existing.address_text || "—"} />
              <SummaryRow label="Vehicle" value={existing.vehicle_type || "—"} last />
            </View>
          </View>
        </ScrollView>
        <View style={s.footer}>
          {st === "REJECTED" ? (
            <Continue label="Apply again" onPress={() => setReapply(true)} />
          ) : (
            <Continue label="Done" onPress={() => router.replace("/(customer)")} />
          )}
        </View>
      </MkScreen>
    );
  }

  return (
    <MkScreen>
      <MkHeader title="Rider application" onBack={step === 4 ? () => router.replace("/(customer)") : leave} />
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 24 }} keyboardShouldPersistTaps="handled">
        <View style={s.card}>
          <View style={s.cardHead}>
            <View style={{ flex: 1, paddingRight: 12 }}>
              <Text style={s.cardTitle}>
                {step === 1 ? "Your details" : step === 2 ? "Means of ID" : step === 3 ? "Photo and area" : "Application sent"}
              </Text>
              <Text style={s.cardSub}>
                {step === 1
                  ? "Tell us who you are"
                  : step === 2
                  ? "Provide us with a valid means of ID"
                  : step === 3
                  ? "Take a clear photo of your face"
                  : "An admin will review it"}
              </Text>
            </View>
            <ProgressRing percent={progress} />
          </View>
          <View style={s.divider} />

          {step === 1 && (
            <>
              <MkField value={fullName} onChangeText={setFullName} placeholder="Full name" />
              <MkField value={phone} onChangeText={setPhone} placeholder="Mobile number" keyboardType="phone-pad" />
              <Text style={s.group}>Gender</Text>
              <View style={s.chips}>
                {(["Male", "Female"] as const).map((g) => (
                  <Pressable key={g} onPress={() => setGender(g)} style={[s.chip, gender === g && s.chipOn]}>
                    <Text style={[s.chipText, gender === g && { color: "#fff" }]}>{g}</Text>
                  </Pressable>
                ))}
              </View>
              <Text style={s.group}>Vehicle</Text>
              <View style={s.chips}>
                {(["bicycle", "motorbike"] as const).map((v) => (
                  <Pressable key={v} onPress={() => setVehicle(v)} style={[s.chip, vehicle === v && s.chipOn]}>
                    <Text style={[s.chipText, vehicle === v && { color: "#fff" }]}>{v === "bicycle" ? "Bicycle" : "Motorbike"}</Text>
                  </Pressable>
                ))}
              </View>
            </>
          )}

          {step === 2 && (
            <>
              <View style={{ paddingHorizontal: 8, paddingTop: 6 }}>
                {DOCS.map((d) => (
                  <Pressable key={d.id} onPress={() => setDocType(d.id)} style={s.radioRow}>
                    <View style={[s.radio, docType === d.id && s.radioOn]}>
                      {docType === d.id ? <View style={s.radioDot} /> : null}
                    </View>
                    <Text style={s.radioLabel}>{d.label}</Text>
                  </Pressable>
                ))}
              </View>
              <Text style={s.selectTitle}>Select document to upload</Text>
              <UploadBox label="Front page" uri={front} onPress={() => chooseDoc("front")} />
              <UploadBox label="Back page" uri={back} onPress={() => chooseDoc("back")} />
            </>
          )}

          {step === 3 && (
            <>
              <MkField value={area} onChangeText={setArea} placeholder="Area (e.g. Lusaka)" />
              <FaceCamera uri={photoUri} label="Your photo" facing="front" buttonLabel="Capture face" height={200} onCapture={(uri, b64) => { setPhotoUri(uri); setPhotoB64(b64); }} />
              <View style={s.summary}>
                <SummaryRow label="Name" value={fullName} />
                <SummaryRow label="Phone" value={phone} />
                <SummaryRow label="Gender" value={gender} />
                <SummaryRow label="Vehicle" value={vehicle} />
                <SummaryRow label="ID" value={docLabel} />
                {area ? <SummaryRow label="Area" value={area} last /> : null}
              </View>
            </>
          )}

          {step === 4 && (
            <View style={s.summary}>
              <SummaryRow label="Status" value="Pending review" />
              <SummaryRow label="ID" value={`${docLabel} uploaded`} />
              <SummaryRow label="Area" value={area || "—"} />
              <SummaryRow label="Vehicle" value={vehicle} last />
            </View>
          )}
        </View>
      </ScrollView>

      <View style={s.footer}>
        {step === 1 && <Continue label="Continue" onPress={nextFromStep1} disabled={!fullName.trim() || !phone.trim() || !gender} />}
        {step === 2 && <Continue label="Continue" onPress={nextFromStep2} disabled={!canContinue2} />}
        {step === 3 && <Continue label="Submit for review" onPress={submit} loading={loading} disabled={!photoUri} />}
        {step === 4 && <Continue label="Done" onPress={() => router.replace("/(customer)")} />}
      </View>
    </MkScreen>
  );
}

function Continue({ label, onPress, disabled, loading }: { label: string; onPress: () => void | Promise<unknown>; disabled?: boolean; loading?: boolean }) {
  return (
    <SpinPressable
      onPress={onPress}
      disabled={disabled}
      loading={loading}
      spinnerColor="#fff"
      style={[s.cont, disabled ? s.contOff : s.contOn]}
    >
      <Text style={s.contText}>{label}</Text>
    </SpinPressable>
  );
}

function UploadBox({ label, uri, onPress }: { label: string; uri: string | null; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={s.upload}>
      {uri ? (
        <>
          <Image source={{ uri }} style={{ width: "100%", height: 150, borderRadius: 10 }} resizeMode="cover" />
          <Text style={s.change}>Change {label.toLowerCase()}</Text>
        </>
      ) : (
        <>
          <Text style={s.uploadLink}>{label}</Text>
          <Text style={s.uploadSub}>Tap to take a photo or choose one</Text>
        </>
      )}
    </Pressable>
  );
}

function SummaryRow({ label, value, last }: { label: string; value?: string; last?: boolean }) {
  return (
    <View style={[s.sumRow, !last && s.sumRule]}>
      <Text style={s.sumLabel}>{label}</Text>
      <Text style={s.sumValue}>{value || "—"}</Text>
    </View>
  );
}

function ProgressRing({ percent }: { percent: number }) {
  const size = 46;
  const sw = 4;
  const r = (size - sw) / 2;
  const c = 2 * Math.PI * r;
  return (
    <View style={{ width: size, height: size, alignItems: "center", justifyContent: "center" }}>
      <Svg width={size} height={size} style={{ position: "absolute", transform: [{ rotate: "-90deg" }] }}>
        <Circle cx={size / 2} cy={size / 2} r={r} stroke="#EEEEF2" strokeWidth={sw} fill="none" />
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          stroke={ui.red}
          strokeWidth={sw}
          strokeLinecap="round"
          fill="none"
          strokeDasharray={`${(c * percent) / 100} ${c}`}
        />
      </Svg>
      <Text style={s.pct}>{percent}%</Text>
    </View>
  );
}

const s = StyleSheet.create({
  card: { borderWidth: 1, borderColor: ui.line, borderRadius: 18, backgroundColor: "#fff", padding: 18 },
  cardHead: { flexDirection: "row", alignItems: "center" },
  cardTitle: { fontFamily: fonts.display, fontSize: 24, color: ui.ink, letterSpacing: -0.4 },
  cardSub: { fontFamily: fonts.body, fontSize: 15, color: ui.sub, marginTop: 6 },
  divider: { height: 1, backgroundColor: ui.line, marginVertical: 16 },
  pct: { fontFamily: fonts.bodySemi, fontSize: 11.5, color: ui.sub },
  group: { fontFamily: fonts.title, fontSize: 15, color: ui.ink, marginTop: 4, marginBottom: 10 },
  chips: { flexDirection: "row", gap: 10, marginBottom: 14 },
  chip: { flex: 1, height: 48, borderRadius: 14, borderWidth: 1, borderColor: ui.line, backgroundColor: "#fff", alignItems: "center", justifyContent: "center" },
  chipOn: { backgroundColor: ui.red, borderColor: ui.red },
  chipText: { fontFamily: fonts.title, fontSize: 15, color: ui.ink },
  radioRow: { flexDirection: "row", alignItems: "center", gap: 14, paddingVertical: 12 },
  radio: { width: 24, height: 24, borderRadius: 12, borderWidth: 2, borderColor: "#D5D5DC", alignItems: "center", justifyContent: "center" },
  radioOn: { borderColor: ui.red },
  radioDot: { width: 12, height: 12, borderRadius: 6, backgroundColor: ui.red },
  radioLabel: { fontFamily: fonts.bodySemi, fontSize: 17, color: ui.ink },
  selectTitle: { fontFamily: fonts.title, fontSize: 18, color: ui.ink, textAlign: "center", marginTop: 14, marginBottom: 16 },
  upload: {
    borderWidth: 1.5,
    borderStyle: "dashed",
    borderColor: "#CFCFD8",
    borderRadius: 14,
    backgroundColor: "#FAFAFC",
    minHeight: 150,
    alignItems: "center",
    justifyContent: "center",
    padding: 14,
    marginBottom: 14,
  },
  uploadLink: { fontFamily: fonts.title, fontSize: 18, color: ui.red },
  uploadSub: { fontFamily: fonts.body, fontSize: 15, color: ui.sub, marginTop: 6 },
  change: { fontFamily: fonts.bodySemi, fontSize: 14, color: ui.red, marginTop: 10 },
  summary: { borderWidth: 1, borderColor: ui.line, borderRadius: 14, paddingHorizontal: 14, marginTop: 14 },
  sumRow: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 13, gap: 16 },
  sumRule: { borderBottomWidth: 1, borderBottomColor: ui.line },
  sumLabel: { fontFamily: fonts.body, fontSize: 14.5, color: ui.sub },
  sumValue: { fontFamily: fonts.bodySemi, fontSize: 14.5, color: ui.ink, flexShrink: 1, textAlign: "right", textTransform: "capitalize" },
  footer: { paddingHorizontal: 16, paddingTop: 10, paddingBottom: 14, backgroundColor: "#fff", borderTopWidth: 1, borderTopColor: ui.line },
  cont: { height: 54, borderRadius: 14, alignItems: "center", justifyContent: "center" },
  contOn: { backgroundColor: ui.red },
  contOff: { backgroundColor: "#B9BAC8", opacity: 1 },
  contText: { fontFamily: fonts.title, fontSize: 16, color: "#fff" },
});
