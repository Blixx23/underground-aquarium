import type { Metadata } from "next";
import { supabaseAdmin } from "@/lib/supabase/admin";
import GuideDrafts, { type DraftGuide } from "./GuideDrafts";

export const metadata: Metadata = { title: "Admin · Breeding guides" };
export const dynamic = "force-dynamic";

/**
 * AI-drafted breeding guides waiting for Chris, and a way to draft one for any
 * species without a guide. The admin layout already checks is_admin.
 */
export default async function AdminBreedingGuidesPage() {
  const [{ data: drafts, error }, { data: guided }, { data: species }] = await Promise.all([
    supabaseAdmin
      .from("breeding_guides")
      .select("id, slug, species_slug, seo_title, summary, intro, facts, sections, faq, review_notes, drafted_at, draft_cost_cents")
      .eq("is_published", false)
      .order("drafted_at", { ascending: true })
      .limit(30),
    supabaseAdmin.from("breeding_guides").select("species_slug").not("species_slug", "is", null),
    supabaseAdmin.from("species").select("slug, common_name, entry_type").order("common_name").limit(3000),
  ]);

  const names = new Map((species ?? []).map((s) => [s.slug as string, s.common_name as string]));
  const has = new Set((guided ?? []).map((g) => g.species_slug as string));
  // Varieties show their parent's guide, so only full species need their own.
  const missing = (species ?? [])
    .filter((s) => !["variety", "form"].includes(String(s.entry_type ?? "")) && !has.has(s.slug as string))
    .map((s) => ({ slug: s.slug as string, name: s.common_name as string }));

  const list: DraftGuide[] = (drafts ?? []).map((d) => ({
    id: d.id as string,
    slug: d.slug as string,
    speciesSlug: (d.species_slug as string | null) ?? null,
    speciesName: names.get(d.species_slug as string) ?? (d.slug as string),
    seoTitle: d.seo_title as string,
    summary: d.summary as string,
    intro: d.intro as string,
    facts: (d.facts as Record<string, string>) ?? {},
    sections: (d.sections as { heading: string; text: string }[]) ?? [],
    faq: (d.faq as { q: string; a: string }[]) ?? [],
    reviewNotes: (d.review_notes as string | null) ?? null,
    draftedAt: (d.drafted_at as string | null) ?? null,
    costCents: Number(d.draft_cost_cents ?? 0),
  }));

  return (
    <div className="space-y-6">
      <div>
        <p className="font-mono text-[11px] uppercase tracking-widest text-amber-300/70">Admin</p>
        <h1 className="font-display text-3xl text-white">Breeding guides</h1>
        <p className="mt-1 max-w-2xl text-sm text-ocean-400">
          When a new species is added, the AI writes its breeding guide and a second pass fact-checks it, the same way the
          original guides were made. Read it, edit anything, then answer: Yes publishes it, No throws it out, Something else
          has it rewritten with your note. Varieties don&apos;t need one; their pages show the parent&apos;s guide.
        </p>
      </div>
      {error ? (
        <p className="rounded-2xl border border-amber-500/40 bg-amber-500/10 p-4 text-sm text-amber-100">
          Run step81_guide_drafts.sql in the Supabase SQL Editor, then reload this page.
        </p>
      ) : (
        <GuideDrafts drafts={list} missing={missing} />
      )}
    </div>
  );
}
