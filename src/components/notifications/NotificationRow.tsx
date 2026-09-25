"use client";

import { useEffect, useRef, useState } from "react";
import {
  Award,
  Bell,
  BellOff,
  CalendarDays,
  Check,
  Droplets,
  Mail,
  MessageSquare,
  MoreHorizontal,
  ShoppingBag,
  Star,
  Store,
  Trash2,
  Trophy,
  Circle,
} from "lucide-react";
import { kindOf, timeAgo, type IconKey, type Notification, type Tone } from "@/lib/notifications";

const ICONS: Record<IconKey, typeof Bell> = {
  forum: MessageSquare,
  trophy: Trophy,
  bubbles: Droplets,
  message: Mail,
  store: Store,
  review: Star,
  society: Award,
  sale: ShoppingBag,
  event: CalendarDays,
  bell: Bell,
};

const TONES: Record<Tone, string> = {
  sky: "bg-sky-500/15 text-sky-300 ring-sky-400/30",
  amber: "bg-amber-500/15 text-amber-300 ring-amber-400/30",
  cyan: "bg-cyan-500/15 text-cyan-300 ring-cyan-400/30",
  emerald: "bg-emerald-500/15 text-emerald-300 ring-emerald-400/30",
  gold: "bg-yellow-500/15 text-yellow-300 ring-yellow-400/40",
  coral: "bg-coral-500/15 text-coral-300 ring-coral-400/30",
  violet: "bg-violet-500/15 text-violet-300 ring-violet-400/30",
};

/**
 * One notification, the way the big apps do it: a kind icon, bold while
 * unread, a blue dot, and a "..." menu to mark read/unread, remove it, or
 * turn off that kind of notice altogether.
 */
export default function NotificationRow({
  n,
  compact = false,
  muted = false,
  onOpen,
  onToggleRead,
  onRemove,
  onMute,
}: {
  n: Notification;
  compact?: boolean;
  muted?: boolean;
  onOpen: (n: Notification) => void;
  onToggleRead: (n: Notification) => void;
  onRemove: (n: Notification) => void;
  onMute: (n: Notification) => void;
}) {
  const [menu, setMenu] = useState(false);
  const [up, setUp] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const kind = kindOf(n.type);
  const Icon = ICONS[kind.icon];

  useEffect(() => {
    if (!menu) return;
    function onDown(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenu(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setMenu(false);
    }
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [menu]);

  function act(e: React.MouseEvent, fn: () => void) {
    e.stopPropagation();
    setMenu(false);
    fn();
  }

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => onOpen(n)}
      onKeyDown={(e) => {
        if (e.key === "Enter") onOpen(n);
      }}
      className={`group relative flex cursor-pointer items-start gap-3 rounded-xl text-left font-sans transition-colors hover:bg-[#0c2640] focus:outline-none focus-visible:ring-1 focus-visible:ring-sky-400/50 ${
        compact ? "px-3 py-3" : "px-4 py-3.5"
      } ${n.read ? "" : "bg-[#0a2035]"} ${menu ? "z-30" : ""}`}
    >
      <span
        className={`flex shrink-0 items-center justify-center rounded-full ring-1 ${TONES[kind.tone]} ${
          compact ? "h-10 w-10" : "h-11 w-11"
        }`}
      >
        <Icon className={compact ? "h-[18px] w-[18px]" : "h-5 w-5"} />
      </span>

      <span className="min-w-0 flex-1 pr-14">
        <span className={`block text-[15px] leading-snug ${n.read ? "text-slate-200" : "font-semibold text-white"}`}>
          {n.title}
        </span>
        {n.body && (
          <span className={`mt-0.5 block text-sm leading-snug text-slate-400 ${compact ? "line-clamp-2" : ""}`}>
            {n.body}
          </span>
        )}
        <span className={`mt-1 block text-xs ${n.read ? "text-slate-500" : "font-semibold text-sky-400"}`}>
          {timeAgo(n.created_at)}
        </span>
      </span>

      {!n.read && (
        <span className="absolute right-12 top-1/2 h-2.5 w-2.5 -translate-y-1/2 rounded-full bg-sky-400" aria-label="Unread" />
      )}

      <div ref={menuRef} className="absolute right-1.5 top-1/2 -translate-y-1/2">
        <button
          type="button"
          aria-label="Notification options"
          onClick={(e) => {
            e.stopPropagation();
            // Near the bottom of the screen or a scroll box, open upward so it isn't cut off.
            const r = e.currentTarget.getBoundingClientRect();
            const box = e.currentTarget.closest("[data-scrollbox]")?.getBoundingClientRect();
            const floor = Math.min(window.innerHeight, box?.bottom ?? Infinity);
            setUp(floor - r.bottom < 170);
            setMenu((m) => !m);
          }}
          className={`flex h-9 w-9 items-center justify-center rounded-full bg-[#0f2a45] text-slate-200 ring-1 ring-ocean-700/70 transition-opacity hover:bg-[#15375a] hover:text-white ${
            menu ? "opacity-100" : "opacity-0 focus:opacity-100 group-hover:opacity-100"
          } [@media(hover:none)]:opacity-100`}
        >
          <MoreHorizontal className="h-4 w-4" />
        </button>
        {menu && (
          <div className={`absolute right-0 ${up ? "bottom-10" : "top-10"} z-40 w-64 max-w-[calc(100vw-2rem)] overflow-hidden rounded-xl border border-ocean-600/60 bg-[#0b2238] py-1 shadow-2xl shadow-black/80`}>
            <button
              type="button"
              onClick={(e) => act(e, () => onToggleRead(n))}
              className="flex w-full items-center gap-2.5 px-3.5 py-2.5 text-left text-sm text-white hover:bg-[#15375a]"
            >
              {n.read ? <Circle className="h-4 w-4 text-sky-300" /> : <Check className="h-4 w-4 text-sky-300" />}
              {n.read ? "Mark as unread" : "Mark as read"}
            </button>
            <button
              type="button"
              onClick={(e) => act(e, () => onRemove(n))}
              className="flex w-full items-center gap-2.5 px-3.5 py-2.5 text-left text-sm text-white hover:bg-[#15375a]"
            >
              <Trash2 className="h-4 w-4 text-ocean-400" />
              Remove this notification
            </button>
            {(kind.mutable || muted) && (
              <button
                type="button"
                onClick={(e) => act(e, () => onMute(n))}
                className="flex w-full items-center gap-2.5 px-3.5 py-2.5 text-left text-sm text-white hover:bg-[#15375a]"
              >
                {muted ? <Bell className="h-4 w-4 text-ocean-400" /> : <BellOff className="h-4 w-4 text-ocean-400" />}
                {muted ? `Turn ${kind.label} back on` : `Turn off ${kind.label}`}
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
