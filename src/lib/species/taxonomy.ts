import "server-only";

/**
 * Free scientific-name lookups for the species checker. GBIF says whether a
 * name is a real species, what it's called now and what it used to be called;
 * WoRMS says whether it lives in salt, brackish or fresh water. Neither needs
 * an account. Every call has a short timeout and any failure just means the
 * checker carries on without that fact (and searches the web instead).
 */

export type Habitat = { marine: boolean | null; brackish: boolean | null; freshwater: boolean | null; terrestrial: boolean | null };

export type Taxonomy = {
  /** The name we looked up. */
  query: string;
  /** GBIF's answer, or null when GBIF couldn't be reached or had nothing. */
  gbif: {
    /** EXACT, FUZZY (spelling fixed) or HIGHERRANK (only matched a genus or family). */
    matchType: string;
    rank: string | null;
    matched: string | null;
    /** The name in current use; differs from matched when the typed name is an old one. */
    accepted: string | null;
    status: string | null;
    family: string | null;
    /** Older or alternative scientific names for the same species. */
    synonyms: string[];
  } | null;
  /** WoRMS habitat flags, or null when it couldn't be reached or doesn't list it. */
  habitat: Habitat | null;
  /** Which sources answered, and which failed, in plain words. */
  sources: { gbif: "found" | "not found" | "failed"; worms: "found" | "not found" | "failed" };
};

const UA = { accept: "application/json", "user-agent": "UndergroundAquarium species checker (undergroundaquarium.com)" };

async function getJson(url: string, ms = 6000): Promise<unknown | null> {
  const res = await fetch(url, { headers: UA, signal: AbortSignal.timeout(ms), cache: "no-store" });
  if (res.status === 204 || res.status === 404) return null;
  if (!res.ok) throw new Error(`${res.status}`);
  const text = await res.text();
  return text.trim() ? JSON.parse(text) : null;
}

/** "Pomacea bridgesii (Reeve, 1856)" -> "pomacea bridgesii". Null for "Corydoras sp." and the like. */
export function binomial(name: string | null | undefined): string | null {
  if (!name) return null;
  const words = name
    .toLowerCase()
    .replace(/[^a-z\s.-]/g, " ")
    .split(/\s+/)
    .filter(Boolean);
  if (words.length < 2) return null;
  const [genus, species] = words;
  if (["sp", "sp.", "spp", "spp.", "cf", "cf.", "aff", "aff.", "x"].includes(species)) return null;
  return `${genus} ${species.replace(/\.$/, "")}`;
}

const flag = (v: unknown): boolean | null => (v === 1 || v === true ? true : v === 0 || v === false ? false : null);

async function fromGbif(name: string): Promise<Taxonomy["gbif"]> {
  const m = (await getJson(
    `https://api.gbif.org/v1/species/match?kingdom=Animalia&name=${encodeURIComponent(name)}`
  )) as Record<string, unknown> | null;
  if (!m || !m.usageKey || m.matchType === "NONE") return null;
  const matchType = String(m.matchType ?? "");
  const matched = typeof m.canonicalName === "string" ? m.canonicalName : null;
  const status = typeof m.status === "string" ? m.status : null;
  let accepted = status === "SYNONYM" ? (typeof m.species === "string" ? m.species : null) : matched;
  const acceptedKey = status === "SYNONYM" && m.acceptedUsageKey ? m.acceptedUsageKey : m.usageKey;

  // The accepted name, when the typed one is an old name. Not fatal if it fails.
  if (status === "SYNONYM" && m.acceptedUsageKey) {
    try {
      const a = (await getJson(`https://api.gbif.org/v1/species/${m.acceptedUsageKey}`)) as Record<string, unknown> | null;
      if (a && typeof a.canonicalName === "string") accepted = a.canonicalName;
    } catch {
      /* keep what the match gave us */
    }
  }
  // Other names for the same species, so a fish we have under an old name is caught.
  let synonyms: string[] = [];
  if (matchType !== "HIGHERRANK") {
    try {
      const s = (await getJson(`https://api.gbif.org/v1/species/${acceptedKey}/synonyms?limit=40`)) as { results?: unknown[] } | null;
      synonyms = (s?.results ?? [])
        .map((r) => (r as Record<string, unknown>).canonicalName)
        .filter((x): x is string => typeof x === "string")
        .slice(0, 40);
    } catch {
      /* the match alone is still useful */
    }
  }
  return {
    matchType,
    rank: typeof m.rank === "string" ? m.rank : null,
    matched,
    accepted,
    status,
    family: typeof m.family === "string" ? m.family : null,
    synonyms,
  };
}

