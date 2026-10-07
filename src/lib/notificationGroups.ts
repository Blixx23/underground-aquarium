/**
 * The categories members can switch on or off, for the bell and for email.
 * Shared by the settings panel and the email job, so both always agree.
 */

export type NotificationGroup = {
  key: string;
  label: string;
  sub: string;
  /** Notification types in this group. Empty for messages, which never use the bell. */
  types: string[];
  /** False when the bell can't be switched off here (messages live on the Messages icon). */
  bell?: boolean;
};

export const NOTIFICATION_GROUPS: NotificationGroup[] = [
  { key: "messages", label: "Messages", sub: "A member messages you or asks about your listing", types: [], bell: false },
  { key: "feed_comments", label: "Feed comments", sub: "Someone comments on your post or replies to your comment", types: ["feed_comment", "feed_reply"] },
  { key: "mentions", label: "Mentions", sub: "Someone tags you with @ in a post or comment", types: ["mention"] },
  { key: "forum", label: "Forum replies", sub: "Someone replies to your post or comment", types: ["forum"] },
  { key: "feed_likes", label: "Feed likes", sub: "Someone likes your post, tank, listing or comment", types: ["feed_like", "feed_comment_like"] },
  { key: "trophy", label: "Trophies and new tiers", sub: "You earn a new trophy or reach a new bubbles tier", types: ["trophy"] },
  { key: "bubbles", label: "Bubbles", sub: "You earn bubbles for something you did", types: ["bubbles"] },
  { key: "library", label: "Your contributions", sub: "Species, photos, videos and shops you suggested are approved", types: ["species_request", "species_photo", "species_video", "store_suggestion"] },
  { key: "store_post", label: "Shop updates", sub: "A shop you follow posts something", types: ["store_post"] },
  { key: "reviews", label: "Review replies", sub: "A shop replies to a review you wrote", types: ["review", "review_response"] },
  { key: "shop_review", label: "Your shop: new reviews", sub: "Someone reviews a shop you run", types: ["shop_review"] },
  { key: "shop_fix", label: "Your shop: listing reports", sub: "A shopper says your hours, address or details are wrong", types: ["shop_fix"] },
  { key: "shop_milestone", label: "Your shop: milestones", sub: "Your shop passes a views or followers milestone", types: ["shop_milestone"] },
  { key: "shop_weekly", label: "Your shop: weekly report", sub: "Monday morning: views, calls, directions and a tip", types: ["shop_weekly"] },
  { key: "society", label: "Society", sub: "Membership applications, dues and Society notices", types: ["club_application", "club_dues", "club_approved", "club_honorary"] },
  { key: "events", label: "Events", sub: "Events you're part of", types: ["event"] },
  { key: "site", label: "Site news", sub: "Occasional news from Underground Aquarium", types: ["site"] },
];

/** Always delivered, by bell and email: they're about the member's own account. */
export const ALWAYS_TYPES = ["moderation", "report"];

/** Which group a notification type belongs to, or null for the always-on ones. */
export function groupFor(type: string | null | undefined): string | null {
  const t = type ?? "";
  if (ALWAYS_TYPES.includes(t)) return null;
  const g = NOTIFICATION_GROUPS.find((x) => x.types.includes(t));
  if (g) return g.key;
  if (t.startsWith("club_")) return "society";
  if (t.startsWith("species_")) return "library";
  return "site";
}

export const DIGEST_CHOICES = [
  { key: "bundled", label: "As it happens", sub: "Bundled, at most one email an hour" },
  { key: "daily", label: "Once a day", sub: "One email each morning" },
  { key: "off", label: "Never", sub: "Only the bell on the site" },
] as const;

export type DigestChoice = (typeof DIGEST_CHOICES)[number]["key"];

/** What a new member starts with: likes and bubbles are frequent, so the bell covers them. */
export const DEFAULT_EMAIL_OFF = ["feed_likes", "bubbles"];
