import "server-only";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { emailLayout, sendEmail } from "@/lib/email";
import { dispatchToEach, unsubscribeUrlFor, type Recipient } from "@/lib/email/queue";
import { suppressedSet } from "@/lib/email/suppress";

const SITE = "https://www.undergroundaquarium.com";
const KIND = "welcome";
/** Only accounts made this recently get it, so an old member signing in with Google never does. */
const NEW_ACCOUNT_MS = 3 * 24 * 60 * 60 * 1000;

const C = {
  ink: "#0c2740",
  body: "#41566a",
  muted: "#7d8c99",
  accent: "#0e6e8c",
  hair: "#e6ecf1",
  wash: "#f3f7fa",
  deep: "#0a1f33",
};

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

// The tour. Order is what a new member most likely came for first.
const FEATURES: { emoji: string; title: string; text: string; path: string }[] = [
  { emoji: "📍", title: "Shops Near Me", text: "Every local fish store on one map, with reviews.", path: "/stores?near=1" },
  { emoji: "🏷️", title: "Free Classifieds", text: "Buy and sell fish, plants and gear locally. Free to post.", path: "/marketplace" },
  { emoji: "🧪", title: "Tank Builder", text: "Check if your fish get along, how full the tank is, and the gear you need.", path: "/tank-builder" },
  { emoji: "💧", title: "Water Check", text: "Type in your test results and get a plain-English fix.", path: "/water-check" },
  { emoji: "🐟", title: "Fish Species", text: "Care guides for fish, shrimp and snails.", path: "/species" },
  { emoji: "🥚", title: "Breeding Guides", text: "Breed it, log it, and get certified.", path: "/breeding" },
  { emoji: "💬", title: "Forums and Feed", text: "Ask questions, show off your tank, help someone out.", path: "/forums" },
  { emoji: "🎓", title: "Courses", text: "Free lessons from first tank to advanced keeping.", path: "/courses" },
  { emoji: "📅", title: "Events", text: "Fish events and club meetings near you.", path: "/events" },
  { emoji: "🏆", title: "Bubbles and Trophies", text: "Earn bubbles for helping and posting, and unlock trophies.", path: "/trophies" },
];

function tile(f: (typeof FEATURES)[number]): string {
  return `
    <td valign="top" width="50%" style="width:50%;padding:6px;">
      <a href="${SITE}${f.path}" style="display:block;text-decoration:none;background:${C.wash};border:1px solid ${C.hair};border-radius:12px;padding:14px 14px 13px;">
        <div style="font-size:22px;line-height:1;">${f.emoji}</div>
        <div style="margin-top:8px;font-family:Helvetica,Arial,sans-serif;font-size:15px;font-weight:700;line-height:1.3;color:${C.ink};">${f.title}</div>
        <div style="margin-top:4px;font-family:Helvetica,Arial,sans-serif;font-size:13px;line-height:1.5;color:${C.body};">${f.text}</div>
      </a>
    </td>`;
}

/**
 * `existing` is the one-time send to members who joined before this email
 * existed: different opening line, honest footer, and an unsubscribe link.
 */
export function welcomeEmail(
  username: string | null,
  opts: { existing?: boolean; email?: string } = {}
): { subject: string; html: string } {
  const name = username ? esc(username) : null;
  const rows: string[] = [];
  for (let i = 0; i < FEATURES.length; i += 2) {
    rows.push(`<tr>${tile(FEATURES[i])}${FEATURES[i + 1] ? tile(FEATURES[i + 1]) : '<td width="50%"></td>'}</tr>`);
  }

  const bodyHtml = `
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-top:4px;">
      ${rows.join("")}
    </table>

    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-top:22px;">
      <tr>
        <td bgcolor="${C.deep}" style="background:${C.deep};border-radius:12px;padding:20px 22px;">
          <div style="font-family:Georgia,'Times New Roman',serif;font-size:18px;line-height:1.3;color:#f0d78c;">The Society</div>
          <div style="margin-top:6px;font-family:Helvetica,Arial,sans-serif;font-size:14px;line-height:1.6;color:#c2e4fa;">
            Our members' club for serious keepers: certificates, records and a gold ring on your profile.
            <a href="${SITE}/society" style="color:#7fd3f5;text-decoration:underline;">Take a look</a>.
          </div>
        </td>
      </tr>
    </table>

    <p style="margin:24px 0 0;font-family:Helvetica,Arial,sans-serif;font-size:15px;line-height:1.6;color:${C.body};">
      <strong style="color:${C.ink};">Three quick wins to start:</strong> add a photo to your profile, post your tank in the
      <a href="${SITE}/feed" style="color:${C.accent};">Feed</a>, and find your nearest
      <a href="${SITE}/stores?near=1" style="color:${C.accent};">fish store</a>.
    </p>`;

  return {
    subject: opts.existing
      ? name
        ? `${username}, here's everything on Underground Aquarium`
        : "Here's everything on Underground Aquarium"
      : name
      ? `Welcome to Underground Aquarium, ${username}`
      : "Welcome to Underground Aquarium",
    html: emailLayout({
      preheader: "Shops near you, free classifieds, a tank planner and a whole community of fishkeepers.",
      title: opts.existing
        ? name
          ? `Thanks for being here early, ${name} 🐠`
          : "Thanks for being here early 🐠"
        : name
        ? `Welcome aboard, ${name} 🐠`
        : "Welcome aboard 🐠",
      intro: opts.existing
        ? "You were one of the first to join, and the site has grown a lot since. Here's everything you can do now, all free. Tap any tile to dive in."
        : "You just joined the one place built for the aquarium hobby. Here's everything you can do, all free. Tap any tile to dive in.",
      bodyHtml,
      cta: { label: "Explore Underground Aquarium", url: `${SITE}/feed` },
      footerNote: opts.existing
        ? `You're getting this one-time update because you have an account on Underground Aquarium.${
            opts.email ? ` <a href="${unsubscribeUrlFor(opts.email)}" style="color:${C.muted};">Unsubscribe</a> from updates like this.` : ""
          } Questions? Write to <a href="mailto:support@undergroundaquarium.com" style="color:${C.accent};text-decoration:none;">support@undergroundaquarium.com</a>.`
        : `You're getting this one-time welcome because you just made an account. Questions? Write to <a href="mailto:support@undergroundaquarium.com" style="color:${C.accent};text-decoration:none;">support@undergroundaquarium.com</a>.`,
    }),
  };
}

