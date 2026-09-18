import Link from "next/link";
import { ArrowRight, Camera, KeySquare, ShieldCheck, Clock } from "lucide-react";
import { getSocietyContext, CLASS_LADDER } from "@/lib/society/membership";
import { createClient } from "@/lib/supabase/server";
import { SOCIETY_SLUG } from "@/lib/config";
import { SOC_EYEBROW, SOC_CARD, SOC_BTN_PRIMARY } from "@/lib/society/theme";
import SpeciesBrowser, {
  type AwardSpecies,
} from "@/components/society/SpeciesBrowser";

export const dynamic = "force-dynamic";

const STAGES = [
  {
    n: 1,
    name: "Pair & setup",
    proves: "The breeding group in your tank, before anything happens.",
    gap: "Opens the log",
  },
  {
    n: 2,
    name: "Spawn",
    proves: "Eggs, or clear evidence of spawning.",
    gap: "When it happens",
  },
  {
    n: 3,
    name: "Free-swimming fry",
    proves: "It hatched.",
    gap: "3 days after stage 2",
  },
  {
    n: 4,
    name: "30-day grow-out",
    proves: "They're eating.",
    gap: "25 days after stage 3",
  },
  {
    n: 5,
    name: "60-day grow-out",
    proves: "They survived. This is the real bar.",
    gap: "25 days after stage 4",
  },
];

const BONUSES = [
  ["First in Society", "+50%", "Nobody has logged this species before. The record is permanent."],
  ["Spawn report", "+10", "A written account published to the library."],
  ["Video", "+5", "The spawn or fry documented on video."],
  ["CARES species", "×2", "Threatened in the wild."],
];

