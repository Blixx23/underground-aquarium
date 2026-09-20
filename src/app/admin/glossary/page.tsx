import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { ShieldAlert } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import GlossaryQueue, { type PendingTerm } from "./GlossaryQueue";

export const metadata: Metadata = { title: "Admin · Glossary suggestions" };

export const dynamic = "force-dynamic";

export default async function AdminGlossaryPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: me } = await supabase.from("profiles").select("is_admin").eq("id", user.id).maybeSingle();
  if (!me?.is_admin) {
    return (
      <main className="min-h-screen px-6 pb-20 pt-28">
        <div className="mx-auto max-w-md py-20 text-center">
          <ShieldAlert className="mx-auto mb-4 h-10 w-10 text-ocean-600" />
          <h1 className="mb-2 font-display text-2xl text-white">Admins only</h1>
        </div>
      </main>
    );
  }

  const { data } = await supabase.rpc("pending_glossary_suggestions");

  return (
    <main className="min-h-screen px-6 pb-20 pt-28">
      <div className="mx-auto max-w-3xl">
        <h1 className="mb-1 font-display text-3xl text-white">Glossary suggestions</h1>
        <p className="mb-8 text-ocean-400">
          Terms the community has suggested. Tidy the wording if needed, then add it or dismiss it.
          Adding one puts it in the glossary straight away and credits the person who suggested it.
        </p>
        <GlossaryQueue initial={(data ?? []) as PendingTerm[]} />
      </div>
    </main>
  );
}
