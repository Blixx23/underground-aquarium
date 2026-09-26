/**
 * Shared bits for the notification bell and the notifications page: what a
 * notification looks like, how each kind is shown, and how lists are grouped.
 */

export type Notification = {
  id: string;
  type: string | null;
  title: string;
  body: string | null;
  link: string | null;
  read: boolean;
  created_at: string;
};

export const NOTIFICATION_COLUMNS = "id, type, title, body, link, read, created_at";

export type Tone = "sky" | "amber" | "cyan" | "emerald" | "gold" | "coral" | "violet";
export type IconKey = "forum" | "trophy" | "bubbles" | "message" | "store" | "review" | "society" | "sale" | "event" | "heart" | "comment" | "bell";

type KindMeta = { icon: IconKey; tone: Tone; category: CategoryKey; label: string; mutable?: boolean };

export type CategoryKey = "feed" | "forums" | "trophies" | "society" | "shops" | "marketplace" | "other";

/** Filter chips on the notifications page. */
export const CATEGORIES: { key: CategoryKey; label: string }[] = [
  { key: "feed", label: "Feed" },
  { key: "forums", label: "Forums" },
  { key: "trophies", label: "Trophies" },
  { key: "society", label: "Society" },
  { key: "shops", label: "Shops" },
  { key: "marketplace", label: "Marketplace" },
];

const KINDS: Record<string, KindMeta> = {
  forum: { icon: "forum", tone: "sky", category: "forums", label: "forum replies", mutable: true },
  trophy: { icon: "trophy", tone: "amber", category: "trophies", label: "trophies", mutable: true },
  bubbles: { icon: "bubbles", tone: "cyan", category: "trophies", label: "bubbles", mutable: true },
  message: { icon: "message", tone: "violet", category: "marketplace", label: "messages" },
  sale: { icon: "sale", tone: "emerald", category: "marketplace", label: "sales" },
  express: { icon: "sale", tone: "emerald", category: "marketplace", label: "payouts" },
  account_onboarding: { icon: "sale", tone: "emerald", category: "marketplace", label: "seller account" },
  store_post: { icon: "store", tone: "emerald", category: "shops", label: "shop updates", mutable: true },
  review: { icon: "review", tone: "amber", category: "shops", label: "shop reviews", mutable: true },
  review_response: { icon: "review", tone: "amber", category: "shops", label: "review replies", mutable: true },
  event: { icon: "event", tone: "coral", category: "other", label: "events" },
  species_request: { icon: "trophy", tone: "emerald", category: "trophies", label: "species requests" },
  species_photo: { icon: "trophy", tone: "emerald", category: "trophies", label: "species photos" },
  feed_like: { icon: "heart", tone: "coral", category: "feed", label: "likes", mutable: true },
  feed_comment: { icon: "comment", tone: "sky", category: "feed", label: "comments", mutable: true },
  feed_reply: { icon: "comment", tone: "sky", category: "feed", label: "comment replies", mutable: true },
  feed_comment_like: { icon: "heart", tone: "coral", category: "feed", label: "comment likes", mutable: true },
};

export function kindOf(type: string | null | undefined): KindMeta {
  const t = type ?? "";
  if (KINDS[t]) return KINDS[t];
  if (t.startsWith("club_")) return { icon: "society", tone: "gold", category: "society", label: "Society notices", mutable: true };
  return { icon: "bell", tone: "sky", category: "other", label: "these" };
}

export function timeAgo(iso: string): string {
  const s = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 60) return "just now";
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h`;
  const d = Math.floor(h / 24);
  if (d < 7) return `${d}d`;
  const w = Math.floor(d / 7);
  if (w < 5) return `${w}w`;
  return new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

/** Today / Yesterday / This week / Earlier, keeping the list's order. */
export function groupByDay(items: Notification[]): { label: string; items: Notification[] }[] {
  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);
  const t0 = startOfToday.getTime();
  const day = 86_400_000;
  const buckets: { label: string; test: (t: number) => boolean }[] = [
    { label: "Today", test: (t) => t >= t0 },
    { label: "Yesterday", test: (t) => t >= t0 - day },
    { label: "This week", test: (t) => t >= t0 - 6 * day },
    { label: "Earlier", test: () => true },
  ];
  const out = buckets.map((b) => ({ label: b.label, items: [] as Notification[] }));
  for (const n of items) {
    const t = new Date(n.created_at).getTime();
    const i = buckets.findIndex((b) => b.test(t));
    out[i].items.push(n);
  }
  return out.filter((g) => g.items.length > 0);
}
