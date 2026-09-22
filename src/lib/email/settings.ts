import "server-only";
import { supabaseAdmin } from "@/lib/supabase/admin";

export type EmailSettings = {
  paused: boolean;
  bulk_paused: boolean;
  daily_bulk_cap: number;
};

/**
 * The kill switch lives in the database, not an env var, so pausing is
 * instant and doesn't need a redeploy. If the row can't be read we fail
 * SAFE and treat everything as paused: better a delay than a blast we
 * meant to stop.
 */
export async function getEmailSettings(): Promise<EmailSettings> {
  const { data, error } = await supabaseAdmin
    .from("email_settings")
    .select("paused, bulk_paused, daily_bulk_cap")
    .eq("id", true)
    .maybeSingle();
  if (error || !data) return { paused: true, bulk_paused: true, daily_bulk_cap: 0 };
  return data as EmailSettings;
}

export async function setEmailSettings(patch: Partial<EmailSettings>, byUserId?: string) {
  const { error } = await supabaseAdmin
    .from("email_settings")
    .update({ ...patch, updated_at: new Date().toISOString(), updated_by: byUserId ?? null })
    .eq("id", true);
  if (error) throw new Error(error.message);
}
