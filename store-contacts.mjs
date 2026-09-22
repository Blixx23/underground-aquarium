/**
 * Build an outreach list for every published shop: best email we can find
 * on the shop's own website, plus a full mailing address.
 *
 *   node --env-file=.env.local store-contacts.mjs              # crawl, write store-contacts.csv
 *   node --env-file=.env.local store-contacts.mjs --write      # ...and save to store_contacts
 *   node --env-file=.env.local store-contacts.mjs --only CA    # one state, for a trial run
 *
 * Emails come only from each shop's own public website (home page, then
 * its contact / about pages). Facebook and Instagram pages are skipped.
 * Progress is saved to store-contacts-progress.json, so an interrupted run
 * picks up where it left off. Nothing here changes a shop's public page.
 */
import { createClient } from "@supabase/supabase-js";
import { readFileSync, writeFileSync, existsSync } from "node:fs";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY. Check .env.local.");
  process.exit(1);
}
const supabase = createClient(url, key);
const WRITE = process.argv.includes("--write");
const ONLY = (() => {
  const i = process.argv.indexOf("--only");
  return i > -1 ? String(process.argv[i + 1]).toUpperCase() : null;
})();

const PROGRESS = "store-contacts-progress.json";
const OUT = "store-contacts.csv";
const CONCURRENCY = 8;
const TIMEOUT_MS = 12000;
const UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126 Safari/537.36";

// ---------------------------------------------------------------- shops
const HAS_ZIP = !(await supabase.from("fish_stores").select("postal_code").limit(1)).error;
async function allStores() {
  const out = [];
  for (let from = 0; ; from += 1000) {
    let q = supabase
      .from("fish_stores")
      .select(`id, slug, name, address, city, state, phone, website, external_ref, source, claimed_by${HAS_ZIP ? ", postal_code" : ""}`)
      .eq("status", "published")
      .order("state")
      .range(from, from + 999);
    if (ONLY) q = q.eq("state", ONLY);
    const { data, error } = await q;
    if (error) throw new Error(error.message);
    out.push(...data);
    if (data.length < 1000) break;
  }
  return out;
}

// ZIP codes: Overture's dump has them; otherwise pull a 5-digit ZIP off the address.
const zipByRef = new Map();
const zipByName = new Map();
if (existsSync("overture-stores.json")) {
  for (const p of JSON.parse(readFileSync("overture-stores.json", "utf8"))) {
    if (!p.postcode) continue;
    const z = String(p.postcode).slice(0, 5);
    if (p.id) zipByRef.set(`overture:${p.id}`, z);
    if (p.name && p.city) zipByName.set(`${p.name}|${p.city}`.toLowerCase(), z);
  }
}
function zipFor(s) {
  if (s.postal_code) return String(s.postal_code).slice(0, 5);
  if (s.external_ref && zipByRef.has(s.external_ref)) return zipByRef.get(s.external_ref);
  const byName = zipByName.get(`${s.name}|${s.city}`.toLowerCase());
  if (byName) return byName;
  const m = (s.address || "").match(/\b(\d{5})(?:-\d{4})?\s*$/);
  return m ? m[1] : "";
}
/** Street line only: drop a trailing ", City, ST 12345" if the address carries it. */
function streetFor(s) {
  let a = (s.address || "").trim();
  if (!a) return "";
  const parts = a.split(",").map((p) => p.trim());
  if (parts.length > 1 && s.city && parts.slice(1).some((p) => p.toLowerCase().startsWith(s.city.toLowerCase()))) {
    a = parts[0];
  }
  return a.replace(/\s+\d{5}(-\d{4})?$/, "");
}

// ---------------------------------------------------------------- crawling
const SOCIAL = /(facebook|instagram|fb\.com|fb\.me|yelp|google\.|tiktok|twitter|x\.com|linktr\.ee|youtube)/i;
const JUNK_EMAIL =
  /(example\.|sentry|wixpress|godaddy|domain\.com|email\.com|yourdomain|yoursite|@2x|\.png|\.jpe?g|\.gif|\.webp|\.svg|u003e|mysite|placeholder|test@|noreply|no-reply|donotreply|privacy@|abuse@|webmaster@|squarespace|shopify|wordpress|cloudflare)/i;
