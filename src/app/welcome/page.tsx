import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { safeNext } from "@/lib/safeNext";
import WelcomeForm from "./WelcomeForm";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "Welcome" };

/**
 * First stop for a new Google account: pick a username and accept the
 * terms. Anyone who already has a chosen username goes straight on.
 */
export default async function WelcomePage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const { next } = await searchParams;
  const goTo = safeNext(next, "/feed");

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect(`/login?next=${encodeURIComponent("/welcome")}`);

  const { data: profile } = await supabase
    .from("profiles")
    .select("username, full_name, needs_username")
    .eq("id", user.id)
    .maybeSingle();

  if (!profile?.needs_username) redirect(goTo);

  const firstName = (profile.full_name ?? "").trim().split(/\s+/)[0] || null;

  return (
    <WelcomeForm
      suggested={profile.username ?? ""}
      firstName={firstName}
      next={goTo}
    />
  );
}
