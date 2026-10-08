import "server-only";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { emailLayout, sendEmail } from "@/lib/email";

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

export function welcomeEmail(username: string | null): { subject: string; html: string } {
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
    subject: name ? `Welcome to Underground Aquarium, ${username}` : "Welcome to Underground Aquarium",
    html: emailLayout({
      preheader: "Shops near you, free classifieds, a tank planner and a whole community of fishkeepers.",
      title: name ? `Welcome aboard, ${name} 🐠` : "Welcome aboard 🐠",
      intro:
        "You just joined the one place built for the aquarium hobby. Here's everything you can do, all free. Tap any tile to dive in.",
      bodyHtml,
      cta: { label: "Explore Underground Aquarium", url: `${SITE}/feed` },
      footerNote:
        `You're getting this one-time welcome because you just made an account. Questions? Write to <a href="mailto:support@undergroundaquarium.com" style="color:${C.accent};text-decoration:none;">support@undergroundaquarium.com</a>.`,
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
