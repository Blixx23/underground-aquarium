import Link from "next/link";
import { Flame, MessageSquare, MessageSquareDashed, PenLine } from "lucide-react";
import { supabasePublic } from "@/lib/supabase/public";

type Row = {
  id: string;
  slug: string;
  title: string;
  images: string[] | null;
  reply_count: number | null;
  score: number | null;
  author_id: string | null;
  category_id: string;
  last_activity_at: string | null;
  created_at: string;
};

/** Each section gets its own color and emoji so a card reads at a glance without a photo. */
const LOOK: Record<string, { emoji: string; bg: string }> = {
  "getting-started": { emoji: "👋", bg: "from-sky-500/40 via-sky-900/60" },
  freshwater: { emoji: "🐟", bg: "from-cyan-500/40 via-cyan-900/60" },
  "saltwater-reef": { emoji: "🪸", bg: "from-rose-500/40 via-rose-900/60" },
  "plants-aquascaping": { emoji: "🌿", bg: "from-emerald-500/40 via-emerald-900/60" },
  "fish-health": { emoji: "🚑", bg: "from-orange-500/40 via-orange-900/60" },
  "equipment-diy": { emoji: "🛠️", bg: "from-slate-400/40 via-slate-800/60" },
  breeding: { emoji: "🥚", bg: "from-amber-500/40 via-amber-900/60" },
  "journals-photos": { emoji: "📷", bg: "from-violet-500/40 via-violet-900/60" },
  "off-topic": { emoji: "💬", bg: "from-fuchsia-500/40 via-fuchsia-900/60" },
};
const DEFAULT_LOOK = { emoji: "💬", bg: "from-ocean-500/40 via-ocean-900/60" };

/**
 * Hot: replies and votes, fading with time since the last activity, so a
 * thread that's busy today beats one that was busy last month.
 */
function heat(t: Row, now: number) {
  const hours = Math.max(0, (now - new Date(t.last_activity_at ?? t.created_at).getTime()) / 3_600_000);
  const action = (t.reply_count ?? 0) * 2 + Math.max(0, t.score ?? 0) + 1;
  return action / Math.pow(hours + 2, 1.3);
}

/**
 * "Hot in the forums": a sideways-scrolling strip of story-style cards
 * above the feed, the way stories sit above the Facebook feed.
 */
export default async function HotForums() {
  const [{ data: cats }, { data: rows }, { count: unanswered }] = await Promise.all([
    supabasePublic.from("forum_categories").select("id, slug, name").eq("is_public", true),
    supabasePublic
      .from("forum_threads")
      .select("id, slug, title, images, reply_count, score, author_id, category_id, last_activity_at, created_at")
      .order("last_activity_at", { ascending: false })
      .limit(80),
    supabasePublic
      .from("forum_threads")
      .select("id", { count: "exact", head: true })
      .eq("reply_count", 0)
      .eq("is_seeded", false),
  ]);

  const catById = new Map((cats ?? []).map((c) => [c.id as string, c]));
  const now = Date.now();
  const threads = ((rows ?? []) as Row[])
    .filter((t) => catById.has(t.category_id))
    .sort((a, b) => heat(b, now) - heat(a, now))
    .slice(0, 12);

  if (threads.length === 0) return null;

  const authorIds = [...new Set(threads.map((t) => t.author_id).filter((x): x is string => Boolean(x)))];
  const people = new Map<string, { name: string; avatar: string | null }>();
  if (authorIds.length) {
    const { data: profs } = await supabasePublic
      .from("profiles")
      .select("id, username, full_name, avatar_url")
      .in("id", authorIds);
    for (const p of profs ?? []) {
      people.set(p.id as string, {
        name: (p.username as string) || (p.full_name as string) || "member",
        avatar: (p.avatar_url as string | null) ?? null,
      });
    }
  }

  const card = "relative h-44 w-[7.25rem] shrink-0 snap-start overflow-hidden rounded-2xl border sm:h-48 sm:w-32";

  return (
    <section aria-label="Hot in the forums" className="pt-1">
      <div className="mb-2 flex items-center justify-between px-1">
        <p className="flex items-center gap-1.5 text-sm font-semibold text-white">
          <Flame className="h-4 w-4 text-coral-400" /> Hot in the forums
        </p>
        <Link href="/forums" className="text-xs text-ocean-400 hover:text-white">
          See all
        </Link>
      </div>

      <div className="-mx-3 flex snap-x gap-2 overflow-x-auto px-3 pb-1 [scrollbar-width:none] sm:mx-0 sm:px-0 [&::-webkit-scrollbar]:hidden">
        {/* Like "Create story": the way in comes first. */}
        <Link
          href="/forums"
          className={`${card} flex flex-col items-center justify-center gap-2 border-ocean-700/70 bg-ocean-900/60 text-center transition-colors hover:border-ocean-500`}
        >
          <span className="flex h-11 w-11 items-center justify-center rounded-full bg-ocean-500 text-white">
            <PenLine className="h-5 w-5" />
          </span>
          <span className="px-2 text-sm font-semibold leading-tight text-white">Ask the forums</span>
        </Link>

        {threads.map((t) => {
          const cat = catById.get(t.category_id)!;
          const look = LOOK[cat.slug as string] ?? DEFAULT_LOOK;
          const photo = Array.isArray(t.images) ? t.images[0] : undefined;
          const who = t.author_id ? people.get(t.author_id) : undefined;
          return (
            <Link
              key={t.id}
              href={`/forums/${cat.slug}/${t.slug}`}
              className={`${card} group border-white/10 bg-gradient-to-b ${look.bg} to-ocean-950`}
            >
              {photo ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={photo}
                  alt=""
                  loading="lazy"
                  className="absolute inset-0 h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                />
              ) : (
                <span className="absolute inset-x-0 top-9 text-center text-4xl opacity-80" aria-hidden="true">
                  {look.emoji}
                </span>
              )}
              <span className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/30 to-black/10" />

              {/* Author, ringed like a story */}
              <span className="absolute left-2 top-2 flex h-8 w-8 items-center justify-center overflow-hidden rounded-full bg-ocean-800 text-xs font-semibold uppercase text-white ring-2 ring-ocean-400">
                {who?.avatar ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={who.avatar} alt="" className="h-full w-full object-cover" />
                ) : (
                  (who?.name ?? "?").slice(0, 1)
                )}
              </span>

              <span className="absolute inset-x-0 bottom-0 p-2">
                <span className="mb-1 block truncate text-[10px] font-medium uppercase tracking-wider text-white/60">
                  {cat.name}
                </span>
                <span className="line-clamp-3 text-[13px] font-semibold leading-snug text-white">{t.title}</span>
                <span className="mt-1 flex items-center gap-1 text-[11px] text-white/70">
                  <MessageSquare className="h-3 w-3" /> {t.reply_count ?? 0}
                </span>
              </span>
            </Link>
          );
        })}

        {(unanswered ?? 0) > 0 && (
          <Link
            href="/forums/unanswered"
            className={`${card} flex flex-col items-center justify-center gap-2 border-amber-500/30 bg-amber-500/[0.07] px-2 text-center transition-colors hover:border-amber-400/60`}
          >
            <MessageSquareDashed className="h-7 w-7 text-amber-300" />
            <span className="text-2xl font-semibold text-amber-100">{unanswered}</span>
            <span className="text-xs leading-tight text-amber-100/70">waiting for a reply</span>
          </Link>
        )}
      </div>
    </section>
  );
}
