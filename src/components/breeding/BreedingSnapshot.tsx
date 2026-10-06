import Link from "next/link";
import { ArrowRight, Egg, Fish, Sparkles, Ruler, Users } from "lucide-react";
import type { Guide } from "@/lib/breeding/guides";
import { CLASS_LADDER } from "@/lib/society/classes";

/**
 * Breeding at a glance, on a species profile: how hard it is (the Society
 * class ladder), the egg-to-adult timeline, and three or four short facts,
 * all read from the written guide, with a link to the full guide.
 */

// The first, plain part of a guide fact: "Cave spawner (biparental care)" -> "Cave spawner".
function short(v: string | undefined, max = 80): string | null {
  if (!v) return null;
  let t = v.split(/;|\. /)[0].replace(/\s*\([^)]*\)/g, "").trim();
  if (t.length > max) t = `${t.slice(0, max).replace(/\s+\S*$/, "")}...`;
  return t || null;
}

// "Hatch in about 2 to 4 days at 78°F" -> "2 to 4 days"
function duration(v: string | undefined): string | null {
  if (!v) return null;
  const m = v.match(/(\d+(?:\.\d+)?(?:\s*(?:to|-)\s*\d+(?:\.\d+)?)?)\s*(hours?|days?|weeks?|months?)/i);
  return m ? `${m[1].replace(/\s*-\s*/, " to ")} ${m[2].toLowerCase()}` : null;
}

// "Commonly reported about 60 to 130 eggs" -> "60 to 130 eggs"
function count(v: string | undefined): string | null {
  if (!v) return null;
  const m = v.match(/(\d[\d,]*(?:\s*(?:to|-)\s*\d[\d,]*)?)\s*(eggs|fry|young|babies|shrimp|snails)/i);
  return m ? `${m[1].replace(/\s*-\s*/, " to ")} ${m[2].toLowerCase()}` : short(v, 36);
}

export default function BreedingSnapshot({ guide, speciesName, reports }: { guide: Guide; speciesName: string; reports: number }) {
  const f = guide.facts as Record<string, string | undefined>;
  const live = /live ?bear|gives birth|pregnan/i.test(`${f.method ?? ""} ${f.eggs ?? ""}`);
  const mouth = /mouthbrood/i.test(f.method ?? "");
  const carrier = /egg carrier|carries the eggs|carried/i.test(`${f.method ?? ""} ${f.eggs ?? ""}`);
  const klass = CLASS_LADDER.find((c) => c.points === guide.points);

  const steps = [
    { label: live ? "Brood" : "Spawn", detail: count(f.spawn), Icon: Sparkles },
    { label: live ? "Born after" : mouth ? "Held" : carrier ? "Carried" : "Hatch", detail: duration(f.eggs), Icon: Egg },
    {
      label: live || carrier ? "On their own" : mouth ? "Released" : "Swimming",
      detail: live || carrier ? "Right away" : mouth ? "Free swimming" : duration(f.fry),
      Icon: Fish,
    },
    { label: "Grown", detail: duration(f.grow_out), Icon: Ruler },
  ].filter((s) => s.detail);

  const facts = [
    ["How they breed", short(f.method, 48)],
    ["Males vs females", short(f.sexing, 90)],
    ["Breeding group", short(f.group, 60)],
    ["The parents", short(f.parents, 70)],
  ].filter((x): x is [string, string] => !!x[1]);

  return (
    <section className="mb-10 rounded-2xl border border-ocean-800/60 bg-ocean-900/40 p-5">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="font-display text-2xl text-white">Breeding {speciesName} at a glance</h2>
        {klass && (
          <span className="text-sm text-amber-300">
            Class {klass.letter} · {klass.points} points
          </span>
        )}
      </div>

      {/* How hard: the six Society classes, this fish's lit up. */}
      {klass && (
        <div className="mt-4">
          <div className="grid grid-cols-6 gap-1" role="img" aria-label={`Difficulty: Class ${klass.letter} of A to F`}>
            {CLASS_LADDER.map((c) => {
              const on = c.letter === klass.letter;
              const passed = c.points <= klass.points;
              return (
                <div key={c.letter} className="text-center">
                  <div
                    className={`h-2.5 rounded-full ${on ? "bg-amber-400" : passed ? "bg-amber-500/40" : "bg-white/10"}`}
                  />
                  <span className={`mt-1 block text-[11px] ${on ? "font-semibold text-amber-300" : "text-ocean-500"}`}>{c.letter}</span>
                </div>
              );
            })}
          </div>
          <p className="mt-1 text-sm text-ocean-300">{klass.blurb}</p>
        </div>
      )}

      {/* Spawn to grown, left to right. */}
      {steps.length > 1 && (
        <ol className="mt-5 grid gap-2" style={{ gridTemplateColumns: `repeat(${steps.length}, minmax(0, 1fr))` }}>
          {steps.map(({ label, detail, Icon }, i) => (
            <li key={label} className="relative flex flex-col items-center text-center">
              {i > 0 && <span aria-hidden className="absolute right-1/2 top-4 h-px w-full bg-emerald-500/30" />}
              <span className="relative z-10 flex h-8 w-8 items-center justify-center rounded-full border border-emerald-500/40 bg-ocean-950 text-emerald-300">
                <Icon className="h-4 w-4" />
              </span>
              <span className="mt-1.5 text-xs font-medium text-white">{label}</span>
              <span className="text-[11px] leading-snug text-ocean-400">{detail}</span>
            </li>
          ))}
        </ol>
      )}

      {facts.length > 0 && (
        <dl className="mt-5 grid gap-x-6 gap-y-2.5 sm:grid-cols-2">
          {facts.map(([k, v]) => (
            <div key={k}>
              <dt className="text-xs uppercase tracking-wide text-ocean-500">{k}</dt>
              <dd className="text-sm text-ocean-100">{v}</dd>
            </div>
          ))}
        </dl>
      )}

      <div className="mt-5 flex flex-wrap items-center gap-3">
        <Link
          href={`/breeding/${guide.slug}`}
          className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500 px-4 py-2 text-sm font-medium text-ocean-950 hover:bg-emerald-400"
        >
          Full breeding guide <ArrowRight className="h-4 w-4" />
        </Link>
        {reports > 0 && (
          <span className="inline-flex items-center gap-1.5 text-sm text-ocean-300">
            <Users className="h-4 w-4" /> {reports} {reports === 1 ? "report" : "reports"} from members who have spawned them
          </span>
        )}
      </div>
    </section>
  );
}
