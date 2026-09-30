import { createClient } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";

/**
 * Can the person making this request see a shop that's hidden from the
 * directory? Only its owner and site admins can. Everyone else, search
 * engines and link previews included, gets a normal "not found".
 */
export async function canSeeHiddenShop(claimedBy: string | null): Promise<boolean> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return false;
    if (claimedBy && claimedBy === user.id) return true;
    const { data } = await supabaseAdmin.from("profiles").select("is_admin").eq("id", user.id).maybeSingle();
    return Boolean((data as { is_admin?: boolean } | null)?.is_admin);
  } catch {
    return false;
  }
}
