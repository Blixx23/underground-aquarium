import { supabasePublic } from "@/lib/supabase/public";
import { getRegion, getRegionCounts, countFor, getStateGroup } from "@/lib/marketplace/regions";
import { getPlaceStores, groupCities, stateName, STATE_NAMES } from "@/lib/stores/places";
import { parseCode } from "@/lib/certificates/code";
import { LEVEL_LABEL, normaliseLevel } from "@/lib/courses/levels";
import { sizeBySlug } from "@/lib/tankBuilder/sizes";
import { computeEquipment } from "@/lib/tankBuilder/engine";
import { getHelpArticle } from "@/lib/help/content";

/**
 * What goes on the share card for a page. Every card is built from our own
 * data, looked up from the page's path, so nobody can make a card that says
 * something the page doesn't.
 */
export type ShareCard = {
  /** Small teal (or gold) line above the title. */
  kicker: string;
  title: string;
  /** One line under the title. */
  sub?: string | null;
  /** Up to four short facts shown as pills. */
  chips?: string[];
  /** A photo for the round frame. Our fish when there isn't one. */
  photo?: string | null;
  /** Gold for the Society and certificates, teal for everything else. */
  tone?: "teal" | "gold";
};

const plural = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;

/** Section pages. Short and specific, so a shared link says what it is. */
const STATIC: Record<string, ShareCard> = {
  "/courses": {
    kicker: "FREE COURSES",
    title: "Learn Fishkeeping the Right Way",
    sub: "Guided lessons, quizzes, a certificate and a profile badge.",
    chips: ["Free", "Certificate", "Beginner to expert"],
  },
  "/marketplace": {
    kicker: "FREE CLASSIFIEDS",
    title: "Buy, Sell & Trade Aquarium Fish Near You",
    sub: "Fish, shrimp, coral, plants, tanks and gear from local hobbyists.",
    chips: ["Free to post", "No fees", "Live fish welcome"],
  },
  "/aquarium-stores": {
    kicker: "FISH STORE FINDER",
    title: "Find an Aquarium Store Near You",
    sub: "Independent fish stores across the US, with hours and reviews.",
    chips: ["All 50 states", "Reviews", "Directions"],
  },
  "/stores": {
    kicker: "LOCAL FISH STORES",
    title: "Local Fish Stores Near You",
    sub: "See what each shop carries, read reviews, get directions.",
    chips: ["Reviews", "Hours", "Directions"],
  },
  "/events": {
    kicker: "EVENTS",
    title: "Fish Swaps, Auctions & Club Meetings",
    sub: "Aquarium events across the US. Find one near you or post your own.",
    chips: ["Swaps", "Auctions", "Expos", "Free to post"],
  },
  "/forums": {
    kicker: "FORUMS",
    title: "Ask Real Fish Keepers",
    sub: "Beginner help, fish health, planted tanks, saltwater and breeding.",
  },
  "/feed": {
    kicker: "COMMUNITY",
    title: "Tanks, Spawns & Fish Room Updates",
    sub: "What the community is breeding, building and selling right now.",
  },
  "/society": {
    kicker: "THE SOCIETY",
    title: "Underground Aquarium Society",
    sub: "Judged breeder awards, a species registry and signed certificates.",
    chips: ["Breeder awards", "Certificates", "Nationwide"],
    tone: "gold",
  },
  "/verify": {
    kicker: "CERTIFICATE REGISTRY",
    title: "Verify a Certificate",
    sub: "Check any certificate issued by Underground Aquarium.",
    tone: "gold",
  },
  "/help": {
    kicker: "HELP CENTER",
    title: "How Can We Help?",
    sub: "Posting, messaging, forums, the Society, tools and your account.",
  },
  "/glossary": {
    kicker: "AQUARIUM GLOSSARY",
    title: "200+ Fishkeeping Terms, Explained",
    sub: "From ammonia and cycling to ich and KH, in plain English.",
    chips: ["Searchable", "Plain English", "Free"],
  },
  "/water-check": {
    kicker: "FREE TOOL",
    title: "Water Check",
    sub: "Enter your test results and see what they mean for your fish.",
    chips: ["Ammonia", "Nitrite", "Nitrate", "pH"],
  },
  "/tank-builder": {
    kicker: "FREE TOOL",
    title: "Tank Builder",
    sub: "Pick your tank and fish. See what gets along and what fits.",
    chips: ["Compatibility", "Stocking", "Heater & filter"],
  },
  "/where-to-sell-aquarium-fish": {
    kicker: "GUIDE",
    title: "Where to Sell Aquarium Fish",
    sub: "Every real option for selling fish, shrimp and plants locally.",
    chips: ["Free", "Local", "Live fish welcome"],
  },
  "/about": {
    kicker: "ABOUT US",
    title: "By Hobbyists, for Hobbyists",
    sub: "Free classifieds, care guides, forums, fish stores and the Society.",
  },
};

