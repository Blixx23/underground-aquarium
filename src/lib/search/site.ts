import "server-only";
import { supabasePublic } from "@/lib/supabase/public";
import { getHelpSections } from "@/lib/help/content";
import { searchHelpFull, makeSnippet } from "@/lib/help/search";
import { queryTerms } from "@/lib/search/terms";
import { buildVocab, correctTerms, describeFix, type Vocab } from "@/lib/search/fuzzy";
import { helpHref } from "@/lib/help/types";
import { formatPrice, listingHref } from "@/lib/marketplace/listings";

/**
 * One search across the whole site: help answers, classifieds, species care
 * guides, breeding guides, fish stores, forum threads, events, glossary and
 * courses. No AI and no paid search service.
 *
 * Everything except forum threads is loaded into memory on the server and
 * refreshed every few minutes (the store directory page already loads every
 * shop the same way), then matched here. That makes typo fixing possible:
 * every word on the site goes into one vocabulary, and a misspelled word is
 * swapped for the closest real one before searching ("neon tetrs" finds
 * neon tetras). Forum threads use the existing search_forum function, with
 * the corrected words. Each group fails on its own, so one slow table never
 * breaks the whole search.
 */

export type SiteHit = {
  title: string;
  href: string;
  subtitle?: string;
  snippet?: string;
};

export type SiteGroupKey =
  | "help"
  | "listings"
  | "species"
  | "breeding"
  | "stores"
  | "forums"
  | "events"
  | "glossary"
  | "courses";

export type SiteGroup = {
  key: SiteGroupKey;
  label: string;
  hits: SiteHit[];
  more?: { label: string; href: string };
};

export type SiteSearchResult = {
  groups: SiteGroup[];
  /** set when misspellings were fixed: what we searched for instead */
  correctedTo: string | null;
};

export const GROUP_LABELS: Record<SiteGroupKey, string> = {
  help: "Help answers",
  listings: "Classifieds",
  species: "Fish species & care",
  breeding: "Breeding guides",
  stores: "Fish stores",
  forums: "Forums",
  events: "Events",
  glossary: "Glossary",
  courses: "Courses",
};

const ORDER: SiteGroupKey[] = ["help", "species", "listings", "stores", "forums", "breeding", "events", "glossary", "courses"];

// ---------------------------------------------------------------------------
// Matching
// ---------------------------------------------------------------------------

const wordStart = (t: string) => new RegExp(t.length <= 3 ? `\\b${t}\\b` : `\\b${t}`);

/**
 * Score one record. `primary` is its name or title; `secondary` is anything
 * else worth matching (other names, town, care text). Every term must hit
 * something. Returns 0 for no match.
 */
function score(terms: string[], primary: string, secondary: string[] = []): number {
  const p = primary.toLowerCase();
  const rest = secondary.join(" \n ").toLowerCase();
  let total = 0;
  for (const t of terms) {
    const re = wordStart(t);
    if (p === t) total += 40;
    else if (p.startsWith(t)) total += 30;
    else if (re.test(p)) total += 24;
    else if (re.test(rest)) total += 8;
    else return 0;
  }
  if (terms.length > 1 && p.includes(terms.join(" "))) total += 20;
  return total;
}

function rank<T>(rows: T[], scoreOf: (r: T) => number, limit: number): { r: T; s: number }[] {
  return rows
    .map((r) => ({ r, s: scoreOf(r) }))
    .filter((x) => x.s > 0)
    .sort((a, b) => b.s - a.s)
    .slice(0, limit);
}

