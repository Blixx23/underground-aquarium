import type { ReactNode } from "react";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import AdminNav from "@/components/admin/AdminNav";
import { adminPending } from "@/lib/admin/pending";

export const dynamic = "force-dynamic";

/**
 * One gate and one frame for every /admin page. The pages keep their own
 * content; this takes over the outer spacing so they all line up with the
 * side nav, the same way the tools and shop areas work.
 */
export default async function AdminLayout({ children }: { children: ReactNode }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: me } = await supabase
    .from("profiles")
    .select("is_admin")
    .eq("id", user.id)
    .maybeSingle();
  if (!me?.is_admin) notFound();

  const pending = await adminPending();

  return (
    <div className="mx-auto max-w-7xl px-4 pb-20 pt-24 sm:px-6 lg:grid lg:grid-cols-[16rem_minmax(0,1fr)] lg:gap-10 lg:pt-28">
      <AdminNav pending={pending} />
      <div className="min-w-0 [&_main]:min-h-0 [&_main]:p-0 [&_main>div]:mx-0 [&_main>div]:max-w-none">
        {children}
      </div>
    </div>
  );
}
