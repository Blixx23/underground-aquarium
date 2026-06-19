import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, ListChecks } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import PointListEditor from "./PointListEditor";

type Species = {
  id: string;
  program: string;
  common_name: string;
  scientific_name: string | null;
  category: string | null;
  points: number;
  is_active: boolean;
};

export default async function PointListPage({
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
            href={`/c/${slug}/awards`}
            className="inline-flex items-center gap-2 text-sm text-ocean-400 hover:text-white transition-colors mb-6"
          >
            <ArrowLeft className="w-4 h-4" /> Back to awards
          </Link>
          <div className="rounded-2xl border border-ocean-800/60 bg-ocean-900/40 px-6 py-8 text-center">
            <p className="text-ocean-300">This page is for club officers.</p>
          </div>
        </div>
      </main>
    );
  }

  const { data } = await supabase
    .from("club_award_species")
    .select("id, program, common_name, scientific_name, category, points, is_active")
    .eq("club_id", club.id)
    .order("program", { ascending: true })
    .order("category", { ascending: true })
    .order("common_name", { ascending: true });
  const species: Species[] = data ?? [];

  return (
    <main className="min-h-screen pt-28 pb-20 px-6">
      <div className="max-w-3xl mx-auto">
        <Link
          href={`/c/${slug}/awards`}
          className="inline-flex items-center gap-2 text-sm text-ocean-400 hover:text-white transition-colors mb-6"
        >
          <ArrowLeft className="w-4 h-4" /> Back to awards
        </Link>

        <div className="flex items-center gap-3 mb-2">
          <ListChecks className="w-7 h-7 text-amber-300" />
          <h1 className="font-display text-3xl text-white leading-tight">
            Point list
          </h1>
        </div>
        <p className="text-ocean-300 mb-8">
          Set the point values for {club.name}. Changes apply to new submissions
          — already-approved entries keep the points they were awarded, so no
          one&apos;s total changes when you retune the list.
        </p>

        <PointListEditor clubId={club.id} initialSpecies={species} />
      </div>
    </main>
  );
}