function plain(md: string | null | undefined): string {
  return (md ?? "")
    .replace(/!\[[^\]]*\]\([^)]*\)/g, "")
    .replace(/\[([^\]]*)\]\([^)]*\)/g, "$1")
    .replace(/[#>*_`~|]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function clip(s: string | null | undefined, n = 150): string | undefined {
  const t = plain(s);
  if (!t) return undefined;
  return t.length > n ? t.slice(0, n).trim() + "…" : t;
}

// ---------------------------------------------------------------------------
// Data, cached in memory per server instance
// ---------------------------------------------------------------------------

const memo = new Map<string, { at: number; data: unknown }>();

async function cached<T>(key: string, ttlMs: number, load: () => Promise<T>): Promise<T> {
  const hit = memo.get(key);
  if (hit && Date.now() - hit.at < ttlMs) return hit.data as T;
  const data = await load();
  memo.set(key, { at: Date.now(), data });
  return data;
}

const MIN = 60 * 1000;

/** Supabase returns at most 1000 rows per request, so page through. */
async function allRows<T>(page: (from: number, to: number) => PromiseLike<{ data: unknown; error: unknown }>, cap = 50000) {
  const out: T[] = [];
  for (let from = 0; from < cap; from += 1000) {
    const { data, error } = await page(from, from + 999);
    if (error) throw error;
    const rows = (data ?? []) as T[];
    out.push(...rows);
    if (rows.length < 1000) break;
  }
  return out;
}

type SpeciesRow = {
  slug: string;
  common_name: string;
  scientific_name: string | null;
  also_known_as: string[] | null;
  former_names: string[] | null;
  trade_codes: string[] | null;
  group_name: string | null;
  summary: string | null;
  body: string | null;
  diet: string | null;
  temperament: string | null;
  origin: string | null;
  care_level: string | null;
  water_type: string | null;
};

const loadSpecies = () =>
  cached("species", 10 * MIN, () =>
    allRows<SpeciesRow>((a, b) =>
      supabasePublic
        .from("species")
        .select(
          "slug, common_name, scientific_name, also_known_as, former_names, trade_codes, group_name, summary, body, diet, temperament, origin, care_level, water_type"
        )
        .range(a, b)
    )
  );

type BreedingRow = { species_slug: string; species_name: string; program: string | null; notes: string | null };

const loadBreeding = () =>
  cached("breeding", 10 * MIN, () =>
    allRows<BreedingRow>((a, b) =>
      supabasePublic.from("public_breeding_guides").select("species_slug, species_name, program, notes").range(a, b)
    )
  );

type GlossaryRow = { slug: string; term: string; category: string | null; definition: string | null };

const loadGlossary = () =>
  cached("glossary", 10 * MIN, () =>
    allRows<GlossaryRow>((a, b) =>
      supabasePublic.from("glossary_terms").select("slug, term, category, definition").range(a, b)
    )
  );

type CourseRow = { slug: string; title: string; subtitle: string | null };

const loadCourses = () =>
  cached("courses", 10 * MIN, async () => {
    const { data, error } = await supabasePublic.from("courses").select("slug, title, subtitle").eq("is_published", true);
    if (error) throw error;
    return (data ?? []) as CourseRow[];
  });

type StoreRow = { slug: string; name: string; city: string | null; state: string | null; claimed_by: string | null };

const loadStores = () =>
  cached("stores", 30 * MIN, () =>
    allRows<StoreRow>((a, b) =>
      supabasePublic
        .from("fish_stores")
        .select("slug, name, city, state, claimed_by")
        .eq("status", "published")
        .order("name")
        .range(a, b)
    )
  );

type ListingRow = {
  slug: string;
  title: string;
  description: string | null;
  category: string | null;
  city: string | null;
  state_code: string;
  price_cents: number | null;
  is_free: boolean;
  is_wanted: boolean;
  expires_at: string;
};

// Ads change often, so this list is only kept for two minutes.
const loadListings = () =>
  cached("listings", 2 * MIN, () =>
    allRows<ListingRow>(
      (a, b) =>
        supabasePublic
          .from("listings")
          .select("slug, title, description, category, city, state_code, price_cents, is_free, is_wanted, expires_at")
          .eq("status", "active")
          .gt("expires_at", new Date().toISOString())
          .order("bumped_at", { ascending: false })
          .range(a, b),
      5000
    )
  );

type EventRow = {
  slug: string;
  title: string;
  description: string | null;
  starts_at: string;
  city: string | null;
  state: string | null;
  venue_name: string | null;
  is_online: boolean | null;
  timezone: string | null;
};

const loadEvents = () =>
  cached("events", 5 * MIN, async () => {
    const since = new Date(Date.now() - 24 * 3600 * 1000).toISOString();
    const { data, error } = await supabasePublic
      .from("events")
      .select("slug, title, description, starts_at, city, state, venue_name, is_online, timezone")
      .eq("status", "published")
      .eq("show_in_directory", true)
      .gte("starts_at", since)
      .order("starts_at", { ascending: true })
      .limit(1000);
    if (error) throw error;
    return (data ?? []) as EventRow[];
  });

/** Settle a loader to [] on failure, so one bad table doesn't sink the vocabulary. */
const safe = <T,>(p: Promise<T[]>) => p.catch((e) => (console.error("site search load:", e), [] as T[]));

/** Every word the site uses, for fixing misspellings. Rebuilt every 10 minutes. */
const loadVocab = () =>
  cached("vocab", 10 * MIN, async (): Promise<Vocab> => {
    const [species, breeding, glossary, courses, stores, listings, events] = await Promise.all([
      safe(loadSpecies()),
      safe(loadBreeding()),
      safe(loadGlossary()),
      safe(loadCourses()),
      safe(loadStores()),
      safe(loadListings()),
      safe(loadEvents()),
    ]);
    function* texts() {
      for (const s of getHelpSections("member")) {
        yield s.heading;
        yield s.text;
        yield s.keywords ?? "";
      }
      for (const s of species) {
        yield s.common_name;
        yield s.scientific_name ?? "";
        yield (s.also_known_as ?? []).join(" ");
        yield (s.former_names ?? []).join(" ");
        yield s.group_name ?? "";
        yield s.summary ?? "";
        yield plain(s.body);
        yield [s.diet, s.temperament, s.origin, s.care_level, s.water_type].filter(Boolean).join(" ");
      }
      for (const b of breeding) yield b.species_name;
      for (const g of glossary) {
        yield g.term;
        yield g.definition ?? "";
      }
      for (const c of courses) yield `${c.title} ${c.subtitle ?? ""}`;
      for (const s of stores) yield `${s.name} ${s.city ?? ""}`;
      for (const l of listings) yield l.title;
      for (const e of events) yield `${e.title} ${e.city ?? ""}`;
    }
    return buildVocab(texts());
  });

// ---------------------------------------------------------------------------
// Groups
// ---------------------------------------------------------------------------

function helpGroup(q: string, n: number): SiteHit[] {
  return searchHelpFull(getHelpSections("member"), q, n, true).hits.map((h) => ({
    title: h.s.heading,
    href: helpHref(h.s),
    subtitle: h.s.anchor ? h.s.articleTitle : h.s.category,
    snippet: h.snippet,
  }));
}

async function speciesGroup(terms: string[], n: number): Promise<SiteHit[]> {
  const rows = await loadSpecies();
  const names = (s: SpeciesRow) =>
    [s.scientific_name, ...(s.also_known_as ?? []), ...(s.former_names ?? []), ...(s.trade_codes ?? [])]
      .filter(Boolean)
      .join(" ");
  const care = (s: SpeciesRow) =>
    [s.group_name, s.summary, s.diet, s.temperament, s.origin, s.care_level, s.water_type, plain(s.body)]
      .filter(Boolean)
      .join(" \n ");

  return rank(
    rows,
    (s) => {
      const byName = score(terms, s.common_name, [names(s)]);
      return Math.max(
        byName ? byName + 6 : 0, // a name match beats a care-text match
        score(terms, names(s), []),
        score(terms, "", [care(s)]) // "peaceful schooling fish", "blackwater", "ich"
      );
    },
    n
  ).map(({ r: s }) => {
    const nameHit = score(terms, s.common_name, [names(s)]) > 0;
    return {
      title: s.common_name,
      href: `/species/${s.slug}`,
      subtitle: [s.scientific_name, s.group_name, s.care_level ? `${s.care_level} care` : null].filter(Boolean).join(" · ") || undefined,
      snippet: nameHit ? clip(s.summary) : makeSnippet(plain([s.summary, s.body].filter(Boolean).join(" ")), terms, 160),
    };
  });
}

async function breedingGroup(terms: string[], n: number): Promise<SiteHit[]> {
  const rows = await loadBreeding();
  const bySpecies = new Map<string, { name: string; count: number; notes: string[] }>();
  for (const b of rows) {
    const e = bySpecies.get(b.species_slug) ?? { name: b.species_name, count: 0, notes: [] };
    e.count++;
    if (b.notes) e.notes.push(b.notes);
    bySpecies.set(b.species_slug, e);
  }
  const list = [...bySpecies.entries()].map(([slug, e]) => ({ slug, ...e }));
  return rank(list, (b) => score(terms, b.name, [...b.notes, "breeding spawn fry eggs"]), n).map(({ r: b }) => ({
    title: `Breeding ${b.name}`,
    href: `/breeding/${b.slug}`,
    subtitle: `${b.count} member breeding record${b.count === 1 ? "" : "s"}`,
  }));
}

async function glossaryGroup(terms: string[], n: number): Promise<SiteHit[]> {
  const rows = await loadGlossary();
  return rank(rows, (g) => score(terms, g.term, [g.definition ?? "", g.category ?? ""]), n).map(({ r: g }) => ({
    title: g.term,
    href: `/glossary/${g.slug}`,
    subtitle: g.category ?? undefined,
    snippet: clip(g.definition),
  }));
}

async function coursesGroup(terms: string[], n: number): Promise<SiteHit[]> {
  const rows = await loadCourses();
  return rank(rows, (c) => score(terms, c.title, [c.subtitle ?? ""]), n).map(({ r: c }) => ({
    title: c.title,
    href: `/courses/${c.slug}`,
    subtitle: "Free course",
    snippet: clip(c.subtitle),
  }));
}

async function storesGroup(terms: string[], n: number): Promise<SiteHit[]> {
  const rows = await loadStores();
  return rank(rows, (s) => score(terms, s.name, [s.city ?? "", s.state ?? "", "store shop fish aquarium"]), n).map(
    ({ r: s }) => ({
      title: s.name,
      href: `/stores/${s.slug}`,
      subtitle:
        [[s.city, s.state].filter(Boolean).join(", "), s.claimed_by ? "Claimed" : null].filter(Boolean).join(" · ") ||
        undefined,
    })
  );
}

async function listingsGroup(terms: string[], n: number): Promise<SiteHit[]> {
  const now = new Date().toISOString();
  const rows = (await loadListings()).filter((l) => l.expires_at > now);
  return rank(
    rows,
    (l) => score(terms, l.title, [l.description ?? "", l.city ?? "", l.state_code, (l.category ?? "").replace(/[-_]/g, " ")]),
    n
  ).map(({ r: l }) => ({
    title: l.title,
    href: listingHref(l.slug),
    subtitle: [
      l.is_wanted ? "Wanted" : l.is_free ? "Free" : formatPrice(l.price_cents),
      [l.city, l.state_code].filter(Boolean).join(", "),
    ]
      .filter(Boolean)
      .join(" · "),
    snippet: clip(l.description),
  }));
}

async function eventsGroup(terms: string[], n: number): Promise<SiteHit[]> {
  const rows = await loadEvents();
  return rank(
    rows,
    (e) => score(terms, e.title, [e.description ?? "", e.city ?? "", e.state ?? "", e.venue_name ?? "", "event"]),
    n
  ).map(({ r: e }) => {
    let when = e.starts_at.slice(0, 10);
    try {
      when = new Date(e.starts_at).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
        timeZone: e.timezone || "America/Los_Angeles",
      });
    } catch {
      /* keep the plain date */
    }
    return {
      title: e.title,
      href: `/events/${e.slug}`,
      subtitle: [when, e.is_online ? "Online" : [e.city, e.state].filter(Boolean).join(", ")].filter(Boolean).join(" · "),
    };
  });
}

