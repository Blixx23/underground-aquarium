import "server-only";
import { checkEmail, normaliseEmail } from "@/lib/email/address";

/**
 * Extra care for addresses we write to first (shop outreach and other bulk
 * mail). These come from public websites, not from the person typing them
 * in, so they carry website-builder placeholders and scraping mistakes that
 * a member's own address never would. Kept out of checkEmail on purpose so
 * a member's real address is never second-guessed.
 */

// Domains that appear in website templates and scraped page code, never in
// a real shop's contact address.
const PLACEHOLDER_DOMAINS = new Set([
  "example.com", "example.org", "example.net", "domain.com", "yourdomain.com", "yourdomain.net",
  "mydomain.com", "mystore.com", "yourstore.com", "mysite.com", "yoursite.com", "yourwebsite.com",
  "mywebsite.com", "website.com", "yourcompany.com", "company.com", "yourbusiness.com", "email.tld",
  "sentry.io", "wixpress.com", "sentry-next.wixpress.com", "squarespace.com", "godaddy.com",
]);

// "your@", "youremail@", "name@": the template text nobody replaced.
const PLACEHOLDER_LOCAL = /^(your|you|youremail|yourname|name|email|user|username|someone|example|sample|test|firstname|first\.last)$/;

// Scraped image and script names that look like addresses: logo@2x.png.
const FILE_ENDING = /\.(png|jpe?g|gif|webp|svg|ico|js|css|pdf)$/;

/** Fix the harmless slips ("mailto:", "<...>", "@www.shop.com") and lower-case it. */
export function tidyOutreachEmail(raw: string): string {
  let e = normaliseEmail(raw).replace(/^mailto:/, "").replace(/^<|>$/g, "").replace(/[.,;:]+$/, "");
  const at = e.lastIndexOf("@");
  // Nobody's mailbox lives at www.; that's the website's address typed in.
  if (at > 0 && e.slice(at + 1).startsWith("www.")) e = `${e.slice(0, at + 1)}${e.slice(at + 5)}`;
  return e;
}

/** Why this tidied address must never get outreach, or null when it's fine to try. */
export function outreachProblem(email: string): string | null {
  const c = checkEmail(email);
  if (!c.ok || !c.value) return c.reason ?? "No address.";
  const at = email.lastIndexOf("@");
  const local = email.slice(0, at);
  const domain = email.slice(at + 1);
  if (PLACEHOLDER_DOMAINS.has(domain) || [...PLACEHOLDER_DOMAINS].some((d) => domain.endsWith(`.${d}`)))
    return `Placeholder address from a website template (${domain})`;
  if (PLACEHOLDER_LOCAL.test(local)) return `Placeholder address from a website template (${local}@)`;
  if (FILE_ENDING.test(domain)) return "Not an email address (a file name scraped from a web page)";
  return null;
}