export default async function BreederProgramPage() {
  const ctx = await getSocietyContext();
  const supabase = await createClient();

  const { data } = await supabase
    .from("club_award_species")
    .select("id, program, common_name, scientific_name, category, points")
    .eq("club_id", ctx.society!.id)
    .eq("program", "BAP")
    .eq("is_active", true);

  const species = ((data ?? []) as unknown as AwardSpecies[]) ?? [];
  const submitHref = `/c/${SOCIETY_SLUG}/awards/submit`;

  return (
    <div>
      <p className={`${SOC_EYEBROW} mb-3`}>Breeder Award Program</p>
      <h1 className="mb-4 font-display text-2xl text-white sm:text-3xl">
        Spawn it. Raise it. Prove it.
      </h1>
      <p className="mb-8 max-w-2xl text-base leading-relaxed text-amber-100/60">
        The BAP is the Society&apos;s core recognition programme. You breed a
        fish, document it as it happens, and other members verify the record.
        Points are awarded by difficulty, and points become titles that stay on
        your name permanently.
      </p>

      {/* The one thing that makes this different from a photo contest. */}
      <div className={`${SOC_CARD} mb-8 p-5 sm:p-6`}>
        <div className="mb-3 flex items-center gap-2">
          <ShieldCheck className="h-5 w-5 shrink-0 text-amber-300" />
          <h2 className="font-display text-lg text-white">
            Open your log before the spawn
          </h2>
        </div>
        <p className="text-sm leading-relaxed text-amber-100/65">
          This is the rule that makes a UAS title mean something. You register
          the pair and the tank <em>first</em>, then add each stage as it
          happens. Logs cannot be opened retroactively and stages cannot be
          backfilled, so a photo from the internet has nowhere to go. The
          Society isn&apos;t asked to believe you — it watched.
        </p>
      </div>

      {/* Stages */}
      <h2 className="mb-4 font-display text-xl text-white">The five stages</h2>
      <ol className="mb-8 space-y-2">
        {STAGES.map((s) => (
          <li
            key={s.n}
            className="flex gap-4 rounded-xl border border-ocean-800/60 bg-ocean-900/40 p-4"
          >
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-amber-500/30 bg-amber-500/10 font-display text-sm text-amber-300">
              {s.n}
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-sm font-medium text-white">
                {s.name}
              </span>
              <span className="block text-sm text-ocean-400">{s.proves}</span>
            </span>
            <span className="hidden shrink-0 items-center gap-1.5 self-center font-mono text-[10px] uppercase tracking-wider text-ocean-600 sm:flex">
              <Clock className="h-3 w-3" />
              {s.gap}
            </span>
          </li>
        ))}
      </ol>

      {/* Token + photos */}
      <div className="mb-8 grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div className={`${SOC_CARD} p-5`}>
          <KeySquare className="mb-3 h-5 w-5 text-amber-300" />
          <h3 className="mb-2 font-display text-base text-white">
            Your challenge code
          </h3>
          <p className="text-sm leading-relaxed text-amber-100/60">
            Every log is issued a four-character code when you open it. Write it
            on a card and have it visible in your stage 1 and stage 5 photos. A
            stolen photo can&apos;t have your code in it.
          </p>
        </div>
        <div className={`${SOC_CARD} p-5`}>
          <Camera className="mb-3 h-5 w-5 text-amber-300" />
          <h3 className="mb-2 font-display text-base text-white">
            What we check on a photo
          </h3>
          <p className="text-sm leading-relaxed text-amber-100/60">
            Upload time is recorded by the server, not read from the file, so it
            can&apos;t be edited. We read the photo&apos;s metadata once for
            consistency and then discard it — your location is never stored and
            no reviewer ever sees it.
          </p>
        </div>
      </div>

      {/* Classes */}
      <h2 className="mb-4 font-display text-xl text-white">Difficulty classes</h2>
      <div className="mb-8 overflow-hidden rounded-2xl border border-ocean-800/60">
        {CLASS_LADDER.map((c, i) => (
          <div
            key={c.letter}
            className={`flex items-center gap-4 px-4 py-3 ${
              i % 2 ? "bg-ocean-900/30" : "bg-ocean-900/50"
            }`}
          >
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-amber-500/30 bg-amber-500/10 font-display text-sm text-amber-300">
              {c.letter}
            </span>
            <span className="min-w-0 flex-1 text-sm text-ocean-300">
              {c.blurb}
            </span>
            <span className="shrink-0 font-display text-lg text-white">
              {c.points}
              <span className="ml-1 font-mono text-[10px] uppercase text-ocean-600">
                pts
              </span>
            </span>
          </div>
        ))}
      </div>

      {/* Bonuses */}
      <h2 className="mb-4 font-display text-xl text-white">Bonuses</h2>
      <div className="mb-10 grid grid-cols-1 gap-2 sm:grid-cols-2">
        {BONUSES.map(([name, mult, desc]) => (
          <div
            key={name}
            className="rounded-xl border border-ocean-800/60 bg-ocean-900/40 p-4"
          >
            <p className="flex items-baseline gap-2">
              <span className="font-medium text-white">{name}</span>
              <span className="font-display text-amber-300">{mult}</span>
            </p>
            <p className="mt-1 text-sm text-ocean-400">{desc}</p>
          </div>
        ))}
      </div>

      {/* Species picker */}
      <div className="mb-4 flex flex-wrap items-baseline justify-between gap-3">
        <h2 className="font-display text-xl text-white">
          Pick what you&apos;re breeding
        </h2>
        <Link
          href={submitHref}
          className="text-sm text-amber-300 transition-colors hover:text-amber-200"
        >
          Or start a blank log →
        </Link>
      </div>

      {species.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-ocean-800/60 p-8 text-center">
          <p className="mb-4 text-sm text-ocean-400">
            The species list is empty. Add species and their point values before
            members can pick from it.
          </p>
          {ctx.isOfficer && (
            <Link
              href={`/c/${SOCIETY_SLUG}/awards/list`}
              className={`${SOC_BTN_PRIMARY} px-6`}
            >
              Build the point list
              <ArrowRight className="h-4 w-4" />
            </Link>
          )}
        </div>
      ) : (
        <SpeciesBrowser species={species} submitHref={submitHref} />
      )}
    </div>
  );
}
