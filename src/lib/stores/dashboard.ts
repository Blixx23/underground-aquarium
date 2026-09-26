import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Dashboard } from "@/components/stores/ShopDashboard";

/** The shop's numbers for Overview and Insights, or null if they couldn't load. */
export async function loadShopDashboard(supabase: SupabaseClient, storeId: string): Promise<Dashboard | null> {
  const { data, error } = await supabase.rpc("shop_dashboard", { p_store: storeId });
  const dash = (data ?? null) as Dashboard | null;
  if (error || !dash || !Array.isArray(dash.daily)) return null;
  return dash;
}
