"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Bell, CheckCheck, Settings2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { notificationHref } from "@/lib/notificationLink";
import { NOTIFICATION_COLUMNS, type Notification } from "@/lib/notifications";
import NotificationRow from "@/components/notifications/NotificationRow";
import { markAllRead, markSeen, removeOne, setRead, toggleMuted } from "@/components/notifications/actions";

const PANEL_SIZE = 20;

export default function NotificationBell({
  variant = "dropdown",
  onNavigate,
}: {
  variant?: "dropdown" | "link";
  onNavigate?: () => void;
}) {
  const supabase = useMemo(() => createClient(), []);
  const router = useRouter();
  const [userId, setUserId] = useState<string | null>(null);
  const [items, setItems] = useState<Notification[]>([]);
  const [unread, setUnread] = useState(0);
  // The badge counts notices that arrived since you last opened the bell
  // (like Facebook). Unread ones stay bold in the list until you open them.
  const [unseen, setUnseen] = useState(0);
  const [muted, setMuted] = useState<string[]>([]);
  const [tab, setTab] = useState<"all" | "unread">("all");
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);
  const audioRef = useRef<AudioContext | null>(null);

  // Browsers block audio until the person interacts with the page.
  useEffect(() => {
    function init() {
      if (audioRef.current) return;
      const Ctx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!Ctx) return;
      audioRef.current = new Ctx();
      audioRef.current.resume?.();
      window.removeEventListener("pointerdown", init);
      window.removeEventListener("keydown", init);
    }
    window.addEventListener("pointerdown", init);
    window.addEventListener("keydown", init);
    return () => {
      window.removeEventListener("pointerdown", init);
      window.removeEventListener("keydown", init);
    };
  }, []);

  // A soft water "bloop".
  function playBloop() {
    const ctx = audioRef.current;
    if (!ctx) return;
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "sine";
    osc.frequency.setValueAtTime(880, now);
    osc.frequency.exponentialRampToValueAtTime(330, now + 0.12);
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(0.16, now + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.22);
    osc.connect(gain).connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.24);
  }

  const load = useCallback(async () => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        setUserId(null);
        setItems([]);
        setUnread(0);
        setUnseen(0);
        return null;
      }
      setUserId(user.id);
      const { data: prof } = await supabase
        .from("profiles")
        .select("notifications_seen_at, muted_notifications")
        .eq("id", user.id)
        .maybeSingle();
      const p = prof as { notifications_seen_at?: string | null; muted_notifications?: string[] | null } | null;
      const seenAt = p?.notifications_seen_at ?? null;
      setMuted(p?.muted_notifications ?? []);

      let unseenQ = supabase
        .from("notifications")
        .select("id", { count: "exact", head: true })
        .eq("read", false);
      if (seenAt) unseenQ = unseenQ.gt("created_at", seenAt);

      const [{ data: recent }, { count: unreadCount }, { count: unseenCount }] = await Promise.all([
        supabase.from("notifications").select(NOTIFICATION_COLUMNS).order("created_at", { ascending: false }).limit(PANEL_SIZE),
        supabase.from("notifications").select("id", { count: "exact", head: true }).eq("read", false),
        unseenQ,
      ]);
      setItems((recent ?? []) as Notification[]);
      setUnread(unreadCount ?? 0);
      setUnseen(unseenCount ?? 0);
      return user.id;
    } catch {
      // A dropped request; the next focus or tick tries again.
      return null;
    }
  }, [supabase]);

  useEffect(() => {
    let active = true;
    let channel: ReturnType<typeof supabase.channel> | null = null;

    async function start() {
      const uid = await load();
      if (!active || !uid || channel) return;
      channel = supabase
        .channel(`notifications:${uid}`)
        .on(
          "postgres_changes",
          { event: "INSERT", schema: "public", table: "notifications", filter: `user_id=eq.${uid}` },
          (payload) => {
            const n = payload.new as Notification;
            setItems((prev) => (prev.some((x) => x.id === n.id) ? prev : [n, ...prev].slice(0, PANEL_SIZE)));
            if (!n.read) {
              setUnread((c) => c + 1);
              setUnseen((c) => c + 1);
            }
            playBloop();
          }
        )
        .subscribe();
    }

    start();
    const onFocus = () => load();
    window.addEventListener("focus", onFocus);
    const tick = setInterval(load, 60000);
    const { data: authSub } = supabase.auth.onAuthStateChange(() => {
      if (channel) {
        supabase.removeChannel(channel);
        channel = null;
      }
      start();
    });
    return () => {
      active = false;
      window.removeEventListener("focus", onFocus);
      clearInterval(tick);
      authSub.subscription.unsubscribe();
      if (channel) supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [supabase, load]);

  // Click outside or Escape closes the panel.
  useEffect(() => {
    if (!open) return;
    function onDown(e: MouseEvent) {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  // Other menus close this one, and this one closes them.
  useEffect(() => {
    const close = () => setOpen(false);
    window.addEventListener("ua:close-top-menu", close);
    return () => window.removeEventListener("ua:close-top-menu", close);
  }, []);

  function toggleOpen() {
    const next = !open;
    if (next) {
      window.dispatchEvent(new Event("ua:close-top-menu"));
      setUnseen(0);
      if (userId) markSeen(supabase, userId);
    }
    setOpen(next);
  }

  async function openItem(n: Notification) {
    setOpen(false);
    if (!n.read) {
      setItems((prev) => prev.map((x) => (x.id === n.id ? { ...x, read: true } : x)));
      setUnread((c) => Math.max(0, c - 1));
      await setRead(supabase, n.id, true);
    }
    const href = notificationHref(n);
    if (href) router.push(href);
  }

  async function toggleRead(n: Notification) {
    setItems((prev) => prev.map((x) => (x.id === n.id ? { ...x, read: !n.read } : x)));
    setUnread((c) => Math.max(0, c + (n.read ? 1 : -1)));
    await setRead(supabase, n.id, !n.read);
  }

  async function remove(n: Notification) {
    setItems((prev) => prev.filter((x) => x.id !== n.id));
    if (!n.read) setUnread((c) => Math.max(0, c - 1));
    await removeOne(supabase, n.id);
  }

  async function mute(n: Notification) {
    if (!userId) return;
    const next = await toggleMuted(supabase, userId, muted, n);
    if (next) setMuted(next);
  }

  async function readAll() {
    setItems((prev) => prev.map((x) => ({ ...x, read: true })));
    setUnread(0);
    setUnseen(0);
    await markAllRead(supabase);
  }

  if (!userId) return null;

  const badge = unseen > 0 ? (unseen > 9 ? "9+" : String(unseen)) : null;

  // Phones: the bell is a link to the full page.
  if (variant === "link") {
    return (
      <Link
        href="/notifications"
        onClick={onNavigate}
        aria-label={`Notifications${unseen ? `, ${unseen} new` : ""}`}
        className="relative p-2 text-ocean-300 hover:text-white transition-colors"
      >
        <Bell className="w-5 h-5" />
        {badge && (
          <span className="absolute top-0.5 right-0.5 min-w-[18px] h-[18px] px-1 rounded-full bg-coral-500 text-white text-[11px] font-medium flex items-center justify-center">
            {badge}
          </span>
        )}
      </Link>
    );
  }

  const shown = tab === "unread" ? items.filter((n) => !n.read) : items;
  const fresh = shown.filter((n) => !n.read);
  const earlier = shown.filter((n) => n.read);

  const rowProps = {
    compact: true,
    onOpen: openItem,
    onToggleRead: toggleRead,
    onRemove: remove,
    onMute: mute,
  };

  return (
    <div className="relative" ref={wrapRef}>
      <button
        onClick={toggleOpen}
        className={`relative p-2 transition-colors ${open ? "text-white" : "text-ocean-300 hover:text-white"}`}
        aria-label={`Notifications${unseen ? `, ${unseen} new` : ""}`}
        aria-expanded={open}
      >
        <Bell className="w-5 h-5" />
        {badge && (
          <span className="absolute top-0.5 right-0.5 min-w-[18px] h-[18px] px-1 rounded-full bg-coral-500 text-white text-[11px] font-medium flex items-center justify-center">
            {badge}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-[380px] max-w-[calc(100vw-1.5rem)] overflow-hidden rounded-2xl border border-ocean-700/50 bg-ocean-950/95 shadow-2xl shadow-black/70 backdrop-blur-xl z-50">
          <div className="flex items-center justify-between px-4 pt-4 pb-2">
            <span className="font-display text-xl text-white">Notifications</span>
            <div className="flex items-center gap-1">
              {unread > 0 && (
                <button
                  onClick={readAll}
                  className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium text-sky-300 hover:bg-ocean-800/60 hover:text-sky-200"
                >
                  <CheckCheck className="h-4 w-4" /> Mark all as read
                </button>
              )}
              <Link
                href="/notifications#settings"
                onClick={() => setOpen(false)}
                aria-label="Notification settings"
                className="rounded-lg p-1.5 text-ocean-400 hover:bg-ocean-800/60 hover:text-white"
              >
                <Settings2 className="h-4 w-4" />
              </Link>
            </div>
          </div>

          <div className="flex gap-1.5 px-4 pb-2">
            {(["all", "unread"] as const).map((t) => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={`rounded-full px-3.5 py-1.5 text-sm font-medium transition-colors ${
                  tab === t ? "bg-sky-500/15 text-sky-200 ring-1 ring-sky-400/30" : "text-ocean-300 hover:bg-ocean-800/60"
                }`}
              >
                {t === "all" ? "All" : `Unread${unread ? ` (${unread})` : ""}`}
              </button>
            ))}
          </div>

          <div className="max-h-[min(70vh,560px)] overflow-y-auto px-2 pb-2">
            {shown.length === 0 ? (
              <div className="px-4 py-10 text-center">
                <Bell className="mx-auto mb-2 h-7 w-7 text-ocean-600" />
                <p className="text-sm text-ocean-300">
                  {tab === "unread" ? "No unread notifications." : "You're all caught up."}
                </p>
              </div>
            ) : (
              <>
                {fresh.length > 0 && (
                  <>
                    <p className="px-2 pt-2 pb-1 text-sm font-semibold text-white">New</p>
                    {fresh.map((n) => (
                      <NotificationRow key={n.id} n={n} muted={!!n.type && muted.includes(n.type)} {...rowProps} />
                    ))}
                  </>
                )}
                {earlier.length > 0 && (
                  <>
                    <p className="px-2 pt-3 pb-1 text-sm font-semibold text-white">Earlier</p>
                    {earlier.map((n) => (
                      <NotificationRow key={n.id} n={n} muted={!!n.type && muted.includes(n.type)} {...rowProps} />
                    ))}
                  </>
                )}
              </>
            )}
          </div>

          <Link
            href="/notifications"
            onClick={() => setOpen(false)}
            className="block border-t border-ocean-800/60 px-4 py-3 text-center text-sm font-medium text-sky-300 hover:bg-ocean-800/40 hover:text-sky-200"
          >
            See all notifications
          </Link>
        </div>
      )}
    </div>
  );
}
