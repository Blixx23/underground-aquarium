import Link from "next/link";
import { GitMerge } from "lucide-react";
import { OUTCOME_LABEL, type Cross, type CrossRow } from "@/lib/species/crosses";

/**
 * "Can crossbreed with" on a species page, and "Bred from" on a hybrid.
 * Short on purpose: one line per pair, linked to the other fish.
 */
export default function CrossbreedingNote({
  name,
  crosses,
  bredFrom,
  names,
}: {
  name: string;
  crosses: Cross[];
  bredFrom: CrossRow[];
  names: Map<string, string>;
}) {
  if (crosses.length === 0 && bredFrom.length === 0) return null;
  const nm = (slug: string) => names.get(slug) ?? slug.replace(/-/g, " ");
  return (
    <section className="mb-10 rounded-2xl border border-ocean-800/60 bg-ocean-900/40 p-5">
      <h2 className="flex items-center gap-2 font-display text-xl text-white">
        <GitMerge className="h-5 w-5 text-sky-300" /> {crosses.length ? `Can ${name} crossbreed?` : `What ${name} was bred from`}
      </h2>

      {bredFrom.length > 0 && (
        <ul className="mt-3 space-y-2">
          {bredFrom.map((r) => (
            <li key={`${r.species_a}-${r.species_b}`} className="text-sm text-ocean-200">
              <span className="text-white">
                <Link href={`/species/${r.species_a}`} className="underline underline-offset-2 hover:text-emerald-200">{nm(r.species_a)}</Link>
                {" x "}
                <Link href={`/species/${r.species_b}`} className="underline underline-offset-2 hover:text-emerald-200">{nm(r.species_b)}</Link>
              </span>
              <span className="block text-ocean-300">{r.note}</span>
            </li>
          ))}
        </ul>
      )}

      {crosses.length > 0 && (
        <>
          <p className="mt-1 text-sm text-ocean-300">Yes, with these. Keep only one in a tank if you want to breed true.</p>
          <ul className="mt-3 space-y-2.5">
            {crosses.map((c) => (
              <li key={c.slug} className="text-sm">
                <span className="flex flex-wrap items-baseline gap-x-2">
                  <Link href={`/species/${c.slug}`} className="font-medium text-white underline underline-offset-2 hover:text-emerald-200">
                    {nm(c.slug)}
                  </Link>
                  <span className="text-xs text-sky-300">{OUTCOME_LABEL[c.outcome]}</span>
                  {c.resultSlug && (
                    <span className="text-xs text-ocean-400">
                      makes the{" "}
                      <Link href={`/species/${c.resultSlug}`} className="underline underline-offset-2 hover:text-white">
                        {nm(c.resultSlug)}
                      </Link>
                    </span>
                  )}
                </span>
                <span className="block text-ocean-300">{c.note}</span>
              </li>
            ))}
          </ul>
        </>
      )}

      <Link href="/breeding/crossbreeding" className="mt-4 inline-block text-xs text-emerald-300 hover:text-emerald-200">
        Which aquarium fish can crossbreed?
      </Link>
    </section>
  );
}
