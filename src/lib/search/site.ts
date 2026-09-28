import "server-only";
import { supabasePublic } from "@/lib/supabase/public";
import { getHelpSections } from "@/lib/help/content";
import { searchHelp, queryTerms } from "@/lib/help/search";
import { helpHref } from "@/lib/help/types";
import { formatPrice, listingHref } from "@/lib/marketplace/listings";

/**
 * One search across the whole site: help answers, classifieds, species,
 * fish stores, forum threads, events, glossary terms and courses.
 *
 * No AI and no paid search service. Small, slow-changing lists (species,
 * glossary, courses) are held in memory for a few minutes and matched here.
 * Big or fast-changing ones (stores, listings, events) are asked of the
 * database with simple "contains" filters, and forum threads use the
 * existing search_forum function. Each part fails on its own, so one slow
 * table never breaks the whole search.
 */

export type SiteHit = {
  title: string;
  href: string;
  subtitle?: string;
  snippet?: string;
};

export type SiteGroupKey = "help" | "listings" | "species" | "stores" | "forums" | "events" | "glossary" | "courses";

export type SiteGroup = {
  key: SiteGroupKey;
  label: string;
  hits: SiteHit[];
  more?: { label: string; href: string };
};

export const GROUP_LABELS: Record<SiteGroupKey, string> = {
  help: "Help answers",
  listings: "Classifieds",
  species: "Fish species",
  stores: "Fish stores",
  forums: "Forums",
  events: "Events",
  glossary: "Glossary",
  courses: "Courses",
};

const ORDER: SiteGroupKey[] = ["help", "listings", "species", "stores", "forums", "events", "glossary", "courses"];

// ---------------------------------------------------------------------------
// Matching helpers
// ---------------------------------------------------------------------------

/** Terms safe to put inside a PostgREST filter: letters and digits only. */
function dbTerms(q: string): string[] {
  return queryTerms(q)
    .map((t) => t.replace(/[^a-z0-9]/g, ""))
    .filter((t) => t.length >= 2)
    .slice(0, 5);
}

/** Score how well a record's fields match. Every term must hit something. */
function score(terms: string[], primary: string, secondary: string[] = []): number {
  const p = primary.toLowerCase();
  const rest = secondary.join(" ").toLowerCase();
  let total = 0;
  for (const t of terms) {
    const word = new RegExp(`\\b${t}`);
    if (p === t) total += 40;
    else if (p.startsWith(t)) total += 30;
    else if (word.test(p)) total += 24;
    else if (p.includes(t)) total += 14;
    else if (word.test(rest)) total += 10;
    else if (rest.includes(t)) total += 5;
    else return 0;
  }
  // Whole phrase in the name beats scattered words.
  if (terms.length > 1 && p.includes(terms.join(" "))) total += 20;
  return total;
}

function rank<T>(rows: T[], scoreOf: (r: T) => number, limit: number): T[] {
  return rows
    .map((r) => ({ r, s: scoreOf(r) }))
    .filter((x) => x.s > 0)
    .sort((a, b) => b.s - a.s)
    .slice(0, limit)
    .map((x) => x.r);
}

