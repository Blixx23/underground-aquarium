import "server-only";
import { OPS_SITE } from "@/lib/ops/config";

/**
 * QA's eyes: fetch pages from the live site the way a signed-out visitor
 * would, and report status, speed, title, a text excerpt and anything that
 * looks broken or retired. Only our own site can be fetched.
 */

const UA = "UndergroundAquarium-QA/1.0 (+https://www.undergroundaquarium.com)";

// Vercel's firewall challenges automated requests ("Security Checkpoint"). With
// Protection Bypass for Automation turned on in the Vercel project, Vercel puts
// its secret in this variable and the header lets our own checker through.
function headers(accept: string): Record<string, string> {
  const h: Record<string, string> = { "user-agent": UA, accept };
  const secret = process.env.VERCEL_AUTOMATION_BYPASS_SECRET;
  if (secret) h["x-vercel-protection-bypass"] = secret;
  return h;
}

/** The firewall's challenge page instead of ours. */
const CHECKPOINT = /Vercel Security Checkpoint|x-vercel-challenge|vercel\.com\/security/i;
export const CHECKPOINT_NOTE = process.env.VERCEL_AUTOMATION_BYPASS_SECRET
  ? "Vercel's Security Checkpoint blocked the checker even with the bypass secret. This happens during an active attack; try again later."
  : "Vercel's Security Checkpoint blocked the checker. Chris needs to turn on Protection Bypass for Automation in Vercel (see Admin help, AI team).";

/** Words that should never show on the live site any more. */
const RETIRED = [
  /platform fee/i,
  /seller (fee|payout)/i,
  /\bbuy now\b/i,
  /\bcheckout\b/i,
  /family plan/i,
  /vendor guide/i,
  /\[object Object\]/,
  /\bundefined\b/,
  /\bNaN\b/,
  /Application error/i,
  /Internal Server Error/i,
];

function toPath(input: string): string | null {
  try {
    const u = new URL(input, OPS_SITE);
    const site = new URL(OPS_SITE);
    if (u.hostname !== site.hostname && u.hostname !== site.hostname.replace(/^www\./, "")) return null;
    return u.pathname + u.search;
  } catch {
    return null;
  }
}

function textOf(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&#x27;|&#39;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/\s+/g, " ")
    .trim();
}

async function get(path: string, timeoutMs = 15_000) {
  const started = Date.now();
  let url = OPS_SITE + path;
  const hops: string[] = [];
  for (let i = 0; i < 4; i++) {
    const res = await fetch(url, {
      redirect: "manual",
      headers: headers("text/html"),
      signal: AbortSignal.timeout(timeoutMs),
    });
    if (res.status >= 300 && res.status < 400 && res.headers.get("location")) {
      const next = new URL(res.headers.get("location")!, url).toString();
      hops.push(`${res.status} -> ${toPath(next) ?? next}`);
      url = next;
      if (!toPath(next)) return { status: res.status, ms: Date.now() - started, finalPath: next, hops, html: "" };
      continue;
    }
    const html = (res.headers.get("content-type") ?? "").includes("html") ? await res.text() : "";
    return { status: res.status, ms: Date.now() - started, finalPath: toPath(url) ?? url, hops, html };
  }
  return { status: 0, ms: Date.now() - started, finalPath: url, hops: [...hops, "too many redirects"], html: "" };
}

export async function fetchPage(input: string) {
  const path = toPath(input);
  if (!path) return { error: "Only pages on undergroundaquarium.com can be checked." };
  try {
    const r = await get(path);
    if (CHECKPOINT.test(r.html)) return { path, status: r.status, blocked: true, error: CHECKPOINT_NOTE };
    const title = r.html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1]?.trim() ?? "";
    const h1 = textOf(r.html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i)?.[1] ?? "");
    const text = textOf(r.html.replace(/<head[\s\S]*?<\/head>/i, ""));
    const flags = RETIRED.filter((re) => re.test(text)).map((re) => {
      const m = text.match(re);
      const at = m?.index ?? 0;
      return `"${m?.[0]}" near: ...${text.slice(Math.max(0, at - 60), at + 60)}...`;
    });
    const internalLinks = new Set(
      [...r.html.matchAll(/href="([^"#]+)"/g)].map((m) => toPath(m[1])).filter((p): p is string => Boolean(p) && !p!.startsWith("/_next"))
    );
    return {
      path,
      status: r.status,
      loadMs: r.ms,
      redirects: r.hops,
      finalPath: r.finalPath,
      title,
      h1,
      words: text.split(" ").length,
      internalLinks: internalLinks.size,
      flags,
      excerpt: text.slice(0, 1500),
    };
  } catch (e) {
    return { path, error: e instanceof Error ? e.message : String(e) };
  }
}

/** Checks every internal link on a page (up to 25) and reports the ones that don't load. */
export async function checkLinks(input: string) {
  const path = toPath(input);
  if (!path) return { error: "Only pages on undergroundaquarium.com can be checked." };
  const page = await get(path);
  if (CHECKPOINT.test(page.html)) return { path, blocked: true, error: CHECKPOINT_NOTE };
  const links = [
    ...new Set(
      [...page.html.matchAll(/href="([^"#]+)"/g)]
        .map((m) => toPath(m[1]))
        .filter((p): p is string => Boolean(p) && !p!.startsWith("/_next") && !p!.startsWith("/api/"))
    ),
  ].slice(0, 25);
  const results = await Promise.all(
    links.map(async (l) => {
      try {
        const r = await get(l, 10_000);
        return { path: l, status: r.status, finalPath: r.finalPath };
      } catch (e) {
        return { path: l, status: 0, error: e instanceof Error ? e.message : String(e) };
      }
    })
  );
  const broken = results.filter((r) => r.status === 0 || r.status >= 400);
  return { page: path, checked: results.length, broken };
}

/** What the sitemap lists: a count per section and a few sample pages from each. */
export async function listSitePages(section?: string) {
  const res = await fetch(`${OPS_SITE}/sitemap.xml`, { headers: headers("application/xml"), signal: AbortSignal.timeout(20_000) });
  if (!res.ok) return { error: `Sitemap returned ${res.status}` };
  const xml = await res.text();
  const paths = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => toPath(m[1])).filter((p): p is string => Boolean(p));
  const bySection = new Map<string, string[]>();
  for (const p of paths) {
    const key = "/" + (p.split("/")[1] ?? "");
    if (!bySection.has(key)) bySection.set(key, []);
    bySection.get(key)!.push(p);
  }
  if (section) {
    const list = bySection.get(section.startsWith("/") ? section : "/" + section) ?? [];
    // Spread the sample across the list rather than taking the first few.
    const step = Math.max(1, Math.floor(list.length / 20));
    return { section, total: list.length, sample: list.filter((_, i) => i % step === 0).slice(0, 20) };
  }
  return {
    total: paths.length,
    sections: [...bySection.entries()].map(([s, list]) => ({ section: s, pages: list.length, examples: list.slice(0, 3) })),
  };
}
