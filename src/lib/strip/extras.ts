import { unstable_cache } from "next/cache";
import { supabasePublic } from "@/lib/supabase/public";
import { getGuides } from "@/lib/forum/guides";

/**
 * Cards for the strip above the feed that the feed itself never shows, so the
 * row has something new without repeating feed posts: shop reviews, a species
 * and a word of the day, the next event, a guide, and species just added.
 * Rotating cards change by the hour or the day, so the row is never stale.
 */
export type StripCard = {
  key: string;
  label: string; // small caps line, e.g. "Shop review"
  title: string;
  sub?: string;
  /** Shown in gold at the start of the detail line (reviews). */
  stars?: string;
  cta: string; // the line at the bottom, e.g. "Review a shop you use"
  href: string;
  image?: string | null;
  emoji: string;
  bg: string; // gradient classes
  avatar?: { name: string; src: string | null } | null;
};

/** Pacific day number and hour, so "of the day" flips at midnight in California. */
function laNow(): { day: number; hour: number } {
  const p = Object.fromEntries(
    new Intl.DateTimeFormat("en-US", {
      timeZone: "America/Los_Angeles",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      hour12: false,
    })
      .formatToParts(new Date())
      .map((x) => [x.type, x.value])
  );
  const day = Math.floor(Date.UTC(Number(p.year), Number(p.month) - 1, Number(p.day)) / 86_400_000);
  return { day, hour: Number(p.hour) };
}

/** A repeatable shuffle: the same seed always gives the same order. */
function seeded<T>(list: T[], seed: number): T[] {
  const out = [...list];
  let s = seed % 2147483647 || 1;
  for (let i = out.length - 1; i > 0; i--) {
    s = (s * 16807) % 2147483647;
    const j = s % (i + 1);
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

const stars = (n: number) => "★".repeat(Math.max(1, Math.min(5, Math.round(n))));

/** One source failing just leaves its card out. */
async function safe<T>(fn: () => Promise<T>): Promise<T | null> {
  try {
    return await fn();
  } catch {
    return null;
  }
}

async function reviewCards(seed: number): Promise<StripCard[]> {
  const { data } = await supabasePublic
    .from("store_reviews")
    .select("id, store_id, user_id, rating, body, created_at")
    .not("body", "is", null)
    .order("created_at", { ascending: false })
    .limit(80);
  const rows = ((data ?? []) as { id: string; store_id: string; user_id: string; rating: number; body: string | null }[]).filter(
    (r) => (r.body ?? "").trim().length >= 15
  );
  // A random pair of written reviews, reshuffled every hour.
  const picked = seeded(rows, seed).slice(0, 2);
  if (picked.length === 0) return [];
  const [{ data: shops }, { data: people }] = await Promise.all([
    supabasePublic.from("fish_stores").select("id, name, slug, city").in("id", picked.map((r) => r.store_id)),
    supabasePublic.from("profiles").select("id, username, full_name, avatar_url").in("id", picked.map((r) => r.user_id)),
  ]);
  const shopById = new Map(((shops ?? []) as { id: string; name: string; slug: string; city: string | null }[]).map((s) => [s.id, s]));
  const personById = new Map(
    ((people ?? []) as { id: string; username: string | null; full_name: string | null; avatar_url: string | null }[]).map((p) => [p.id, p])
  );
  return picked
    .filter((r) => shopById.has(r.store_id))
    .map((r) => {
      const s = shopById.get(r.store_id)!;
      const who = personById.get(r.user_id);
      const body = (r.body ?? "").replace(/\s+/g, " ").trim();
      return {
        key: `review-${r.id}`,
        label: "Shop review",
        stars: stars(r.rating),
        title: `“${body.length > 60 ? `${body.slice(0, 57).trimEnd()}…` : body}”`,
        sub: [s.name, s.city].filter(Boolean).join(", "),
        cta: "Review a shop",
        href: `/stores/${s.slug}?tab=reviews`,
        emoji: "⭐",
        bg: "from-amber-500/40 via-amber-900/60",
        avatar: who ? { name: who.username || who.full_name || "member", src: who.avatar_url } : null,
      };
    });
}

async function speciesOfTheDay(day: number): Promise<StripCard | null> {
  const { data } = await supabasePublic.from("species").select("slug, common_name, scientific_name").order("slug");
  const all = (data ?? []) as { slug: string; common_name: string; scientific_name: string | null }[];
  if (all.length === 0) return null;
  const s = all[day % all.length];
  const { data: photos } = await supabasePublic.rpc("public_species_photos", { p_slug: s.slug });
  const photo = ((photos ?? []) as { url: string }[])[0]?.url ?? null;
  return {
    key: `species-${s.slug}`,
    label: "Daily species",
    title: s.common_name,
    sub: s.scientific_name ?? undefined,
    cta: "See its care",
    href: `/species/${s.slug}`,
    image: photo,
    emoji: "🐠",
    bg: "from-cyan-500/40 via-cyan-900/60",
  };
}

async function nextEvent(): Promise<StripCard | null> {
  const { data } = await supabasePublic
    .from("events")
    .select("slug, title, cover_image, starts_at, city, state, is_online")
    .eq("status", "published")
    .eq("show_in_directory", true)
    .gte("starts_at", new Date().toISOString())
    .order("starts_at", { ascending: true })
    .limit(1)
    .maybeSingle();
  if (!data) return null;
  const e = data as {
    slug: string;
    title: string;
    cover_image: string | null;
    starts_at: string;
    city: string | null;
    state: string | null;
    is_online: boolean | null;
  };
  const when = new Date(e.starts_at).toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "America/Los_Angeles" });
  return {
    key: `event-${e.slug}`,
    label: `Event · ${when}`,
    title: e.title,
    sub: e.is_online ? "Online" : [e.city, e.state].filter(Boolean).join(", ") || undefined,
    cta: "See the event",
    href: `/events/${e.slug}`,
    image: e.cover_image,
    emoji: "📅",
    bg: "from-rose-500/40 via-rose-900/60",
  };
}

