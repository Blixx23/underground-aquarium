import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, ClipboardCheck } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import ReviewQueue from "./ReviewQueue";

type ReviewItem = {
  id: string;
  program: string;
  species_name: string;
  event_date: string | null;
  notes: string | null;
  photos: string[];
  created_at: string;
  submitter_name: string;
  suggested_points: number;
};

export default async function AwardsReviewPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: club } = await supabase
    .from("clubs")
    .select("id, name")
    .eq("slug", slug)
    .maybeSingle();
  if (!club) notFound();

  let role: string | null = null;
  if (user) {
    const { data: me } = await supabase
      .from("club_members")
      .select("role")
      .eq("club_id", club.id)
      .eq("user_id", user.id)
      .maybeSingle();
    role = me?.role ?? null;
  }
  const isOfficer = role === "owner" || role === "admin" || role === "officer";

  if (!isOfficer) {
    return (
      <main className="min-h-screen pt-28 pb-20 px-6">
        <div className="max-w-3xl mx-auto">
          <Link
            href={`/c/${slug}`}
            className="inline-flex items-center gap-2 text-sm text-ocean-400 hover:text-white transition-colors mb-6"
          >
            <ArrowLeft className="w-4 h-4" /> Back to {club.name}
          </Link>
          <div className="rounded-2xl border border-ocean-800/60 bg-ocean-900/40 px-6 py-8 text-center">
            <p className="text-ocean-300">This page is for club officers.</p>
          </div>
        </div>
      </main>
    );
  }

  const { data: subs } = await supabase
    .from("club_award_submissions")
    .select("id, program, species_id, species_name, event_date, notes, photos, created_at, user_id")
    .eq("club_id", club.id)
    .eq("status", "pending")
    .order("created_at", { ascending: true });

  const rows = subs ?? [];
  const userIds = Array.from(new Set(rows.map((r) => r.user_id)));
  const speciesIds = Array.from(
    new Set(rows.map((r) => r.species_id).filter((x): x is string => Boolean(x)))
  );

  const nameMap = new Map<string, string>();
  if (userIds.length) {
    const { data: mems } = await supabase
      .from("club_members")
      .select("user_id, display_name")
      .eq("club_id", club.id)
      .in("user_id", userIds);
    for (const m of mems ?? []) {
      if (m.user_id && m.display_name) nameMap.set(m.user_id, m.display_name);
    }
    const missing = userIds.filter((id) => !nameMap.has(id));
    if (missing.length) {
      const { data: profs } = await supabase
        .from("profiles")
        .select("id, username")
        .in("id", missing);
      for (const p of profs ?? []) {
        if (p.username) nameMap.set(p.id, p.username);
      }
    }
  }

  const pointMap = new Map<string, number>();
  if (speciesIds.length) {
    const { data: sp } = await supabase
      .from("club_award_species")
      .select("id, points")
      .in("id", speciesIds);
    for (const s of sp ?? []) pointMap.set(s.id, s.points);
  }

  const items: ReviewItem[] = rows.map((r) => ({
    id: r.id,
    program: r.program,
    species_name: r.species_name,
    event_date: r.event_date,
    notes: r.notes,
    photos: r.photos ?? [],
    created_at: r.created_at,
    submitter_name: nameMap.get(r.user_id) ?? "Member",
    suggested_points: r.species_id ? pointMap.get(r.species_id) ?? 0 : 0,
  }));

  return (
    <main className="min-h-screen pt-28 pb-20 px-6">
      <div className="max-w-3xl mx-auto">
        <Link
          href={`/c/${slug}`}
          className="inline-flex items-center gap-2 text-sm text-ocean-400 hover:text-white transition-colors mb-6"
        >
          <ArrowLeft className="w-4 h-4" /> Back to {club.name}
        </Link>

        <div className="flex items-center gap-3 mb-2">
          <ClipboardCheck className="w-7 h-7 text-emerald-300" />
          <h1 className="font-display text-3xl text-white leading-tight">
            Review submissions
          </h1>
        </div>
        <p className="text-ocean-300 mb-8">
          Confirm the points and approve, or reject with a reason. Members are
          notified either way.
        </p>

        <ReviewQueue items={items} />
      </div>
    </main>
  );
}
