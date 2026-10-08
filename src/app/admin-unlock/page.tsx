import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { safeNext } from "@/lib/safeNext";
import UnlockForm from "./UnlockForm";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Admin", robots: { index: false, follow: false } };

/** The admin password screen. Sits outside /admin so nothing in the admin area shows before unlocking. */
export default async function AdminUnlockPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const { next } = await searchParams;
  const goTo = safeNext(next, "/admin");

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect(`/login?next=${encodeURIComponent(`/admin-unlock?next=${goTo}`)}`);
  const { data: me } = await supabase.from("profiles").select("is_admin").eq("id", user.id).maybeSingle();
  if (!me?.is_admin) notFound();

  return (
    <main className="flex min-h-screen items-center justify-center px-4 pt-20">
      <UnlockForm next={goTo.startsWith("/admin") ? goTo : "/admin"} />
    </main>
  );
}
