"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Bell, Check, Trash2, Loader2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

type Notification = {
  id: string;
  type: string;
  title: string;
  body: string | null;
  link: string | null;
  read: boolean;
  created_at: string;
};

function timeAgo(iso: string) {
  const s = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 60) return "just now";
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d < 7) return `${d}d ago`;
  return new Date(iso).toLocaleDateString();
}

export default function NotificationsList({
  initial,
}: {
  initial: Notification[];
}) {
  const supabase = useMemo(() => createClient(), []);
  const router = useRouter();
  const [items, setItems] = useState<Notification[]>(initial);
  const [busy, setBusy] = useState(false);

  const unread = items.filter((n) => !n.read).length;

  async function open(n: Notification) {
    if (!n.read) {
      setItems((prev) =>
        prev.map((x) => (x.id === n.id ? { ...x, read: true } : x))
      );
      await supabase.from("notifications").update({ read: true }).eq("id", n.id);
    }
    if (n.link) router.push(n.link);
  }

  async function markAll() {
    setBusy(true);
    setItems((prev) => prev.map((x) => ({ ...x, read: true })));
    await supabase.from("notifications").update({ read: true }).eq("read", false);
    setBusy(false);
    router.refresh();
  }

  async function dismiss(id: string, e: React.MouseEvent) {
    e.stopPropagation();
    setItems((prev) => prev.filter((x) => x.id !== id));
    await supabase.from("notifications").delete().eq("id", id);
  }

  if (items.length === 0) {
    return (
      <div className="rounded-2xl border border-ocean-800/60 bg-ocean-900/40 px-6 py-12 text-center">
        <Bell className="w-8 h-8 text-ocean-600 mx-auto mb-3" />
        <p className="text-ocean-300">You&apos;re all caught up.</p>
      </div>
    );
  }

  return (
    <div>
      {unread > 0 && (
        <div className="flex justify-end mb-3">
          <button
            onClick={markAll}
            disabled={busy}
            className="inline-flex items-center gap-2 text-sm text-ocean-300 hover:text-white transition-colors disabled:opacity-50"
          >
            {busy ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Check className="w-4 h-4" />
            )}
            Mark all read
          </button>
        </div>
      )}
      <div className="rounded-2xl border border-ocean-800/60 bg-ocean-900/40 divide-y divide-ocean-800/40 overflow-hidden">
        {items.map((n) => (
          <div
            key={n.id}
            onClick={() => open(n)}
            className={`flex items-start gap-3 px-5 py-4 transition-colors cursor-pointer hover:bg-ocean-800/40 ${
              n.read ? "" : "bg-ocean-800/20"
            }`}
          >
            <span
              className={`mt-1.5 w-2 h-2 rounded-full shrink-0 ${
                n.read ? "bg-transparent" : "bg-coral-400"
              }`}
            />
            <div className="flex-1 min-w-0">
              <p
                className={`text-sm ${
                  n.read ? "text-ocean-300" : "text-white font-medium"
                }`}
              >
                {n.title}
              </p>
              {n.body && (
                <p className="text-sm text-ocean-400 mt-0.5">{n.body}</p>
              )}
              <p className="text-xs text-ocean-600 mt-1">
                {timeAgo(n.created_at)}
              </p>
            </div>
            <button
              onClick={(e) => dismiss(n.id, e)}
              className="text-ocean-600 hover:text-coral-300 transition-colors shrink-0"
              title="Dismiss"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
