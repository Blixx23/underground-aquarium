import "server-only";
import { promises as dns } from "node:dns";
import { normaliseEmail } from "@/lib/email/address";

/**
 * Can this address's domain receive mail at all?
 *
 * Shop emails come from public listings and go stale: shops close,
 * domains lapse, sites get parked. Sending to those is what pushes the
 * bounce rate up, and each one only bounces once before the webhook
 * blocks it, so the damage is done on the first send. A DNS lookup
 * before that first send catches most of them for free.
 *
 *   "ok"      the domain publishes a mail server
 *   "dead"    the domain doesn't exist, has no mail server, or says
 *             outright that it takes no mail (a "null MX")
 *   "unknown" the lookup timed out or DNS had a hiccup; try next run,
 *             and never block an address on a guess
 *
 * A domain with no MX record could in theory take mail on its main
 * address, but in practice that is almost always a parked or dead
 * site, so it counts as dead here.
 */
export type DomainCheck = "ok" | "dead" | "unknown";

/** Big providers always take mail; no point looking them up. */
export const KNOWN_GOOD = new Set([
  "gmail.com", "googlemail.com", "yahoo.com", "ymail.com", "hotmail.com", "outlook.com",
  "live.com", "msn.com", "aol.com", "icloud.com", "me.com", "mac.com", "comcast.net",
  "att.net", "sbcglobal.net", "verizon.net", "protonmail.com", "proton.me", "gmx.com",
  "mail.com", "zoho.com", "cox.net", "charter.net", "bellsouth.net", "earthlink.net",
]);

/** Gmail, Yahoo, Outlook and the like: a real mailbox there almost never bounces. */
export function isBigProvider(email: string): boolean {
  return KNOWN_GOOD.has(domainOf(email));
}

/** Answers that mean "this domain has no mail server", not "DNS is having a bad day". */
const DEAD_CODES = new Set(["ENOTFOUND", "ENODATA", "NXDOMAIN"]);

const LOOKUP_TIMEOUT_MS = 2500;
const CONCURRENCY = 30;

export function domainOf(email: string): string {
  const at = email.lastIndexOf("@");
  return at === -1 ? "" : normaliseEmail(email.slice(at + 1)).replace(/\.$/, "");
}

async function lookup(domain: string): Promise<DomainCheck> {
  if (!domain || !domain.includes(".")) return "dead";
  if (KNOWN_GOOD.has(domain)) return "ok";

  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    const records = await Promise.race([
      dns.resolveMx(domain),
      new Promise<never>((_, reject) => {
        timer = setTimeout(() => reject(Object.assign(new Error("timeout"), { code: "ETIMEOUT" })), LOOKUP_TIMEOUT_MS);
      }),
    ]);
    if (records.length === 0) return "dead";
    // Null MX (RFC 7505): the domain's way of saying it accepts no mail.
    if (records.every((r) => !r.exchange || r.exchange === ".")) return "dead";
    return "ok";
  } catch (err) {
    const code = String((err as { code?: string }).code ?? "");
    return DEAD_CODES.has(code) ? "dead" : "unknown";
  } finally {
    if (timer) clearTimeout(timer);
  }
}

/**
 * Check every address's domain, one lookup per domain.
 *
 * The planner runs with a 60 second limit, so this stops starting new
 * lookups after `budgetMs` and at `maxDomains`. Anything not looked up
 * comes back "unknown" and simply waits for the next run.
 */
export async function checkDomains(
  emails: string[],
  opts: { maxDomains?: number; budgetMs?: number } = {}
): Promise<Map<string, DomainCheck>> {
  const maxDomains = opts.maxDomains ?? 300;
  const deadline = Date.now() + (opts.budgetMs ?? 20_000);

  const domains = [...new Set(emails.map(domainOf))];
  const result = new Map<string, DomainCheck>();
  const todo = domains.slice(0, maxDomains);
  for (const d of domains.slice(maxDomains)) result.set(d, "unknown");

  let next = 0;
  async function worker() {
    while (next < todo.length) {
      const d = todo[next++];
      result.set(d, Date.now() > deadline ? "unknown" : await lookup(d));
    }
  }
  await Promise.all(Array.from({ length: Math.min(CONCURRENCY, todo.length) }, worker));

  const byEmail = new Map<string, DomainCheck>();
  for (const e of emails) byEmail.set(normaliseEmail(e), result.get(domainOf(e)) ?? "unknown");
  return byEmail;
}
