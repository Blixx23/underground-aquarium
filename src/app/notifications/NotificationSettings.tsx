"use client";

import { useEffect, useMemo, useState } from "react";
import { Settings2, Loader2, ChevronDown } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

/** What people can switch off. Each group covers one or more notification types. */
const GROUPS: { key: string; label: string; sub: string; types: string[] }[] = [
  { key: "feed_likes", label: "Feed likes", sub: "Someone likes your post, tank, listing or comment", types: ["feed_like", "feed_comment_like"] },
  { key: "feed_comments", label: "Feed comments", sub: "Someone comments on your post or replies to your comment", types: ["feed_comment", "feed_reply"] },
  { key: "mentions", label: "Mentions", sub: "Someone tags you with @ in a post or comment", types: ["mention"] },
  { key: "forum", label: "Forum replies", sub: "Someone replies to your post or comment", types: ["forum"] },
  { key: "trophy", label: "Trophies", sub: "You earn a new trophy", types: ["trophy"] },
  { key: "bubbles", label: "Bubbles", sub: "You earn bubbles or reach a new tier", types: ["bubbles"] },
  { key: "store_post", label: "Shop updates", sub: "A shop you follow posts something", types: ["store_post"] },
  { key: "reviews", label: "Review replies", sub: "A shop replies to a review you wrote", types: ["review", "review_response"] },
  { key: "shop_review", label: "Your shop: new reviews", sub: "Someone reviews a shop you run. In-app and by email", types: ["shop_review"] },
  { key: "shop_fix", label: "Your shop: listing reports", sub: "A shopper says your hours, address or details are wrong", types: ["shop_fix"] },
  { key: "shop_milestone", label: "Your shop: milestones", sub: "Your shop passes a views or followers milestone", types: ["shop_milestone"] },
  { key: "shop_weekly", label: "Your shop: weekly report", sub: "Monday morning: views, calls, directions and a tip", types: ["shop_weekly"] },
  { key: "society", label: "Society", sub: "Membership applications and dues", types: ["club_application", "club_dues", "club_approved", "club_honorary"] },
];

export default function NotificationSettings({
  userId,
  initialMuted,
}: {
  userId: string;
  initialMuted: string[];
}) {
  const supabase = useMemo(() => createClient(), []);
  const [open, setOpen] = useState(false);
  const [muted, setMuted] = useState<string[]>(initialMuted);
  const [saving, setSaving] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // The gear in the bell links to /notifications#settings: open straight to it.
  useEffect(() => {
    if (window.location.hash === "#settings") setOpen(true);
  }, []);

  async function toggle(group: (typeof GROUPS)[number]) {
    setError(null);
    const isOn = !group.types.every((t) => muted.includes(t));
    const next = isOn
      ? [...new Set([...muted, ...group.types])]
      : muted.filter((t) => !group.types.includes(t));
    setSaving(group.key);
    const prev = muted;
    setMuted(next);
    const { error: e } = await supabase
      .from("profiles")
      .update({ muted_notifications: next })
      .eq("id", userId);
    if (e) {
      setMuted(prev);
      setError("Couldn't save that. Try again.");
    }
    setSaving(null);
  }

  return (
    <div className="mb-6 rounded-2xl border border-ocean-800/60 bg-ocean-900/40">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex w-full items-center justify-between gap-3 px-5 py-3.5 text-left text-sm text-ocean-200 hover:text-white"
        aria-expanded={open}
      >
        <span className="inline-flex items-center gap-2">
          <Settings2 className="h-4 w-4 text-ocean-400" />
          Choose what you get notified about
        </span>
        <ChevronDown className={`h-4 w-4 text-ocean-400 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <div className="border-t border-ocean-800/50 px-5 py-3">
          {error && <p className="mb-2 text-sm text-coral-300">{error}</p>}
          <ul className="divide-y divide-ocean-800/40">
            {GROUPS.map((g) => {
              const on = !g.types.every((t) => muted.includes(t));
              return (
                <li key={g.key} className="flex items-center justify-between gap-4 py-3">
                  <div className="min-w-0">
                    <p className="text-sm text-white">{g.label}</p>
                    <p className="text-xs text-ocean-500">{g.sub}</p>
                  </div>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={on}
                    aria-label={g.label}
                    onClick={() => toggle(g)}
                    disabled={saving !== null}
                    className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors disabled:opacity-60 ${
                      on ? "bg-ocean-500" : "bg-ocean-800"
                    }`}
                  >
                    {saving === g.key ? (
                      <Loader2 className="mx-auto h-3.5 w-3.5 animate-spin text-white" />
                    ) : (
                      <span
                        className={`inline-block h-5 w-5 rounded-full bg-white shadow transition-transform ${
                          on ? "translate-x-[22px]" : "translate-x-0.5"
                        }`}
                      />
                    )}
                  </button>
                </li>
              );
            })}
          </ul>
          <p className="pt-2 text-xs text-ocean-600">
            Messages always show on the Messages icon, and account and sale notices always come through.
          </p>
        </div>
      )}
    </div>
  );
}