function clip(s: string | null | undefined, n = 140): string | undefined {
  const t = (s ?? "").replace(/[#>*_`~[\]]/g, "").replace(/\s+/g, " ").trim();
  if (!t) return undefined;
  return t.length > n ? t.slice(0, n).trim() + "…" : t;
}

// ---------------------------------------------------------------------------
// Small lists, cached in memory per server instance
// ---------------------------------------------------------------------------

const TTL = 10 * 60 * 1000;
const memo = new Map<string, { at: number; data: unknown }>();

async function cached<T>(key: string, load: () => Promise<T>): Promise<T> {
  const hit = memo.get(key);
  if (hit && Date.now() - hit.at < TTL) return hit.data as T;
  const data = await load();
  memo.set(key, { at: Date.now(), data });
  return data;
}

type SpeciesRow = {
  slug: string;
  common_name: string;
  scientific_name: string | null;
  also_known_as: string[] | null;
  former_names: string[] | null;
  trade_codes: string[] | null;
  group_name: string | null;
};

const loadSpecies = () =>
  cached("species", async () => {
    const { data, error } = await supabasePublic
      .from("species")
      .select("slug, common_name, scientific_name, also_known_as, former_names, trade_codes, group_name")
      .limit(5000);
    if (error) throw error;
    return (data ?? []) as SpeciesRow[];
  });

type GlossaryRow = { slug: string; term: string; category: string | null; definition: string | null };

const loadGlossary = () =>
  cached("glossary", async () => {
    const { data, error } = await supabasePublic
      .from("glossary_terms")
      .select("slug, term, category, definition")
      .limit(5000);
    if (error) throw error;
    return (data ?? []) as GlossaryRow[];
  });

type CourseRow = { slug: string; title: string; subtitle: string | null };

const loadCourses = () =>
  cached("courses", async () => {
    const { data, error } = await supabasePublic
      .from("courses")
      .select("slug, title, subtitle")
      .eq("is_published", true);
    if (error) throw error;
    return (data ?? []) as CourseRow[];
  });

// ---------------------------------------------------------------------------
// Each group
// ---------------------------------------------------------------------------

async function helpGroup(q: string, n: number): Promise<SiteHit[]> {
  return searchHelp(getHelpSections("member"), q, n).map((h) => ({
    title: h.s.heading,
    href: helpHref(h.s),
    subtitle: h.s.anchor ? h.s.articleTitle : h.s.category,
    snippet: h.snippet,
  }));
}

async function speciesGroup(terms: string[], n: number): Promise<SiteHit[]> {
  const rows = await loadSpecies();
  return rank(
    rows,
    (s) =>
      Math.max(
        score(terms, s.common_name, [s.scientific_name ?? "", s.group_name ?? ""]),
        score(terms, s.scientific_name ?? "", [s.common_name]) - 2,
        score(terms, [...(s.also_known_as ?? []), ...(s.former_names ?? []), ...(s.trade_codes ?? [])].join(" "), []) - 4
      ),
    n
  ).map((s) => ({
    title: s.common_name,
    href: `/species/${s.slug}`,
    subtitle: [s.scientific_name, s.group_name].filter(Boolean).join(" · ") || undefined,
  }));
}

async function glossaryGroup(terms: string[], n: number): Promise<SiteHit[]> {
  const rows = await loadGlossary();
  return rank(rows, (g) => score(terms, g.term, [g.definition ?? "", g.category ?? ""]), n).map((g) => ({
    title: g.term,
    href: `/glossary/${g.slug}`,
    subtitle: g.category ?? undefined,
    snippet: clip(g.definition),
  }));
}

async function coursesGroup(terms: string[], n: number): Promise<SiteHit[]> {
  const rows = await loadCourses();
  return rank(rows, (c) => score(terms, c.title, [c.subtitle ?? ""]), n).map((c) => ({
    title: c.title,
    href: `/courses/${c.slug}`,
    subtitle: "Free course",
    snippet: clip(c.subtitle),
  }));
}

/**
 * Every term must appear in at least one of the columns. Built as ONE
 * PostgREST logic filter, or=(and(or(...),or(...))), rather than chaining
 * .or() calls, so the AND between terms never depends on how repeated
 * query parameters are combined. "*" is PostgREST's wildcard inside
 * logic filters; terms are letters and digits only (see dbTerms).
 */
function containsAll<Q extends { or: (f: string) => Q }>(query: Q, terms: string[], cols: string[]): Q {
  const anyCol = (t: string) => cols.map((c) => `${c}.ilike.*${t}*`).join(",");
  if (terms.length === 1) return query.or(anyCol(terms[0]));
  return query.or(`and(${terms.map((t) => `or(${anyCol(t)})`).join(",")})`);
}

async function storesGroup(terms: string[], n: number): Promise<SiteHit[]> {
  type Row = { slug: string; name: string; city: string | null; state: string | null; claimed_by: string | null };
  const { data, error } = await containsAll(
    supabasePublic.from("fish_stores").select("slug, name, city, state, claimed_by").eq("status", "published"),
    terms,
    ["name", "city", "state"]
  ).limit(40);
  if (error) throw error;
  return rank((data ?? []) as Row[], (s) => score(terms, s.name, [s.city ?? "", s.state ?? ""]), n).map((s) => ({
    title: s.name,
    href: `/stores/${s.slug}`,
    subtitle: [[s.city, s.state].filter(Boolean).join(", "), s.claimed_by ? "Claimed" : null]
      .filter(Boolean)
      .join(" · ") || undefined,
  }));
}

async function listingsGroup(terms: string[], n: number): Promise<SiteHit[]> {
  type Row = {
    slug: string;
    title: string;
    description: string | null;
    city: string | null;
    state_code: string;
    price_cents: number | null;
    is_free: boolean;
    is_wanted: boolean;
  };
  const { data, error } = await containsAll(
    supabasePublic
      .from("listings")
      .select("slug, title, description, city, state_code, price_cents, is_free, is_wanted")
      .eq("status", "active")
      .gt("expires_at", new Date().toISOString()),
    terms,
    ["title", "description", "city"]
  )
    .order("bumped_at", { ascending: false })
    .limit(40);
  if (error) throw error;
  return rank((data ?? []) as Row[], (l) => score(terms, l.title, [l.description ?? "", l.city ?? ""]), n).map((l) => ({
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
  type Row = {
    slug: string;
    title: string;
    starts_at: string;
    city: string | null;
    state: string | null;
    venue_name: string | null;
    is_online: boolean | null;
    timezone: string | null;
  };
  const since = new Date(Date.now() - 24 * 3600 * 1000).toISOString();
  const { data, error } = await containsAll(
    supabasePublic
      .from("events")
      .select("slug, title, starts_at, city, state, venue_name, is_online, timezone")
      .eq("status", "published")
      .eq("show_in_directory", true)
      .gte("starts_at", since),
    terms,
    ["title", "description", "city", "venue_name"]
  )
    .order("starts_at", { ascending: true })
    .limit(30);
  if (error) throw error;
  return rank((data ?? []) as Row[], (e) => score(terms, e.title, [e.city ?? "", e.venue_name ?? "", "event"]) || 1, n).map(
    (e) => {
      let when = "";
      try {
        when = new Date(e.starts_at).toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
          year: "numeric",
          timeZone: e.timezone || "America/Los_Angeles",
        });
      } catch {
        when = e.starts_at.slice(0, 10);
      }
      return {
        title: e.title,
        href: `/events/${e.slug}`,
        subtitle: [when, e.is_online ? "Online" : [e.city, e.state].filter(Boolean).join(", ")].filter(Boolean).join(" · "),
      };
    }
  );
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

export async function siteSearch(rawQ: string, perGroup = 5): Promise<SiteGroup[]> {
  const q = rawQ.trim().slice(0, 100);
  if (q.length < 2) return [];
  const terms = dbTerms(q);
  const n = Math.min(Math.max(perGroup, 1), 20);
  const noTerms = async () => [] as SiteHit[];

  const jobs: Record<SiteGroupKey, Promise<SiteHit[]>> = {
    help: helpGroup(q, n),
    listings: terms.length ? listingsGroup(terms, n) : noTerms(),
    species: terms.length ? speciesGroup(terms, n) : noTerms(),
    stores: terms.length ? storesGroup(terms, n) : noTerms(),
    forums: q.length >= 3 ? forumsGroup(q, n) : noTerms(),
    events: terms.length ? eventsGroup(terms, n) : noTerms(),
    glossary: terms.length ? glossaryGroup(terms, n) : noTerms(),
    courses: terms.length ? coursesGroup(terms, n) : noTerms(),
  };

  const settled = await Promise.allSettled(ORDER.map((k) => jobs[k]));
  const enc = encodeURIComponent(q);
  const more: Partial<Record<SiteGroupKey, { label: string; href: string }>> = {
    forums: { label: "All forum results", href: `/forums/search?q=${enc}` },
    stores: { label: "Open the store directory", href: `/stores?q=${enc}` },
    help: { label: "Open the Help Center", href: "/help" },
  };

  return ORDER.map((key, i) => {
    const r = settled[i];
    if (r.status === "rejected") console.error(`site search: ${key} failed`, r.reason);
    const hits = r.status === "fulfilled" ? r.value : [];
    return { key, label: GROUP_LABELS[key], hits, more: hits.length ? more[key] : undefined };
  }).filter((g) => g.hits.length > 0);
}
