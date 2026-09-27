import { redirect, notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";

export type OwnedStore = {
  id: string;
  name: string;
  slug: string;
  address: string | null;
  city: string | null;
  state: string | null;
  phone: string | null;
  website: string | null;
  hours: string | null;
  description: string | null;
  tags: string[] | null;
  claimed_by: string | null;
};

/**
 * Load a shop the signed-in person manages. Sends them to sign in if they
 * aren't, and 404s if the shop isn't theirs, so a guessed address gives
 * nothing away.
 */
export async function requireOwnedStore(slug: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect(`/login?next=/my/shops/${slug}`);

  // Read with the service client: a hidden shop may not be visible to the
  // signed-in user's own reads, and its owner or an admin still needs its
  // dashboard (the check below decides who gets in).
  const { data } = await supabaseAdmin
    .from("fish_stores")
    .select("id, name, slug, address, city, state, phone, website, hours, description, tags, claimed_by")
    .eq("slug", slug)
    .maybeSingle();
  const store = (data as OwnedStore | null) ?? null;

  if (!store) notFound();
  if (store.claimed_by !== user.id) {
    const { data: profile } = await supabase.from("profiles").select("is_admin").eq("id", user.id).maybeSingle();
    if (!profile?.is_admin) notFound();
  }

  return { store, supabase, user };
}
