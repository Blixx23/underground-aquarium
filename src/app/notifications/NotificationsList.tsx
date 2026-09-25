"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Bell, CheckCheck, Loader2, Trash2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { notificationHref } from "@/lib/notificationLink";
import {
  CATEGORIES,
  NOTIFICATION_COLUMNS,
  groupByDay,
  kindOf,
  type CategoryKey,
  type Notification,
} from "@/lib/notifications";
import NotificationRow from "@/components/notifications/NotificationRow";
import {
  clearRead,
  markAllRead,
  markSeen,
  removeOne,
  setRead,
  toggleMuted,
} from "@/components/notifications/actions";

const PAGE = 30;

export default function NotificationsList({
  userId,
  initial,
  initialMuted,
}: {
  userId: string;
  initial: Notification[];
  initialMuted: string[];
}) {
  const supabase = useMemo(() => createClient(), []);
  const router = useRouter();
  const [items, setItems] = useState<Notification[]>(initial);
  const [muted, setMuted] = useState<string[]>(initialMuted);
  const [tab, setTab] = useState<"all" | "unread">("all");
  const [cat, setCat] = useState<CategoryKey | null>(null);
  const [more, setMore] = useState(initial.length >= PAGE);
  const [loadingMore, setLoadingMore] = useState(false);
  const [busy, setBusy] = useState<"read" | "clear" | null>(null);

  // Landing here counts as seeing them: the bell badge clears.
  useEffect(() => {
    markSeen(supabase, userId);
  }, [supabase, userId]);

  const unread = items.filter((n) => !n.read).length;
  const readCount = items.length - unread;
  const presentCats = new Set(items.map((n) => kindOf(n.type).category));

  const shown = items.filter(
    (n) => (tab === "all" || !n.read) && (!cat || kindOf(n.type).category === cat)
  );
  const groups = groupByDay(shown);

  async function open(n: Notification) {
    if (!n.read) {
      setItems((prev) => prev.map((x) => (x.id === n.id ? { ...x, read: true } : x)));
      await setRead(supabase, n.id, true);
    }
    const href = notificationHref(n);
    if (href) router.push(href);
  }

  async function toggleRead(n: Notification) {
    setItems((prev) => prev.map((x) => (x.id === n.id ? { ...x, read: !n.read } : x)));
    await setRead(supabase, n.id, !n.read);
  }

  async function remove(n: Notification) {
    setItems((prev) => prev.filter((x) => x.id !== n.id));
    await removeOne(supabase, n.id);
  }

  async function mute(n: Notification) {
    const next = await toggleMuted(supabase, userId, muted, n);
    if (next) {
      setMuted(next);
      router.refresh(); // keeps the settings panel above in step
    }
  }

  async function readAll() {
    setBusy("read");
    setItems((prev) => prev.map((x) => ({ ...x, read: true })));
    await markAllRead(supabase);
    setBusy(null);
  }

  async function clearAllRead() {
    if (!window.confirm("Remove every notification you've already read?")) return;
    setBusy("clear");
    setItems((prev) => prev.filter((x) => !x.read));
    await clearRead(supabase);
    setBusy(null);
  }

  async function loadMore() {
    const last = items[items.length - 1];
    if (!last) return;
    setLoadingMore(true);
    const { data } = await supabase
      .from("notifications")
      .select(NOTIFICATION_COLUMNS)
      .lt("created_at", last.created_at)
      .order("created_at", { ascending: false })
      .limit(PAGE);
    const next = (data ?? []) as Notification[];
    setItems((prev) => [...prev, ...next.filter((n) => !prev.some((p) => p.id === n.id))]);
    setMore(next.length >= PAGE);
    setLoadingMore(false);
  }

  const chip = (on: boolean) =>
    `rounded-full px-3.5 py-1.5 text-sm font-medium transition-colors ${
      on ? "bg-sky-500/15 text-sky-200 ring-1 ring-sky-400/30" : "text-ocean-300 hover:bg-ocean-800/60 hover:text-white"
    }`;

  return (
    <div>
      {/* Tabs and bulk actions */}
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <div className="flex gap-1.5">
          <button onClick={() => setTab("all")} className={chip(tab === "all")}>
            All
          </button>
          <button onClick={() => setTab("unread")} className={chip(tab === "unread")}>
            Unread{unread ? ` (${unread})` : ""}
          </button>
        </div>
        <div className="flex items-center gap-1">
          {unread > 0 && (
            <button
              onClick={readAll}
              disabled={!!busy}
              className="inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm text-sky-300 hover:bg-ocean-800/60 hover:text-sky-200 disabled:opacity-50"
            >
              {busy === "read" ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCheck className="h-4 w-4" />}
              Mark all as read
            </button>
          )}
          {readCount > 0 && (
            <button
              onClick={clearAllRead}
              disabled={!!busy}
              className="inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm text-ocean-400 hover:bg-ocean-800/60 hover:text-coral-300 disabled:opacity-50"
            >
              {busy === "clear" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
              Clear read
            </button>
          )}
        </div>
      </div>

      {/* Kind filter */}
      {presentCats.size > 1 && (
        <div className="-mx-1 mb-4 flex gap-1.5 overflow-x-auto px-1 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          <button onClick={() => setCat(null)} className={`shrink-0 ${chip(cat === null)}`}>
            Everything
          </button>
          {CATEGORIES.filter((c) => presentCats.has(c.key)).map((c) => (
            <button key={c.key} onClick={() => setCat(cat === c.key ? null : c.key)} className={`shrink-0 ${chip(cat === c.key)}`}>
              {c.label}
            </button>
          ))}
        </div>
      )}

      {shown.length === 0 ? (
        <div className="rounded-2xl border border-ocean-800/60 bg-ocean-900/40 px-6 py-12 text-center">
          <Bell className="mx-auto mb-3 h-8 w-8 text-ocean-600" />
          <p className="text-ocean-300">
            {tab === "unread" ? "No unread notifications." : cat ? "Nothing here yet." : "You're all caught up."}
          </p>
        </div>
      ) : (
        <div className="space-y-5">
          {groups.map((g) => (
            <section key={g.label}>
              <h2 className="mb-1.5 px-1 text-sm font-semibold text-white">{g.label}</h2>
              <div className="rounded-2xl border border-ocean-800/60 bg-ocean-900/40 p-1.5">
                {g.items.map((n) => (
                  <NotificationRow
                    key={n.id}
                    n={n}
                    muted={!!n.type && muted.includes(n.type)}
                    onOpen={open}
                    onToggleRead={toggleRead}
                    onRemove={remove}
                    onMute={mute}
                  />
                ))}
              </div>
            </section>
          ))}
        </div>
      )}

      {more && (
        <div className="mt-6 text-center">
          <button
            onClick={loadMore}
            disabled={loadingMore}
            className="inline-flex items-center gap-2 rounded-xl border border-ocean-700/60 px-5 py-2.5 text-sm text-ocean-200 hover:border-ocean-500 hover:text-white disabled:opacity-60"
          >
            {loadingMore && <Loader2 className="h-4 w-4 animate-spin" />}
            Show older notifications
          </button>
        </div>
      )}
    </div>
  );
}
