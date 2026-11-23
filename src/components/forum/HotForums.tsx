import Link from "next/link";
import { Flame, MessageSquareDashed, PenLine } from "lucide-react";
import { supabasePublic } from "@/lib/supabase/public";
import { thumb } from "@/lib/images/thumb";
import { getStripExtras, type StripCard } from "@/lib/strip/extras";

/**
 * "New around the site": a sideways-scrolling strip of story-style cards
 * above the feed, the way stories sit above the Facebook feed. It carries only
 * what the feed doesn't (shop reviews, species and word of the day, the next
 * event, a guide, new species), so nothing shows twice. New forum threads are
 * already feed items; the strip keeps the way in ("Ask the forums") and the
 * nudge ("Answer a question").
 */
export default async function HotForums() {
  const [{ count: unanswered }, extras] = await Promise.all([
    supabasePublic
      .from("forum_threads")
      .select("id", { count: "exact", head: true })
      .eq("reply_count", 0)
      .eq("is_seeded", false),
    getStripExtras(),
  ]);

  const heading = "New around the site";
  const card = "relative h-44 w-[7.25rem] shrink-0 snap-start overflow-hidden rounded-2xl border sm:h-48 sm:w-32";

  return (
    <section aria-label={heading} className="pt-1">
      <div className="mb-2 flex items-center justify-between px-1">
        <p className="flex items-center gap-1.5 text-sm font-semibold text-white">
          <Flame className="h-4 w-4 text-coral-400" /> {heading}
        </p>
        <Link href="/forums" className="text-xs text-ocean-400 hover:text-white">
          All forums
        </Link>
      </div>

      <div className="-mx-3 flex snap-x gap-2 overflow-x-auto px-3 pb-1 [scrollbar-width:none] sm:mx-0 sm:px-0 [&::-webkit-scrollbar]:hidden">
        {/* Like "Create story": the way in comes first. */}
        <Link
          href="/forums/new"
          className={`${card} flex flex-col items-center justify-center gap-2 border-ocean-700/70 bg-ocean-900/60 text-center transition-colors hover:border-ocean-500`}
        >
          <span className="flex h-11 w-11 items-center justify-center rounded-full bg-ocean-500 text-white">
            <PenLine className="h-5 w-5" />
          </span>
          <span className="px-2 text-sm font-semibold leading-tight text-white">Ask the forums</span>
        </Link>

        {extras.map((c) => (
          <ExtraCard key={c.key} c={c} card={card} />
        ))}

        {(unanswered ?? 0) > 0 && (
          <Link
            href="/forums/unanswered"
            className={`${card} flex flex-col items-center justify-center gap-2 border-amber-500/30 bg-amber-500/[0.07] px-2 text-center transition-colors hover:border-amber-400/60`}
          >
            <MessageSquareDashed className="h-7 w-7 text-amber-300" />
            <span className="text-sm font-semibold leading-tight text-amber-100">Answer a question</span>
            <span className="text-xs leading-tight text-amber-100/70">
              {unanswered} waiting for {unanswered === 1 ? "an answer" : "answers"}
            </span>
          </Link>
        )}
      </div>
    </section>
  );
}

/**
 * A card from somewhere other than the forums (a review, species of the day...).
 * Every card has the same three fixed zones so nothing overlaps on a narrow
 * phone card and every label lines up across the row:
 *   top    - a photo behind everything, or one centered icon (the reviewer's
 *            avatar, or the card's emoji)
 *   bottom - label, title (two lines), detail line, and the call to action,
 *            each in its own row at a fixed height
 */
function ExtraCard({ c, card }: { c: StripCard; card: string }) {
  return (
    <Link href={c.href} className={`${card} group flex flex-col border-white/10 bg-gradient-to-b ${c.bg} to-ocean-950`}>
      {c.image && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={thumb(c.image, 256)}
          alt=""
          loading="lazy"
          className="absolute inset-0 h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
        />
      )}
      <span className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/50 to-black/10" />

      {/* Top zone: one icon, centered, never under the text. */}
      <span className="relative flex h-[4.25rem] shrink-0 items-center justify-center sm:h-20">
        {!c.image &&
          (c.avatar ? (
            <span
              className="flex h-11 w-11 items-center justify-center overflow-hidden rounded-full bg-ocean-800 text-sm font-semibold uppercase text-white ring-2 ring-amber-300/70"
              title={c.avatar.name}
            >
              {c.avatar.src ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={c.avatar.src} alt="" className="h-full w-full object-cover" />
              ) : (
                c.avatar.name.slice(0, 1)
              )}
            </span>
          ) : (
            <span className="text-3xl leading-none opacity-85 sm:text-4xl" aria-hidden="true">
              {c.emoji}
            </span>
          ))}
      </span>

      {/* Bottom zone: fixed rows, so labels line up from card to card. */}
      <span className="relative mt-auto flex flex-col px-2 pb-2">
        <span className="block truncate text-[10px] font-medium uppercase tracking-wide text-white/65">{c.label}</span>
        <span className="mt-0.5 line-clamp-2 h-[2.1rem] text-[13px] font-semibold leading-[1.05rem] text-white">{c.title}</span>
        <span className="mt-0.5 block h-4 truncate text-[11px] leading-4 text-white/60">
          {c.stars ? <span className="text-amber-300">{c.stars} </span> : null}
          {c.sub ?? ""}
        </span>
        <span className="mt-0.5 block truncate text-[11px] font-medium leading-4 text-cyan-200/90">{c.cta}</span>
      </span>
    </Link>
  );
}
