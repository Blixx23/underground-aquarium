import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Send } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import SubmissionForm from "../SubmissionForm";

type AwardSpecies = {
  id: string;
  program: string;
  common_name: string;
  scientific_name: string | null;
  category: string | null;
  points: number;
};

export default async function AwardsSubmitPage({
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
  let status: string | null = null;
  if (user) {
    const { data: me } = await supabase
      .from("club_members")
      .select("role, status")
      .eq("club_id", club.id)
      .eq("user_id", user.id)
      .maybeSingle();
    role = me?.role ?? null;
    status = me?.status ?? null;
  }
  const isActiveMember = role !== null && status === "active";

  let species: AwardSpecies[] = [];
  if (isActiveMember) {
    const { data } = await supabase
      .from("club_award_species")
      .select("id, program, common_name, scientific_name, category, points")
      .eq("club_id", club.id)
      .eq("is_active", true)
      .order("category", { ascending: true })
      .order("common_name", { ascending: true });
    species = data ?? [];
  }

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
          <Send className="w-7 h-7 text-emerald-300" />
          <h1 className="font-display text-3xl text-white leading-tight">
            Submit an entry
          </h1>
        </div>
        <p className="text-ocean-300 mb-8">
          Bred a fish or propagated a plant? Submit it for award points. A club
          officer will review and approve it.
        </p>

        {isActiveMember ? (
          <SubmissionForm
            clubId={club.id}
            slug={slug}
            userId={user!.id}
            species={species}
          />
        ) : (
          <div className="rounded-2xl border border-ocean-800/60 bg-ocean-900/40 px-6 py-8 text-center">
            <p className="text-ocean-300 mb-4">
              {user
                ? `You need to be an active member of ${club.name} to submit entries.`
                : `Sign in and join ${club.name} to submit entries.`}
            </p>
            <Link
              href={`/c/${slug}`}
              className="inline-flex items-center gap-2 rounded-full bg-ocean-700 px-5 py-2.5 text-sm font-medium text-white hover:bg-ocean-600 transition-colors"
            >
              Go to {club.name}
            </Link>
          </div>
        )}
      </div>
    </main>
  );
}