async function fromWorms(name: string): Promise<Habitat | null> {
  const list = (await getJson(
    `https://www.marinespecies.org/rest/AphiaRecordsByName/${encodeURIComponent(name)}?like=false&marine_only=false`
  )) as Record<string, unknown>[] | null;
  if (!Array.isArray(list) || list.length === 0) return null;
  const rec = list.find((r) => r.status === "accepted") ?? list[0];
  const h = {
    marine: flag(rec.isMarine),
    brackish: flag(rec.isBrackish),
    freshwater: flag(rec.isFreshwater),
    terrestrial: flag(rec.isTerrestrial),
  };
  return Object.values(h).some((v) => v !== null) ? h : null;
}

/** Both lookups at once. Throws only when both sources failed outright. */
export async function lookupTaxonomy(name: string): Promise<Taxonomy> {
  const [g, w] = await Promise.allSettled([fromGbif(name), fromWorms(name)]);
  const gbif = g.status === "fulfilled" ? g.value : null;
  const habitat = w.status === "fulfilled" ? w.value : null;
  if (g.status === "rejected" && w.status === "rejected") throw new Error("GBIF and WoRMS couldn't be reached.");
  return {
    query: name,
    gbif,
    habitat,
    sources: {
      gbif: g.status === "rejected" ? "failed" : gbif ? "found" : "not found",
      worms: w.status === "rejected" ? "failed" : habitat ? "found" : "not found",
    },
  };
}

/** Every binomial this lookup knows the species by: typed, matched, accepted and older names. */
export function taxonomyNames(t: Taxonomy | null, ...extra: (string | null | undefined)[]): Set<string> {
  const out = new Set<string>();
  const add = (n: string | null | undefined) => {
    const b = binomial(n);
    if (b) out.add(b);
  };
  extra.forEach(add);
  if (t?.gbif && t.gbif.matchType !== "HIGHERRANK") {
    add(t.gbif.matched);
    add(t.gbif.accepted);
    t.gbif.synonyms.forEach(add);
  }
  return out;
}

/** The facts, in a few plain lines for the AI. */
export function taxonomyFacts(t: Taxonomy): string {
  const lines: string[] = [`Name lookup for "${t.query}" (free scientific databases):`];
  if (t.gbif) {
    if (t.gbif.matchType === "HIGHERRANK") {
      lines.push(`- GBIF: no species by that name; it only matches the ${t.gbif.rank?.toLowerCase() ?? "group"} ${t.gbif.matched}.`);
    } else {
      lines.push(
        `- GBIF: ${t.gbif.matchType === "FUZZY" ? "spelling corrected to" : "matches"} ${t.gbif.matched} (${t.gbif.status?.toLowerCase() ?? "status unknown"}).` +
          (t.gbif.accepted && t.gbif.accepted !== t.gbif.matched ? ` The name in current use is ${t.gbif.accepted}.` : "") +
          (t.gbif.family ? ` Family ${t.gbif.family}.` : "")
      );
      if (t.gbif.synonyms.length) lines.push(`- Other scientific names for it: ${t.gbif.synonyms.slice(0, 15).join("; ")}.`);
    }
  } else {
    lines.push(`- GBIF: ${t.sources.gbif === "failed" ? "couldn't be reached" : "no match, so it may be misspelled, a trade name or not a real species"}.`);
  }
  if (t.habitat) {
    const where = [t.habitat.freshwater && "fresh", t.habitat.brackish && "brackish", t.habitat.marine && "marine", t.habitat.terrestrial && "land"]
      .filter(Boolean)
      .join(", ");
    lines.push(`- WoRMS habitat: ${where || "not stated"}.`);
  }
  return lines.join("\n");
}
