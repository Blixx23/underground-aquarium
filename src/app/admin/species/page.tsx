import type { Metadata } from "next";
import { redirect } from "next/navigation";
import Link from "next/link";
import { ShieldAlert } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import AdminSpeciesList, { type QueueSuggestion, type LibraryFish } from "./AdminSpeciesList";
import { findCandidates, loadLibrary } from "@/lib/species/library";
import type { AiReview } from "@/lib/species/fields";

export const metadata: Metadata = { title: "Admin · Species requests" };

export const dynamic = "force-dynamic";

export default async function AdminSpeciesPage() {
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
          <p className="text-ocean-400">You don&apos;t have permission to view this page.</p>
        </div>
      </main>
    );
  }

  const [{ data: rows }, fullLibrary] = await Promise.all([
    supabaseAdmin
      .from("species_suggestions")
      .select("*")
      .eq("status", "pending")
      .order("created_at", { ascending: true }),
    loadLibrary(),
  ]);

  const list = (rows ?? []) as Record<string, unknown>[];
  const library: LibraryFish[] = fullLibrary.map((e) => ({
    slug: e.slug,
    common_name: e.common_name,
    scientific_name: e.scientific_name,
    also_known_as: e.also_known_as,
    group_name: e.group_name,
  }));
  const groups = [...new Set(library.map((f) => f.group_name).filter((g): g is string => !!g))].sort();

  const ids = [...new Set(list.map((r) => r.suggester_id as string | null).filter((x): x is string => !!x))];
  const who = new Map<string, { username: string | null; full_name: string | null }>();
  if (ids.length > 0) {
    const { data: profs } = await supabaseAdmin.from("profiles").select("id, username, full_name").in("id", ids);
    for (const p of profs ?? []) who.set(p.id as string, { username: p.username, full_name: p.full_name });
  }

  const queue: QueueSuggestion[] = list.map((r) => {
    const sid = r.suggester_id as string | null;
    // Fish already in the library that could be what they meant (plurals,
    // genus, group and hobby nicknames all count), so "Corydora" finds the
    // cory cats even before the AI check finishes.
    const matches = findCandidates(fullLibrary, {
      common_name: r.common_name as string,
      scientific_name: (r.scientific_name as string | null) ?? null,
    }, 6).map((m) => ({ slug: m.entry.slug, common_name: m.entry.common_name }));
    return {
      id: r.id as string,
      common_name: r.common_name as string,
      scientific_name: (r.scientific_name as string | null) ?? null,
      note: (r.note as string | null) ?? null,
      created_at: (r.created_at as string | null) ?? null,
      suggester_username: sid ? who.get(sid)?.username ?? null : null,
      suggester_name: sid ? who.get(sid)?.full_name ?? null : null,
      matches,
      ai: (r.ai_review as AiReview | null | undefined) ?? null,
    };
  });

  return (
    <main className="min-h-screen px-6 pb-20 pt-28 font-sans">
      <div className="mx-auto max-w-3xl">
        <h1 className="mb-1 font-display text-3xl text-white">Species requests</h1>
        <p className="mb-6 text-ocean-200">
          Fish and other animals members asked us to add. For each one, the AI checks the whole library and recommends what to do.
          You make the call.{" "}
          <Link href="/species" target="_blank" className="text-emerald-400 hover:text-emerald-300">
            Open the species list
          </Link>
        </p>
        <ol className="mb-8 grid gap-3 rounded-2xl border border-ocean-800/60 bg-ocean-900/40 p-4 text-sm text-ocean-100 sm:grid-cols-3">
          {[
            "Read the green We recommend box on a request.",
            "Press its green button, or open one of the three options yourself. Nothing is saved yet.",
            "Check the form, then press the button at the bottom of it. That's the only step that saves.",
          ].map((t, i) => (
            <li key={i} className="flex gap-2">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-ocean-800 text-xs font-semibold text-white">
                {i + 1}
              </span>
              <span>{t}</span>
            </li>
          ))}
        </ol>
        <AdminSpeciesList initialSuggestions={queue} groups={groups} library={library} />
      </div>
    </main>
  );
}