async function forumsGroup(q: string, n: number): Promise<SiteHit[]> {
  type Row = { thread_slug: string; title: string; category_slug: string; category_name: string; snippet: string | null };
  const { data, error } = await supabasePublic.rpc("search_forum", { p_q: q, p_limit: n });
  if (error) throw error;
  return ((data ?? []) as Row[]).map((r) => ({
    title: r.title,
    href: `/forums/${r.category_slug}/${r.thread_slug}`,
    subtitle: r.category_name,
    snippet: clip(r.snippet),
  }));
}

// ---------------------------------------------------------------------------

export async function siteSearch(rawQ: string, perGroup = 5): Promise<SiteSearchResult> {
  const typed = rawQ.trim().slice(0, 100);
  if (typed.length < 2) return { groups: [], correctedTo: null };
  const n = Math.min(Math.max(perGroup, 1), 20);

  // Fix misspellings against every word the site uses.
  let terms = queryTerms(typed);
  let q = typed;
  let correctedTo: string | null = null;
  try {
    const fixed = correctTerms(terms, await loadVocab());
    if (fixed.changed) {
      correctedTo = describeFix(typed, terms, fixed.terms);
      terms = fixed.terms;
      q = correctedTo;
    }
  } catch (e) {
    console.error("site search: vocabulary failed", e);
  }
  const hasTerms = terms.some((t) => t.length >= 2);
  const none = async () => [] as SiteHit[];

  const jobs: Record<SiteGroupKey, Promise<SiteHit[]>> = {
    help: Promise.resolve().then(() => helpGroup(q, n)),
    species: hasTerms ? speciesGroup(terms, n) : none(),
    listings: hasTerms ? listingsGroup(terms, n) : none(),
    stores: hasTerms ? storesGroup(terms, n) : none(),
    forums: q.length >= 3 ? forumsGroup(q, n) : none(),
    breeding: hasTerms ? breedingGroup(terms, n) : none(),
    events: hasTerms ? eventsGroup(terms, n) : none(),
    glossary: hasTerms ? glossaryGroup(terms, n) : none(),
    courses: hasTerms ? coursesGroup(terms, n) : none(),
  };

  const settled = await Promise.allSettled(ORDER.map((k) => jobs[k]));
  const enc = encodeURIComponent(q);
  const more: Partial<Record<SiteGroupKey, { label: string; href: string }>> = {
    forums: { label: "All forum results", href: `/forums/search?q=${enc}` },
    stores: { label: "Open the store directory", href: `/stores?q=${enc}` },
    help: { label: "Open the Help Center", href: "/help" },
    breeding: { label: "All breeding guides", href: "/breeding" },
  };

  const groups = ORDER.map((key, i) => {
    const r = settled[i];
    if (r.status === "rejected") console.error(`site search: ${key} failed`, r.reason);
    const hits = r.status === "fulfilled" ? r.value : [];
    return { key, label: GROUP_LABELS[key], hits, more: hits.length ? more[key] : undefined };
  }).filter((g) => g.hits.length > 0);

  return { groups, correctedTo };
}