/**
 * Send the welcome email once per new member. Safe to call on every sign-in:
 * it skips old accounts and anyone who already got one, and never throws.
 */
export async function sendWelcomeOnce(userId: string): Promise<void> {
  try {
    const { data: auth } = await supabaseAdmin.auth.admin.getUserById(userId);
    const user = auth?.user;
    if (!user?.email || !user.email_confirmed_at) return;
    if (Date.now() - new Date(user.created_at).getTime() > NEW_ACCOUNT_MS) return;

    const email = user.email.trim().toLowerCase();
    const { count } = await supabaseAdmin
      .from("email_queue")
      .select("id", { count: "exact", head: true })
      .eq("kind", KIND)
      .eq("to_email", email);
    if ((count ?? 0) > 0) return;

    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("username, needs_username, deleted_at, suspended_at")
      .eq("id", userId)
      .maybeSingle();
    // Google sign-ups get it after they pick a username, so it can greet them by name.
    if (!profile || profile.needs_username || profile.deleted_at || profile.suspended_at) return;

    const { subject, html } = welcomeEmail(profile.username ?? null);
    await sendEmail({ to: email, subject, html, kind: KIND });
  } catch (e) {
    console.error("[welcome] could not send:", e);
  }
}

/**
 * One-time catch-up: the welcome email for members who joined before it
 * existed. Skips anyone who already got one, unconfirmed, suspended or
 * deleted accounts, and anyone who unsubscribed or bounced. Goes through
 * the queue, so the worker sends it in paced batches. `dry` only counts.
 */
export async function welcomeExistingMembers({ dry = true }: { dry?: boolean } = {}) {
  // Every confirmed account, a page at a time.
  const users: { id: string; email: string }[] = [];
  for (let page = 1; page <= 100; page++) {
    const { data, error } = await supabaseAdmin.auth.admin.listUsers({ page, perPage: 1000 });
    if (error) throw new Error(error.message);
    for (const u of data.users) {
      if (u.email && u.email_confirmed_at) users.push({ id: u.id, email: u.email.trim().toLowerCase() });
    }
    if (data.users.length < 1000) break;
  }

  const profiles = new Map<string, { username: string | null; ok: boolean }>();
  for (let from = 0; ; from += 1000) {
    const { data, error } = await supabaseAdmin
      .from("profiles")
      .select("id, username, needs_username, deleted_at, suspended_at")
      .range(from, from + 999);
    if (error) throw new Error(error.message);
    for (const p of data ?? []) {
      profiles.set(p.id, { username: p.username ?? null, ok: !p.needs_username && !p.deleted_at && !p.suspended_at });
    }
    if (!data || data.length < 1000) break;
  }

  const already = new Set<string>();
  for (let from = 0; ; from += 1000) {
    const { data, error } = await supabaseAdmin
      .from("email_queue")
      .select("to_email")
      .eq("kind", KIND)
      .range(from, from + 999);
    if (error) throw new Error(error.message);
    for (const r of data ?? []) already.add(String(r.to_email).toLowerCase());
    if (!data || data.length < 1000) break;
  }

  const eligible = users.filter((u) => profiles.get(u.id)?.ok && !already.has(u.email));
  // A catch-up nobody asked for today respects marketing opt-outs, not just bounces.
  const blocked = await suppressedSet(eligible.map((u) => u.email), "marketing");
  const send = eligible.filter((u) => !blocked.has(u.email));

  const summary = {
    accounts: users.length,
    alreadyWelcomed: users.filter((u) => already.has(u.email)).length,
    optedOutOrBounced: blocked.size,
    willSend: send.length,
  };
  if (dry) return { dry: true, ...summary };

  const recipients: Recipient[] = send.map((u) => {
    const { subject, html } = welcomeEmail(profiles.get(u.id)?.username ?? null, { existing: true, email: u.email });
    return { email: u.email, subject, html, context: { user_id: u.id, catchup: true } };
  });
  const result = await dispatchToEach({ kind: KIND, recipients, batchKey: "welcome-catchup-2026-10" });
  return { dry: false, ...summary, ...result };
}
