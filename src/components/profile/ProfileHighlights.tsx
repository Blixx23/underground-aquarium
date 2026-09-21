import Link from "next/link";
import { ChevronRight, Waves } from "lucide-react";
import { supabasePublic } from "@/lib/supabase/public";

type TankPeek = { id: string; name: string | null; images: string[] | null };

/**
 * On a phone there's no sidebar, so a member's tanks show as a short
 * swipeable strip above the feed. On a desktop they're already in the
 * sidebar, so this hides itself.
 */
export default async function ProfileHighlights({
  profileId,
  base,
}: {
  profileId: string;
  base: string;
}) {
  const [{ data: tankRows }] = await Promise.all([
    supabasePublic
      .from("tanks")
      .select("id, name, images")
      .eq("user_id", profileId)
      .eq("is_public", true)
      .order("updated_at", { ascending: false })
      .limit(8),
  ]);

  const tanks = (tankRows ?? []) as TankPeek[];
  if (tanks.length === 0) return null;

  return (
    <div className="mb-6 space-y-5 lg:hidden">
      {tanks.length > 0 && (
        <section>
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
