import { isSupabaseConfigured, supabase } from "@/lib/supabase";

export async function currentProfile() {
  if (!isSupabaseConfigured) {
    return { user: null, profile: null, rider: null, admin: false };
  }
  try {
    const { data: auth } = await supabase.auth.getUser();
    if (!auth.user) return { user: null, profile: null, rider: null, admin: false };
    const [{ data: profile }, { data: rider }, { data: admin }] = await Promise.all([
      supabase.from("profiles").select("*").eq("user_id", auth.user.id).maybeSingle(),
      supabase.from("riders").select("*").eq("user_id", auth.user.id).maybeSingle(),
      supabase.from("platform_admins").select("user_id").eq("user_id", auth.user.id).maybeSingle(),
    ]);
    return { user: auth.user, profile, rider, admin: !!admin };
  } catch {
    return { user: null, profile: null, rider: null, admin: false };
  }
}