async function courseCard(slug: string): Promise<ShareCard | null> {
  const full = await supabasePublic
    .from("courses")
    .select("id, title, subtitle, est_minutes, badge_title, level, members_only")
    .eq("slug", slug)
    .eq("is_published", true)
    .maybeSingle();
  let c = full.data as {
    id: string;
    title: string;
    subtitle: string | null;
    est_minutes: number | null;
    badge_title: string | null;
    level?: string | null;
    members_only?: boolean | null;
  } | null;
  // level and members_only arrive with course_levels.sql.
  if (full.error) {
    const { data } = await supabasePublic
      .from("courses")
      .select("id, title, subtitle, est_minutes, badge_title")
      .eq("slug", slug)
      .eq("is_published", true)
      .maybeSingle();
    c = data;
  }
  if (!c) return null;

  const { count } = await supabasePublic
    .from("course_sections")
    .select("id", { count: "exact", head: true })
    .eq("course_id", c.id);

  const chips = [
    count ? plural(count, "lesson") : null,
    c.est_minutes ? `About ${c.est_minutes} min` : null,
    c.members_only ? "Society members" : LEVEL_LABEL[normaliseLevel(c.level)],
    "Certificate + badge",
  ].filter((x): x is string => !!x);

  return {
    kicker: c.members_only ? "SOCIETY CLASS" : "FREE COURSE",
    title: c.title,
    sub: c.subtitle,
    chips,
    tone: c.members_only ? "gold" : "teal",
  };
}

async function certificateCard(raw: string): Promise<ShareCard | null> {
  const parsed = parseCode(decodeURIComponent(raw));
  if (parsed.state !== "valid" && parsed.state !== "legacy") return null;
  const { data } = await supabasePublic.rpc("verify_certificate", { p_code: parsed.code });
  const r = ((data as
    | { kind: string; title: string | null; program_name: string; recipient_name: string; status: string; issued_at: string }[]
    | null) ?? [])[0];
  // Only a certificate that stands gets a card. Anything else gets the plain one.
  if (!r || r.status !== "valid") return null;
  const awarded =
    r.kind === "membership"
      ? "Society Member"
      : r.kind === "species"
        ? `Certified ${r.title ?? ""} Breeder`
        : r.kind === "course"
          ? r.title ?? "Course Completed"
          : r.title ?? r.program_name;
  const year = new Date(r.issued_at).getFullYear();
  return {
    kicker: r.kind === "course" ? "COURSE COMPLETED" : "VERIFIED CERTIFICATE",
    title: awarded,
    sub: `Awarded to ${r.recipient_name}`,
    chips: ["Verified", r.program_name, String(year)],
    tone: "gold",
  };
}

async function regionCard(state: string, slug: string): Promise<ShareCard | null> {
  const r = await getRegion(state, slug);
  if (!r) return null;
  const n = countFor(await getRegionCounts(), r);
  return {
    kicker: "LOCAL CLASSIFIEDS",
    title: `Aquarium Fish for Sale in ${r.name}`,
    sub: `Buy, sell and trade with hobbyists in ${r.name}, ${r.state_code}.`,
    chips: [n > 0 ? plural(n, "listing") : "Be the first to post", "Free to post", "No fees"],
  };
}

async function stateMarketCard(state: string): Promise<ShareCard | null> {
  const g = await getStateGroup(state);
  if (!g) return null;
  return {
    kicker: "LOCAL CLASSIFIEDS",
    title: `Aquarium Fish for Sale in ${g.name}`,
    sub: `Fish, shrimp, coral, plants and gear across ${g.name}.`,
    chips: [
      g.listingCount > 0 ? plural(g.listingCount, "listing") : "Free to post",
      plural(g.regions.length, "area"),
      "No fees",
    ],
  };
}

