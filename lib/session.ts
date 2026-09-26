import { isSupabaseConfigured, supabase } from "@/lib/supabase";
import { clearPreviewSession, getPreviewSession } from "@/lib/preview";

export async function currentProfile() {
  const preview = await getPreviewSession();
  if (preview) {
    return {
      user: { id: "preview-user", phone: preview.phone },
      profile: { user_id: "preview-user", phone: preview.phone, full_name: "Guest" },
      rider:
        preview.mode === "rider"
          ? {
              id: "preview-rider",
              user_id: "preview-user",
              status: "APPROVED",
              vehicle_type: "motorbike",
              full_name: "Guest rider",
              is_online: true,
            }
          : null,
      admin: false,
      preview: true,
    };
  }

  if (!isSupabaseConfigured) {
    return { user: null, profile: null, rider: null, admin: false, preview: false };
  }
  try {
    const { data: auth } = await supabase.auth.getUser();
    if (!auth.user) return { user: null, profile: null, rider: null, admin: false, preview: false };
    const [{ data: profile }, { data: rider }, { data: admin }] = await Promise.all([
      supabase.from("profiles").select("*").eq("user_id", auth.user.id).maybeSingle(),
      supabase.from("riders").select("*").eq("user_id", auth.user.id).maybeSingle(),
      supabase.from("platform_admins").select("user_id").eq("user_id", auth.user.id).maybeSingle(),
    ]);
    return { user: auth.user, profile, rider, admin: !!admin, preview: false };
  } catch {
    return { user: null, profile: null, rider: null, admin: false, preview: false };
  }
}

export async function signOutApp() {
  await clearPreviewSession();
  if (isSupabaseConfigured) {
    try {
      await supabase.auth.signOut();
    } catch {
      /* ignore */
    }
  }
}
