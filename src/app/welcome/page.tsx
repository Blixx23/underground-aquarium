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

  // "Hide My Email" with Apple gives a random address (g9ymvvjpyg@privaterelay…),
  // and the starting username came from it. Suggest one from their name
  // instead, with two digits added if someone already has it.
  let suggested = profile.username ?? "";
  if (/@privaterelay\.appleid\.com$/i.test(user.email ?? "")) {
    const fromName = (profile.full_name ?? "")
      .normalize("NFKD")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "_")
      .replace(/^_+|_+$/g, "")
      .slice(0, 20);
    if (fromName.length >= 3) {
      const { data: taken } = await supabase
        .from("profiles")
        .select("id")
        .ilike("username", fromName)
        .neq("id", user.id)
        .maybeSingle();
      suggested = taken ? `${fromName}${Math.floor(10 + Math.random() * 90)}` : fromName;
    }
  }

  return (
    <WelcomeForm
      suggested={suggested}
      firstName={firstName}
      next={goTo}
    />
  );
}