async function storesStateCard(state: string): Promise<ShareCard | null> {
  const code = state.toUpperCase();
  if (!STATE_NAMES[code]) return null;
  const stores = (await getPlaceStores()).filter((s) => s.state === code);
  if (!stores.length) return null;
  const cities = groupCities(stores).size;
  return {
    kicker: "FISH STORE FINDER",
    title: `Aquarium Stores in ${stateName(code)}`,
    sub: "Independent fish stores with addresses, hours and reviews.",
    chips: [plural(stores.length, "shop"), plural(cities, "city", "cities")],
  };
}

async function storesCityCard(state: string, city: string): Promise<ShareCard | null> {
  const all = await getPlaceStores();
  const c = groupCities(all).get(`${state.toUpperCase()}/${city.toLowerCase()}`);
  if (!c) return null;
  const rated = c.stores.filter((s) => s.rating_count > 0).length;
  return {
    kicker: "FISH STORE FINDER",
    title: `Aquarium Stores in ${c.name}, ${c.state}`,
    sub: c.stores
      .slice(0, 3)
      .map((s) => s.name)
      .join(", "),
    chips: [plural(c.stores.length, "fish shop"), rated ? `${rated} with reviews` : "Hours", "Directions"],
  };
}

async function forumCard(slug: string): Promise<ShareCard | null> {
  const { data: cat } = await supabasePublic
    .from("forum_categories")
    .select("id, name, description, is_public")
    .eq("slug", slug)
    .maybeSingle();
  if (!cat || !cat.is_public) return null;
  const { count } = await supabasePublic
    .from("forum_threads")
    .select("id", { count: "exact", head: true })
    .eq("category_id", cat.id)
    .is("hidden_at", null);
  return {
    kicker: "FORUM",
    title: cat.name,
    sub: cat.description ?? "Questions and answers from fellow fish keepers.",
    chips: count ? [plural(count, "topic"), "Ask a question"] : ["Ask a question"],
  };
}

async function glossaryCard(slug: string): Promise<ShareCard | null> {
  const { data } = await supabasePublic
    .from("glossary_terms")
    .select("term, category, definition")
    .eq("slug", slug)
    .maybeSingle();
  if (!data) return null;
  return {
    kicker: "AQUARIUM GLOSSARY",
    title: data.term,
    sub: data.definition,
    chips: data.category ? [data.category] : [],
  };
}

function tankSizeCard(slug: string): ShareCard | null {
  const t = sizeBySlug(slug);
  if (!t) return null;
  const e = computeEquipment(t.gallons, 50, false);
  return {
    kicker: "TANK BUILDER",
    title: `${t.gallons} Gallon Tank Stocking Ideas`,
    sub: "Stocking plans checked for compatibility, plus the gear it needs.",
    chips: [`${e.heaterWattsLow}-${e.heaterWattsHigh} W heater`, `${e.filterGphLow}-${e.filterGphHigh} GPH filter`],
  };
}

function helpCard(slug: string): ShareCard | null {
  const a = getHelpArticle(slug, "member");
  if (!a) return null;
  return { kicker: "HELP CENTER", title: a.title, sub: a.summary };
}

/** The card for a page path, or null when there isn't one (the route then 404s). */
export async function shareCardFor(path: string): Promise<ShareCard | null> {
  const clean = path.split("?")[0].replace(/\/+$/, "") || "/";
  if (STATIC[clean]) return STATIC[clean];

  const p = clean.split("/").filter(Boolean);
  try {
    if (p[0] === "courses" && p.length === 2) return await courseCard(p[1]);
    if (p[0] === "verify" && p.length === 2) return await certificateCard(p[1]);
    if (p[0] === "marketplace" && p.length === 3) return await regionCard(p[1], p[2]);
    if (p[0] === "marketplace" && p.length === 2) return await stateMarketCard(p[1]);
    if (p[0] === "aquarium-stores" && p.length === 3) return await storesCityCard(p[1], p[2]);
    if (p[0] === "aquarium-stores" && p.length === 2) return await storesStateCard(p[1]);
    if (p[0] === "forums" && p.length === 2) return await forumCard(p[1]);
    if (p[0] === "glossary" && p.length === 2) return await glossaryCard(p[1]);
    if (p[0] === "tank-builder" && p.length === 2) return tankSizeCard(p[1]);
    if (p[0] === "help" && p.length === 2) return helpCard(p[1]);
  } catch {
    return null;
  }
  return null;
}