async function wordOfTheDay(day: number): Promise<StripCard | null> {
  const { data } = await supabasePublic.from("glossary_terms").select("slug, term").order("slug");
  const all = (data ?? []) as { slug: string; term: string }[];
  if (all.length === 0) return null;
  const t = all[(day * 7) % all.length];
  return {
    key: `term-${t.slug}`,
    label: "Daily word",
    title: t.term,
    cta: "What it means",
    href: `/glossary/${t.slug}`,
    emoji: "📖",
    bg: "from-violet-500/40 via-violet-900/60",
  };
}

async function newestSpecies(): Promise<StripCard | null> {
  const { data } = await supabasePublic
    .from("species")
    .select("slug, common_name, created_at")
    .gte("created_at", new Date(Date.now() - 14 * 86_400_000).toISOString())
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (!data) return null;
  const s = data as { slug: string; common_name: string };
  return {
    key: `new-species-${s.slug}`,
    label: "New species",
    title: s.common_name,
    cta: "See it",
    href: `/species/${s.slug}`,
    emoji: "🆕",
    bg: "from-emerald-500/40 via-emerald-900/60",
  };
}

async function guideOfTheDay(day: number): Promise<StripCard | null> {
  // Only guides older than two weeks: newer threads can still be near the top of the feed.
  const cutoff = Date.now() - 14 * 86_400_000;
  const all = (await getGuides()).filter((g) => new Date(g.createdAt).getTime() < cutoff);
  if (all.length === 0) return null;
  const g = all[(day * 3) % all.length];
  return {
    key: `guide-${g.slug}`,
    label: "Guide",
    sub: g.categoryName,
    title: g.title,
    cta: "Read it",
    href: `/forums/${g.categorySlug}/${g.slug}`,
    emoji: "📘",
    bg: "from-sky-500/40 via-sky-900/60",
  };
}

async function buildStripExtras(): Promise<StripCard[]> {
  const { day, hour } = laNow();
  const [reviews, species, event, word, fresh, guide] = await Promise.all([
    safe(() => reviewCards(day * 24 + hour)),
    safe(() => speciesOfTheDay(day)),
    safe(() => nextEvent()),
    safe(() => wordOfTheDay(day)),
    safe(() => newestSpecies()),
    safe(() => guideOfTheDay(day)),
  ]);
  const r = reviews ?? [];
  // Mixed so no two of a kind sit side by side.
  return [species, r[0], event, guide, r[1], fresh, word].filter((c): c is StripCard => Boolean(c));
}

/**
 * The feed page renders on every visit, so the cards are built at most every
 * 10 minutes and shared. Reviews still reshuffle hourly and the daily picks
 * still flip at midnight, because each build reads the clock.
 */
export const getStripExtras = unstable_cache(buildStripExtras, ["strip-extras"], { revalidate: 600 });
