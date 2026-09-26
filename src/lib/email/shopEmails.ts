import "server-only";
import { emailCallout, emailLayout, emailStats } from "@/lib/email";

/**
 * Emails to shop owners. Same look as the rest of the site's mail, with
 * a big-number hero for the headline figure. Every piece of text that a
 * member wrote (review text, a fix report) is escaped before it goes in.
 */

const SITE = "https://www.undergroundaquarium.com";
const C = { ink: "#0c2740", muted: "#90a3b4", accent: "#0e6e8c", hair: "#e6ecf1", wash: "#f3f7fa", up: "#1f8a5b", down: "#b4553f", star: "#e0a526" };

export type ShopCard = { store_id: string; slug: string; name: string; city?: string | null; photo?: string | null };

export function esc(s: unknown): string {
  return String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function hero(big: string, label: string, sub?: string): string {
  return `
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 22px;">
    <tr>
      <td align="center" bgcolor="${C.wash}" style="background:${C.wash};border:1px solid ${C.hair};border-radius:14px;padding:26px 20px;">
        <div style="font-family:Georgia,'Times New Roman',serif;font-size:44px;line-height:1;color:${C.accent};font-weight:bold;">${big}</div>
        <div style="font-family:Helvetica,Arial,sans-serif;font-size:12px;letter-spacing:2px;text-transform:uppercase;color:${C.muted};margin-top:10px;">${label}</div>
        ${sub ? `<div style="font-family:Helvetica,Arial,sans-serif;font-size:14px;color:${C.ink};margin-top:8px;">${sub}</div>` : ""}
      </td>
    </tr>
  </table>`;
}

function shopHeader(card: ShopCard): string {
  const photo = card.photo
    ? `<td width="56" style="width:56px;padding-right:14px;vertical-align:middle;"><img src="${esc(card.photo)}" width="56" height="56" alt="" style="display:block;width:56px;height:56px;border-radius:12px;object-fit:cover;border:1px solid ${C.hair};"></td>`
    : "";
  return `
  <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 20px;">
    <tr>
      ${photo}
      <td style="vertical-align:middle;">
        <div style="font-family:Helvetica,Arial,sans-serif;font-size:11px;letter-spacing:2px;text-transform:uppercase;color:${C.muted};">Your shop</div>
        <div style="font-family:Georgia,'Times New Roman',serif;font-size:18px;color:${C.ink};margin-top:3px;">${esc(card.name)}${card.city ? `<span style="color:${C.muted};font-size:14px;"> · ${esc(card.city)}</span>` : ""}</div>
      </td>
    </tr>
  </table>`;
}

function stars(n: number): string {
  const k = Math.max(0, Math.min(5, Math.round(n)));
  return `<span style="color:${C.star};font-size:22px;letter-spacing:2px;">${"★".repeat(k)}</span><span style="color:${C.hair};font-size:22px;letter-spacing:2px;">${"★".repeat(5 - k)}</span>`;
}

function trend(now: number, before: number): string {
  if (!before) return now > 0 ? `<span style="color:${C.up};">new</span>` : "";
  const pct = Math.round(((now - before) / before) * 100);
  if (pct === 0) return `<span style="color:${C.muted};">same as last week</span>`;
  return pct > 0
    ? `<span style="color:${C.up};">▲ ${pct}%</span>`
    : `<span style="color:${C.down};">▼ ${Math.abs(pct)}%</span>`;
}

const footer = (card: ShopCard) =>
  `You're getting this because you run ${esc(card.name)} on Underground Aquarium. Choose which shop alerts you get in <a href="${SITE}/notifications#settings" style="color:${C.accent};">notification settings</a>.`;

export function reviewEmail(d: ShopCard & { rating: number; reviewer?: string; excerpt?: string }) {
  const quote = d.excerpt ? emailCallout(`${esc(d.reviewer ?? "A customer")} wrote`, `&ldquo;${esc(d.excerpt)}&rdquo;`) : "";
  return {
    subject: `New ${d.rating}-star review for ${d.name}`,
    html: emailLayout({
      preheader: d.excerpt ? d.excerpt.slice(0, 90) : `${d.reviewer ?? "A customer"} rated you ${d.rating} stars.`,
      title: `You have a new ${d.rating}-star review`,
      bodyHtml:
        shopHeader(d) +
        `<p style="margin:0 0 6px;">${stars(d.rating)}</p>` +
        quote +
        `<p style="margin:18px 0 20px;font-family:Helvetica,Arial,sans-serif;font-size:15px;line-height:1.6;color:#41566a;">Shoppers read replies. A quick thank-you, or a fix for a complaint, shows people the shop is run by someone who cares.</p>`,
      cta: { label: "Reply to this review", url: `${SITE}/my/shops/${d.slug}/reviews` },
      footerNote: footer(d),
    }),
  };
}

export function fixEmail(d: ShopCard & { what?: string; note?: string }) {
  return {
    subject: `A shopper says ${d.what ?? "your listing needs a fix"}`,
    html: emailLayout({
      preheader: `Check ${d.name}'s listing so nobody shows up to the wrong place or time.`,
      title: `A shopper says ${esc(d.what ?? "something on your listing is wrong")}`,
      bodyHtml:
        shopHeader(d) +
        (d.note ? emailCallout("What they said", esc(d.note)) : "") +
        `<p style="margin:18px 0 20px;font-family:Helvetica,Arial,sans-serif;font-size:15px;line-height:1.6;color:#41566a;">If it's right, update your listing so customers don't show up to a closed door. If it's wrong, there's nothing to do.</p>`,
      cta: { label: "Check your listing", url: `${SITE}/my/shops/${d.slug}/hours` },
      footerNote: footer(d),
    }),
  };
}

export function milestoneEmail(d: ShopCard & { metric: string; value: number; total: number }) {
  const views = d.metric === "views";
  const big = d.value.toLocaleString("en-US");
  return {
    subject: views ? `${d.name} just passed ${big} views` : `${big} people now follow ${d.name}`,
    html: emailLayout({
      preheader: views ? "Aquarists keep finding you." : "Every one of them sees your updates.",
      title: views ? "A milestone for your shop" : "Your following is growing",
      bodyHtml:
        shopHeader(d) +
        hero(big, views ? "Total page views" : "Followers") +
        `<p style="margin:0 0 20px;font-family:Helvetica,Arial,sans-serif;font-size:15px;line-height:1.6;color:#41566a;">${
          views
            ? "That's how many times aquarists have looked your shop up on Underground Aquarium. Share your page on your socials to keep it climbing."
            : "Followers see every update you post. A restock, a sale or a new arrival is the fastest way to bring them through the door."
        }</p>`,
      cta: views
        ? { label: "See your numbers", url: `${SITE}/my/shops/${d.slug}` }
        : { label: "Post an update", url: `${SITE}/my/shops/${d.slug}/updates` },
      footerNote: footer(d),
    }),
  };
}

export type WeeklyFacts = ShopCard & {
  week: Record<string, number>;
  prev: Record<string, number>;
  new_followers: number;
  followers: number;
  new_reviews: number;
  rating: number | null;
  reviews: number;
  unanswered: number;
  photos: number;
  has_hours: boolean;
  has_about: boolean;
  days_since_post: number | null;
  city_rank: number | null;
  city_shops: number | null;
  open_fixes: number;
};

/** The single most useful thing to do this week. */
export function weeklyTip(f: WeeklyFacts): { text: string; href: string } {
  const base = `/my/shops/${f.slug}`;
  if (f.open_fixes > 0) return { text: "A shopper flagged something on your listing. Take a look so nobody gets bad info.", href: `${base}/hours` };
  if (f.unanswered > 0)
    return { text: `${f.unanswered} review${f.unanswered === 1 ? " is" : "s are"} waiting for a reply. Shoppers read replies.`, href: `${base}/reviews` };
  if (!f.has_hours) return { text: "Add your opening hours. It's the first thing people check before driving over.", href: `${base}/hours` };
  if (f.photos === 0) return { text: "Add a few photos of your tanks and storefront so people know what to expect.", href: `${base}/photos` };
  if (f.days_since_post == null || f.days_since_post > 14)
    return { text: "Post a restock or new arrival. Your followers get it straight away.", href: `${base}/updates` };
  if (!f.has_about) return { text: "Write a short description of what makes your shop worth the trip.", href: `${base}/hours` };
  return { text: "Share your shop's page on Instagram or Facebook. Every visit counts toward your numbers.", href: base };
}

export function weeklySummary(f: WeeklyFacts) {
  const v = f.week.view ?? 0;
  const parts = [
    `${f.week.directions ?? 0} direction taps`,
    `${f.week.phone ?? 0} calls`,
    `${f.week.website ?? 0} website visits`,
  ];
  const rank =
    f.city_rank && f.city_shops && f.city_shops > 1 && v > 0 && f.city
      ? ` #${f.city_rank} of ${f.city_shops} shops in ${f.city}.`
      : "";
  return {
    title: `${f.name}: ${v.toLocaleString("en-US")} view${v === 1 ? "" : "s"} this week`,
    body: `${parts.join(", ")}.${rank}`,
  };
}

export function weeklyEmail(f: WeeklyFacts) {
  const v = f.week.view ?? 0;
  const tip = weeklyTip(f);
  const rankLine =
    f.city_rank && f.city_shops && f.city_shops > 1 && v > 0 && f.city
      ? `<p style="margin:0 0 18px;font-family:Helvetica,Arial,sans-serif;font-size:15px;color:${C.ink};text-align:center;">You were the <strong>#${f.city_rank}</strong> most-viewed of ${f.city_shops} shops in ${esc(f.city)} this week.</p>`
      : "";
  const row = (label: string, key: string) => {
    const now = f.week[key] ?? 0;
    const t = trend(now, f.prev[key] ?? 0);
    return [label, `${now.toLocaleString("en-US")}${t ? ` &nbsp;<span style="font-weight:normal;font-size:12px;">${t}</span>` : ""}`] as [string, string];
  };
  return {
    subject: `${f.name}: ${v.toLocaleString("en-US")} views this week`,
    html: emailLayout({
      preheader: `${f.week.directions ?? 0} direction taps, ${f.week.phone ?? 0} calls and ${f.week.website ?? 0} website visits.`,
      title: "Your week on Underground Aquarium",
      bodyHtml:
        shopHeader(f) +
        hero(v.toLocaleString("en-US"), "Page views this week", trend(v, f.prev.view ?? 0)) +
        rankLine +
        emailStats([
          row("Direction taps", "directions"),
          row("Calls", "phone"),
          row("Website visits", "website"),
          ["New followers", `${f.new_followers} <span style="font-weight:normal;color:${C.muted};">(${f.followers} total)</span>`],
          [
            "Reviews",
            f.reviews
              ? `${f.rating ?? "–"} ★ from ${f.reviews}${f.new_reviews ? ` <span style="font-weight:normal;color:${C.up};">+${f.new_reviews} this week</span>` : ""}`
              : "None yet",
          ],
        ]) +
        emailCallout("This week's tip", esc(tip.text)),
      cta: { label: "Open your shop dashboard", url: `${SITE}/my/shops/${f.slug}` },
      footerNote: footer(f),
    }),
  };
}