const EMAIL_RE = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,24}/gi;

function normaliseSite(w) {
  if (!w) return null;
  let u = w.trim();
  if (!/^https?:\/\//i.test(u)) u = "https://" + u;
  try {
    const parsed = new URL(u);
    if (SOCIAL.test(parsed.hostname)) return null;
    return parsed;
  } catch {
    return null;
  }
}

async function get(u) {
  const ctl = new AbortController();
  const t = setTimeout(() => ctl.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(u, {
      signal: ctl.signal,
      redirect: "follow",
      headers: { "user-agent": UA, accept: "text/html,*/*" },
    });
    const type = res.headers.get("content-type") || "";
    if (!res.ok || !type.includes("html")) return null;
    const html = await res.text();
    return { html: html.slice(0, 1_500_000), finalUrl: res.url };
  } catch {
    return null;
  } finally {
    clearTimeout(t);
  }
}

/** Cloudflare's "email protection" hides addresses in a hex string. */
function decodeCf(hex) {
  try {
    const k = parseInt(hex.slice(0, 2), 16);
    let s = "";
    for (let i = 2; i < hex.length; i += 2) s += String.fromCharCode(parseInt(hex.slice(i, i + 2), 16) ^ k);
    return s;
  } catch {
    return "";
  }
}

function emailsIn(html) {
  const found = new Set();
  const text = html
    .replace(/&#64;|&#x40;|\s*\[at\]\s*|\s*\(at\)\s*/gi, "@")
    .replace(/&#46;|\s*\[dot\]\s*|\s*\(dot\)\s*/gi, ".");
  for (const m of text.matchAll(/mailto:([^"'?>\s]+)/gi)) found.add(decodeURIComponent(m[1]));
  for (const m of text.matchAll(/data-cfemail="([0-9a-f]+)"/gi)) found.add(decodeCf(m[1]));
  for (const m of text.matchAll(/\/cdn-cgi\/l\/email-protection#([0-9a-f]+)/gi)) found.add(decodeCf(m[1]));
  for (const m of text.matchAll(EMAIL_RE)) found.add(m[0]);
  return [...found]
    .map((e) => e.trim().toLowerCase().replace(/^mailto:/, "").replace(/[.,;:]+$/, ""))
    .filter((e) => /^[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,24}$/.test(e) && !JUNK_EMAIL.test(e));
}

function contactLinks(html, base) {
  const out = new Set();
  for (const m of html.matchAll(/href=["']([^"'#]+)["']/gi)) {
    const href = m[1];
    if (!/contact|about|location|visit|hours|find-us|store-info/i.test(href)) continue;
    try {
      const u = new URL(href, base);
      if (u.hostname.replace(/^www\./, "") === base.hostname.replace(/^www\./, "")) out.add(u.href);
    } catch {}
    if (out.size >= 3) break;
  }
  return [...out];
}

/** Best address first: on the shop's own domain, then a friendly inbox name. */
function rank(emails, host) {
  const domain = host.replace(/^www\./, "");
  const score = (e) => {
    let s = 0;
    const [local, d] = e.split("@");
    if (d === domain || domain.endsWith("." + d) || d.endsWith("." + domain)) s += 10;
    if (/^(info|contact|hello|store|shop|sales|orders|fish|aquarium|office|mail)/.test(local)) s += 3;
    if (/(gmail|yahoo|hotmail|outlook|aol|icloud|comcast|att|sbcglobal)\./.test(d)) s += 1;
    if (/(support|help|careers|jobs|hr|billing|accounting|marketing|press)/.test(local)) s -= 3;
    return s;
  };
  return [...new Set(emails)].sort((a, b) => score(b) - score(a));
}

async function findEmail(site) {
  const home = await get(site.href);
  if (!home) return { status: "unreachable" };
  const base = new URL(home.finalUrl);
  if (SOCIAL.test(base.hostname)) return { status: "social-only" };
  let emails = emailsIn(home.html);
  let from = home.finalUrl;
  if (emails.length === 0) {
    const pages = [
      ...contactLinks(home.html, base),
      new URL("/contact", base).href,
      new URL("/contact-us", base).href,
    ];
    for (const p of [...new Set(pages)].slice(0, 4)) {
      const page = await get(p);
      if (!page) continue;
      const e = emailsIn(page.html);
      if (e.length) {
        emails = e;
        from = page.finalUrl;
        break;
      }
    }
  }
  if (!emails.length) return { status: "no-email" };
  const ranked = rank(emails, base.hostname);
  return { status: "found", email: ranked[0], all: ranked.slice(0, 5), from };
}

// ---------------------------------------------------------------- run
const progress = existsSync(PROGRESS) ? JSON.parse(readFileSync(PROGRESS, "utf8")) : {};
const save = () => writeFileSync(PROGRESS, JSON.stringify(progress));

const stores = await allStores();
const todo = stores.filter((s) => !progress[s.id]);
console.log(`${stores.length} shops${ONLY ? ` in ${ONLY}` : ""}. ${todo.length} still to check.`);

let done = 0;
let found = 0;
async function worker() {
  while (todo.length) {
    const s = todo.shift();
    const site = normaliseSite(s.website);
    let r;
    if (!s.website) r = { status: "no-website" };
    else if (!site) r = { status: "social-only" };
    else r = await findEmail(site);
    progress[s.id] = { ...r, at: new Date().toISOString() };
    done++;
    if (r.status === "found") found++;
    if (done % 25 === 0) {
      save();
      process.stdout.write(`  ${done} checked, ${found} emails found\n`);
    }
  }
}
await Promise.all(Array.from({ length: CONCURRENCY }, worker));
save();

// ---------------------------------------------------------------- output
const esc = (v) => {
  const s = v == null ? "" : String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};
const header = [
  "name", "email", "other_emails", "street", "city", "state", "zip", "phone",
  "website", "page", "claimed", "email_status", "email_found_on",
];
const lines = [header.join(",")];
const counts = {};
let mailable = 0;
for (const s of stores) {
  const p = progress[s.id] || {};
  counts[p.status || "unchecked"] = (counts[p.status || "unchecked"] || 0) + 1;
  const street = streetFor(s);
  const zip = zipFor(s);
  if (street && s.city && s.state && zip) mailable++;
  lines.push(
    [
      s.name, p.email || "", (p.all || []).slice(1).join(" "), street, s.city, s.state, zip, s.phone,
      s.website, `https://www.undergroundaquarium.com/stores/${s.slug}`, s.claimed_by ? "yes" : "no",
      p.status || "", p.from || "",
    ].map(esc).join(",")
  );
}
writeFileSync(OUT, lines.join("\n"));

console.log(`\nWrote ${OUT}`);
console.log(`  With an email:            ${counts.found || 0}`);
console.log(`  Site had no email:        ${counts["no-email"] || 0}`);
console.log(`  Site didn't load:         ${counts.unreachable || 0}`);
console.log(`  Facebook/Instagram only:  ${counts["social-only"] || 0}`);
console.log(`  No website at all:        ${counts["no-website"] || 0}`);
console.log(`  Full mailing address:     ${mailable} of ${stores.length}`);

if (WRITE) {
  const rows = stores
    .filter((s) => progress[s.id])
    .map((s) => {
      const p = progress[s.id];
      return {
        store_id: s.id,
        email: p.email || null,
        other_emails: p.all ? p.all.slice(1) : [],
        email_status: p.status,
        email_source_url: p.from || null,
        mail_street: streetFor(s) || null,
        mail_zip: zipFor(s) || null,
        checked_at: p.at,
      };
    });
  for (let i = 0; i < rows.length; i += 500) {
    const { error } = await supabase.from("store_contacts").upsert(rows.slice(i, i + 500), { onConflict: "store_id" });
    if (error) {
      console.error("Save failed:", error.message);
      process.exit(1);
    }
  }
  console.log(`Saved ${rows.length} rows to store_contacts.`);
}
