"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Bell } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

type Notification = {
  id: string;
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

export default function NotificationBell({
  variant = "dropdown",
  onNavigate,
}: {
  variant?: "dropdown" | "link";
  onNavigate?: () => void;
}) {
  const supabase = useMemo(() => createClient(), []);
  const router = useRouter();
  const [signedIn, setSignedIn] = useState(false);
  const [count, setCount] = useState(0);
  const [items, setItems] = useState<Notification[]>([]);
  const [open, setOpen] = useState(false);
  const [popKey, setPopKey] = useState(0);
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let active = true;
    let channel: ReturnType<typeof supabase.channel> | null = null;

    async function load() {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!active) return;
      if (!user) {
        setSignedIn(false);
        setItems([]);
        setCount(0);
        return;
      }
      setSignedIn(true);
      const [{ data: recent }, { count: c }] = await Promise.all([
        supabase
          .from("notifications")
          .select("id, title, body, link, read, created_at")
          .order("created_at", { ascending: false })
          .limit(8),
        supabase
          .from("notifications")
          .select("id", { count: "exact", head: true })
          .eq("read", false),
      ]);
      if (!active) return;
      setItems(recent ?? []);
      setCount(c ?? 0);

      // Live updates: a new notification for this user appears instantly,
      // no reload or polling wait. Set up once.
      if (!channel) {
        channel = supabase
          .channel(`notifications:${user.id}`)
          .on(
            "postgres_changes",
            {
              event: "INSERT",
              schema: "public",
              table: "notifications",
              filter: `user_id=eq.${user.id}`,
            },
            (payload) => {
              const n = payload.new as Notification;
              setItems((prev) =>
                prev.some((x) => x.id === n.id) ? prev : [n, ...prev].slice(0, 8)
              );
              if (!n.read) setCount((c) => c + 1);
              setPopKey((k) => k + 1);
            }
          )
          .subscribe();
      }
    }

    load();
    const onFocus = () => load();
    window.addEventListener("focus", onFocus);
    const id = setInterval(load, 60000);
    return () => {
      active = false;
      window.removeEventListener("focus", onFocus);
      clearInterval(id);
      if (channel) supabase.removeChannel(channel);
    };
  }, [supabase]);

  // Close the panel when clicking outside it.
  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    if (open) document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [open]);

  async function openItem(n: Notification) {
    setOpen(false);
    if (!n.read) {
      setItems((prev) =>
        prev.map((x) => (x.id === n.id ? { ...x, read: true } : x))
      );
      setCount((c) => Math.max(0, c - 1));
      await supabase.from("notifications").update({ read: true }).eq("id", n.id);
    }
    if (n.link) router.push(n.link);
  }

  const popKeyframes = (
    <style>{`
      @keyframes uaqBellPop { 0% { transform: scale(1); } 40% { transform: scale(1.28); } 100% { transform: scale(1); } }
      @keyframes uaqBubbleRise {
        0% { transform: translateY(0) scale(0.4); opacity: 0; }
        25% { opacity: 0.95; }
        70% { transform: translateY(-13px) scale(1); opacity: 0.9; }
        100% { transform: translateY(-19px) scale(1.35); opacity: 0; }
      }
      @media (prefers-reduced-motion: reduce) {
        @keyframes uaqBellPop { 0%, 100% { transform: none; } }
        @keyframes uaqBubbleRise { 0%, 100% { opacity: 0; } }
      }
    `}</style>
  );

  function renderPop() {
    if (popKey <= 0) return null;
    return (
      <span key={popKey} aria-hidden className="pointer-events-none absolute inset-0">
        {[0, 1, 2].map((i) => (
          <span
            key={i}
            className="absolute rounded-full"
            style={{
              left: `${9 + i * 7}px`,
              bottom: "7px",
              width: `${6 - i}px`,
              height: `${6 - i}px`,
              background: "radial-gradient(circle at 30% 30%, #ffffff, #7dd3fc)",
              boxShadow: "0 0 5px rgba(125, 211, 252, 0.9)",
              animation: `uaqBubbleRise 0.7s ease-out ${i * 0.08}s both`,
            }}
          />
        ))}
      </span>
    );
  }

  const bellIcon = (
    <span
      key={popKey}
      className="inline-block"
      style={popKey > 0 ? { animation: "uaqBellPop 0.45s ease" } : undefined}
    >
      <Bell className="w-5 h-5" />
    </span>
  );

  if (!signedIn) return null;

  // Mobile / compact: a tappable bell that jumps to the full notifications page.
  if (variant === "link") {
    return (
      <Link
        href="/notifications"
        onClick={onNavigate}
        aria-label="Notifications"
        className="relative p-2 text-ocean-300 hover:text-white transition-colors"
      >
        {popKeyframes}
        {bellIcon}
        {renderPop()}
        {count > 0 && (
          <span className="absolute top-0.5 right-0.5 min-w-[18px] h-[18px] px-1 rounded-full bg-coral-500 text-white text-[11px] font-medium flex items-center justify-center">
            {count > 9 ? "9+" : count}
          </span>
        )}
      </Link>
    );
  }

  return (
    <div className="relative" ref={wrapRef}>
      <button
        onClick={() => setOpen((o) => !o)}
        className="relative p-2 text-ocean-300 hover:text-white transition-colors"
        aria-label="Notifications"
      >
        {popKeyframes}
        {bellIcon}
        {renderPop()}
        {count > 0 && (
          <span className="absolute top-0.5 right-0.5 min-w-[18px] h-[18px] px-1 rounded-full bg-coral-500 text-white text-[11px] font-medium flex items-center justify-center">
            {count > 9 ? "9+" : count}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-80 max-w-[calc(100vw-2rem)] bg-ocean-900/95 backdrop-blur-xl border border-ocean-700/50 rounded-xl shadow-2xl shadow-ocean-950/80 overflow-hidden z-50">
          <div className="px-4 py-3 border-b border-ocean-800/60 flex items-center justify-between">
            <span className="text-sm font-medium text-white">Notifications</span>
            {count > 0 && (
              <span className="text-xs text-ocean-400">{count} new</span>
            )}
          </div>

          {items.length === 0 ? (
            <div className="px-4 py-8 text-center text-sm text-ocean-400">
              You&apos;re all caught up.
            </div>
          ) : (
            <div className="max-h-80 overflow-y-auto divide-y divide-ocean-800/40">
              {items.map((n) => (
                <button
                  key={n.id}
                  onClick={() => openItem(n)}
                  className={`w-full text-left flex items-start gap-2.5 px-4 py-3 hover:bg-ocean-800/50 transition-colors ${
                    n.read ? "" : "bg-ocean-800/25"
                  }`}
                >
                  <span
                    className={`mt-1.5 w-2 h-2 rounded-full shrink-0 ${
                      n.read ? "bg-transparent" : "bg-coral-400"
                    }`}
                  />
                  <span className="min-w-0">
                    <span
                      className={`block text-sm truncate ${
                        n.read ? "text-ocean-300" : "text-white font-medium"
                      }`}
                    >
                      {n.title}
                    </span>
                    <span className="block text-xs text-ocean-600 mt-0.5">
                      {timeAgo(n.created_at)}
                    </span>
                  </span>
                </button>
              ))}
            </div>
          )}

          <Link
            href="/notifications"
            onClick={() => setOpen(false)}
            className="block px-4 py-3 text-center text-sm text-ocean-300 hover:text-white hover:bg-ocean-800/40 border-t border-ocean-800/60 transition-colors"
          >
            View all notifications
          </Link>
        </div>
      )}
    </div>
  );
}
