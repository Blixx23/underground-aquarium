import Link from "next/link";
import { ChevronRight, ShieldCheck, Waves } from "lucide-react";
import { supabasePublic } from "@/lib/supabase/public";
import SocietySeal from "@/components/society/SocietySeal";

type BreederCert = {
  species: string;
  scientific: string | null;
  approved_on: string | null;
  points: number | null;
  code: string | null;
};

type TankPeek = { id: string; name: string | null; images: string[] | null };

/**
 * The best of a member, before the feed: breeder certificates they've
 * earned, and a strip of their tanks. On a phone this is the first thing
 * a visitor sees; on a desktop the tanks already sit in the sidebar, so
 * only the certificates show here.
 */
export default async function ProfileHighlights({
  profileId,
  base,
}: {
  profileId: string;
  base: string;
}) {
  const [{ data: certRows }, { data: tankRows }] = await Promise.all([
    supabasePublic.rpc("public_breeder_certificates", { p_user: profileId }),
    supabasePublic
      .from("tanks")
      .select("id, name, images")
      .eq("user_id", profileId)
      .eq("is_public", true)
      .order("updated_at", { ascending: false })
      .limit(8),
  ]);

  const certs = (Array.isArray(certRows) ? certRows : []) as BreederCert[];
  const tanks = (tankRows ?? []) as TankPeek[];
  if (certs.length === 0 && tanks.length === 0) return null;

  return (
    <div className="mb-6 space-y-5">
      {certs.length > 0 && (
        <section>
          <p className="mb-2 font-mono text-[10px] uppercase tracking-[0.25em] text-amber-300/80">
            Certified breeder
          </p>
          <div className="flex gap-3 overflow-x-auto pb-1 [scrollbar-width:none]">
            {certs.map((c) => {
              const inner = (
                <>
                  <SocietySeal
                    size={120}
                    className="pointer-events-none absolute -right-6 -top-6 h-[120px] w-[120px] opacity-15"
                  />
                  <p className="relative font-display text-lg leading-tight text-amber-50">
                    Certified {c.species} Breeder
                  </p>
                  {c.scientific && (
                    <p className="relative mt-0.5 text-xs italic text-amber-100/60">{c.scientific}</p>
                  )}
                  <p className="relative mt-3 flex items-center gap-2 text-xs text-amber-200/70">
                    {c.approved_on &&
                      new Date(`${c.approved_on}T00:00:00`).toLocaleDateString(undefined, {
                        month: "long",
                        year: "numeric",
                      })}
                    {c.points ? <span>· {c.points} pts</span> : null}
                    {c.code && (
                      <span className="ml-auto inline-flex items-center gap-1 text-amber-300">
                        <ShieldCheck className="h-3.5 w-3.5" /> Verified
                      </span>
                    )}
                  </p>
                </>
              );
              const cls =
                "relative w-64 shrink-0 overflow-hidden rounded-2xl border border-amber-500/35 bg-gradient-to-br from-amber-500/[0.14] via-amber-500/[0.05] to-transparent p-4";
              return c.code ? (
                <Link
                  key={c.species}
                  href={`/verify/${c.code}`}
                  className={`${cls} transition-colors hover:border-amber-400/60`}
                >
                  {inner}
                </Link>
              ) : (
                <div key={c.species} className={cls}>
                  {inner}
                </div>
              );
            })}
          </div>
        </section>
      )}

      {tanks.length > 0 && (
        <section className="lg:hidden">
          <div className="mb-2 flex items-baseline justify-between">
            <p className="font-mono text-[10px] uppercase tracking-[0.25em] text-ocean-400">Tanks</p>
            <Link
              href={`${base}?tab=tanks`}
              className="inline-flex items-center text-xs text-ocean-400 hover:text-white"
            >
              See all <ChevronRight className="h-3.5 w-3.5" />
            </Link>
          </div>
          <div className="flex gap-2.5 overflow-x-auto pb-1 [scrollbar-width:none]">
            {tanks.map((t) => (
              <Link
                key={t.id}
                href={`/tanks/${t.id}`}
                className="group w-36 shrink-0 overflow-hidden rounded-xl border border-white/10 bg-white/[0.04]"
              >
                <div className="aspect-square overflow-hidden bg-ocean-950">
                  {t.images?.[0] ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={t.images[0]}
                      alt={t.name ?? "Tank"}
                      loading="lazy"
                      className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                    />
                  ) : (
                    <span className="flex h-full items-center justify-center">
                      <Waves className="h-6 w-6 text-ocean-700" />
                    </span>
                  )}
                </div>
                <p className="truncate px-2.5 py-2 text-xs font-medium text-white">
                  {t.name || "Untitled tank"}
                </p>
              </Link>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
