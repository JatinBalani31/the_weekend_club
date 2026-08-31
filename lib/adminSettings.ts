import { getSupabaseAdminClient } from "@/lib/supabase";

export type AdminSettings = {
  totp_secret: string | null;
  totp_enabled: boolean;
};

export async function getAdminSettings(): Promise<AdminSettings | null> {
  const supabase = getSupabaseAdminClient();
  if (!supabase) return null;

  const { data, error } = await supabase.from("admin_settings").select("totp_secret, totp_enabled").eq("id", true).maybeSingle();
  if (error) {
    console.error("Unable to load admin settings", error);
    return null;
  }
  return data as AdminSettings | null;
}

export async function saveAdminTotpSecret(secret: string) {
  const supabase = getSupabaseAdminClient();
  if (!supabase) return false;

  const { error } = await supabase.from("admin_settings").update({ totp_secret: secret, updated_at: new Date().toISOString() }).eq("id", true);
  if (error) {
    console.error("Unable to save admin TOTP secret", error);
    return false;
  }
  return true;
}

export async function enableAdminTotp() {
  const supabase = getSupabaseAdminClient();
  if (!supabase) return false;

  const { error } = await supabase.from("admin_settings").update({ totp_enabled: true, updated_at: new Date().toISOString() }).eq("id", true);
  if (error) {
    console.error("Unable to enable admin TOTP", error);
    return false;
  }
  return true;
}
