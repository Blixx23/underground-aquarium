import type { Metadata } from "next";
import { redirect } from "next/navigation";
import Link from "next/link";
import { ShieldAlert } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import AdminSpeciesList, { type QueueSuggestion, type LibraryFish } from "./AdminSpeciesList";

export const metadata: Metadata = { title: "Admin · Species requests" };

export const dynamic = "force-dynamic";

const words = (s: string) =>
  s
    .toLowerCase()
    .replace(/[^a-z0-9 ]+/g, " ")
    .split(/\s+/)
    .filter((w) => w.length > 2 && !["fish", "the", "and"].includes(w));

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

  const [{ data: rows }, { data: lib }] = await Promise.all([
    supabaseAdmin
      .from("species_suggestions")
      .select("id, suggester_id, common_name, scientific_name, note, created_at")
      .eq("status", "pending")
      .order("created_at", { ascending: true }),
    supabaseAdmin
      .from("species")
      .select("slug, common_name, scientific_name, also_known_as, group_name")
      .order("common_name")
      .range(0, 4999),
  ]);

  const list = rows ?? [];
  const library = (lib ?? []) as LibraryFish[];
  const groups = [...new Set(library.map((f) => f.group_name).filter((g): g is string => !!g))].sort();

  const ids = [...new Set(list.map((r) => r.suggester_id as string | null).filter((x): x is string => !!x))];
  const who = new Map<string, { username: string | null; full_name: string | null }>();
  if (ids.length > 0) {
    const { data: profs } = await supabaseAdmin.from("profiles").select("id, username, full_name").in("id", ids);
    for (const p of profs ?? []) who.set(p.id as string, { username: p.username, full_name: p.full_name });
  }

  const queue: QueueSuggestion[] = list.map((r) => {
    const sid = r.suggester_id as string | null;
    // Fish already in the library that share words with the request, so an
    // admin can spot "that's just another name for X" at a glance.
    const reqWords = new Set([...words(r.common_name as string), ...words((r.scientific_name as string) ?? "")]);
    const matches = library
      .map((f) => {
        const hay = [f.common_name, f.scientific_name ?? "", ...(f.also_known_as ?? [])].join(" ");
        const score = words(hay).filter((w) => reqWords.has(w)).length;
        return { f, score };
      })
      .filter((m) => m.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, 5)
      .map((m) => ({ slug: m.f.slug, common_name: m.f.common_name }));
    return {
      id: r.id as string,
      common_name: r.common_name as string,
      scientific_name: (r.scientific_name as string | null) ?? null,
      note: (r.note as string | null) ?? null,
      created_at: (r.created_at as string | null) ?? null,
      suggester_username: sid ? who.get(sid)?.username ?? null : null,
      suggester_name: sid ? who.get(sid)?.full_name ?? null : null,
      matches,
    };
  });

  return (
    <main className="min-h-screen px-6 pb-20 pt-28 font-sans">
      <div className="mx-auto max-w-3xl">
        <h1 className="mb-1 font-display text-3xl text-white">Species requests</h1>
        <p className="mb-8 text-ocean-300">
          Fish the community asked for. <strong className="text-white">Add to library</strong> creates the care page and
          puts it in the Tank Builder. <strong className="text-white">Another name for</strong> adds their name to a fish
          we already have. Both give the requester 25 bubbles and count toward their species trophies.{" "}
          <Link href="/species" target="_blank" className="text-emerald-400 hover:text-emerald-300">
            Open the species list
          </Link>
          .
        </p>
        <AdminSpeciesList initialSuggestions={queue} groups={groups} library={library} />
      </div>
    </main>
  );
}
