"use client";
import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import {
  Menu,
  X,
  Fish,
  ChevronDown,
  LogOut,
  ClipboardList,
  Trophy,
  Settings,
  Newspaper,
} from "lucide-react";
import {
  MessagesSquare,
  CalendarDays,
  GraduationCap,
  BookOpen,
  Wrench,
  Droplets,
  ScrollText,
  Info,
  MapPin,
  Crown,
} from "lucide-react";
import Avatar from "@/components/profile/Avatar";
import type { User } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";
import NotificationBell from "./NotificationBell";
import MessageBell from "./MessageBell";
import {
  MY_LISTINGS_ENABLED,
  POST_AD_PATH,
  SOCIETY_PATH,
} from "@/lib/config";

type NavChild = {
  label: string;
  href: string;
  /** Marks the Society so it can wear its own colour in both menus. */
  society?: boolean;
  /** Small heading this link sits under in a dropdown. */
  group?: string;
};

type NavItem = {
  label: string;
  href?: string;
  society?: boolean;
  children?: NavChild[];
};

const nav: NavItem[] = [
  { label: "Feed", href: "/feed" },
  { label: "Classifieds", href: "/marketplace" },
  { label: "Shops Near Me", href: "/stores?near=1" },
  { label: "The Society", href: SOCIETY_PATH, society: true },
  {
    label: "More",
    children: [
      { label: "Forums", href: "/forums", group: "Community" },
      { label: "Events", href: "/events", group: "Community" },
      { label: "Trophies", href: "/trophies", group: "Community" },
      { label: "Fish Species", href: "/species", group: "Learn" },
      { label: "Courses", href: "/courses", group: "Learn" },
      { label: "Glossary", href: "/glossary", group: "Learn" },
      { label: "Tank Builder", href: "/tank-builder", group: "Tools" },
      { label: "Water Check", href: "/water-check", group: "Tools" },
      { label: "All Fish Stores", href: "/stores", group: "Tools" },
    ],
  },
];

/** The phone menu: places on the site, not things about you. */
const EXPLORE = [
  { href: "/stores?near=1", label: "Shops Near Me", Icon: MapPin },
  { href: "/forums", label: "Forums", Icon: MessagesSquare },
  { href: "/species", label: "Fish Species", Icon: Fish },
  { href: "/events", label: "Events", Icon: CalendarDays },
  { href: "/courses", label: "Courses", Icon: GraduationCap },
  { href: "/glossary", label: "Glossary", Icon: BookOpen },
  { href: "/tank-builder", label: "Tank Builder", Icon: Wrench },
  { href: "/water-check", label: "Water Check", Icon: Droplets },
  { href: "/verify", label: "Certificate Registry", Icon: ScrollText },
  { href: "/about", label: "About", Icon: Info },
];

export default function Navbar() {
  const pathname = usePathname() || "/";
  const [scrolled, setScrolled] = useState(false);

  /** Is this the section you're looking at right now? */
  function onSection(href?: string): boolean {
    if (!href) return false;
    const base = href.split("?")[0];
    if (base === "/") return pathname === "/";
    if (base === "/feed") return pathname === "/feed" || pathname.startsWith("/feed/");
    if (base === "/marketplace") {
      return ["/marketplace", "/listings", "/listing", "/post"].some(
        (p) => pathname === p || pathname.startsWith(p + "/")
      );
    }
    if (base === SOCIETY_PATH) {
      return pathname.startsWith("/society") || pathname.startsWith("/c/");
    }
    return pathname === base || pathname.startsWith(base + "/");
  }
  const [open, setOpen] = useState(false);
  const [dropdown, setDropdown] = useState<string | null>(null);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  function openDropdown(label: string) {
    if (closeTimer.current) {
      clearTimeout(closeTimer.current);
      closeTimer.current = null;
    }
    setDropdown(label);
  }

  function scheduleClose() {
    if (closeTimer.current) clearTimeout(closeTimer.current);
    closeTimer.current = setTimeout(() => setDropdown(null), 150);
  }

  useEffect(() => {
    return () => {
      if (closeTimer.current) clearTimeout(closeTimer.current);
    };
  }, []);

  // --- Auth state ---
  const [supabase] = useState(() => createClient());
  const [user, setUser] = useState<User | null>(null);
  const router = useRouter();

  useEffect(() => {
    const handler = () => setScrolled(window.scrollY > 20);
    handler(); // a page restored mid-scroll starts in the right state
    window.addEventListener("scroll", handler, { passive: true });
    return () => window.removeEventListener("scroll", handler);
  }, []);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUser(data.user));
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });
    return () => subscription.unsubscribe();
  }, [supabase]);

  // The signed-in person's public face: real name, handle and photo.
  const [me, setMe] = useState<{
    full_name: string | null;
    username: string | null;
    avatar_url: string | null;
  } | null>(null);
  useEffect(() => {
    if (!user) {
      setMe(null);
      return;
    }
    let live = true;
    supabase
      .from("profiles")
      .select("full_name, username, avatar_url")
      .eq("id", user.id)
      .maybeSingle()
      .then(({ data }) => {
        if (live) setMe(data ?? null);
      });
    return () => {
      live = false;
    };
  }, [supabase, user]);

  const displayName =
    me?.full_name?.trim() ||
    me?.username ||
    (user?.user_metadata?.username as string | undefined) ||
    user?.email?.split("@")[0] ||
    "Account";
  const firstName = displayName.split(" ")[0];
  const publicHref = me?.username ? `/u/${me.username}` : "/profile";

  async function handleSignOut() {
    await supabase.auth.signOut();
    setUser(null);
    setOpen(false);
    router.push("/");
    router.refresh();
  }

  return (
    <header
      className={cn(
        "fixed top-0 left-0 right-0 z-50 transition-all duration-500",
        // Always a solid backing, so page content never shows through the
        // nav. It only tightens up once you start scrolling.
        scrolled
          ? "bg-ocean-950/95 backdrop-blur-xl border-b border-ocean-800/50 py-3"
          : "bg-ocean-950/90 backdrop-blur-xl border-b border-transparent py-5"
      )}
    >
      <div className="max-w-7xl mx-auto px-6 flex items-center justify-between">
        {/* Logo */}
        <Link href={user ? "/feed" : "/"} className="flex items-center gap-3 group">
          <div className="relative w-10 h-10">
            <div className="absolute inset-0 rounded-full bg-ocean-600/30 group-hover:bg-ocean-500/40 transition-all duration-300 animate-glow-pulse" />
            <div className="relative z-10 flex items-center justify-center w-full h-full">
              <Fish className="w-5 h-5 text-ocean-300 group-hover:text-ocean-200 transition-colors" />
            </div>
          </div>
          <div>
            <span
              className="block text-sm font-display text-ocean-200 tracking-[0.15em] leading-none group-hover:text-white transition-colors"
              style={{ fontFamily: "var(--font-display)" }}
            >
              UNDERGROUND
            </span>
            <span
              className="block text-xs tracking-[0.3em] text-ocean-400 group-hover:text-ocean-300 transition-colors"
              style={{ fontFamily: "var(--font-mono)" }}
            >
              AQUARIUM
            </span>
          </div>
        </Link>

        {/* Desktop Nav */}
        <nav className="hidden md:flex items-center gap-1">
          {nav.map((item) =>
            item.children ? (
              <div
                key={item.label}
                className="relative"
                onMouseEnter={() => openDropdown(item.label)}
                onMouseLeave={scheduleClose}
              >
                <button
                  className={cn(
                    "relative flex items-center gap-1 px-3 py-2 text-sm tracking-wide transition-colors font-body",
                    item.children.some((c) => onSection(c.href))
                      ? "text-white"
                      : "text-ocean-300 hover:text-white"
                  )}
                >
                  {item.label}
                  <ChevronDown className="w-3.5 h-3.5 opacity-60" />
                  {item.children.some((c) => onSection(c.href)) && (
                    <span className="absolute inset-x-2 -bottom-0.5 h-0.5 rounded-full bg-ocean-300" />
                  )}
                </button>
                {dropdown === item.label && (
                  <div className="absolute top-full right-0 pt-2">
                    <div className="grid w-[26rem] grid-cols-3 gap-4 rounded-xl border border-ocean-700/50 bg-ocean-900/95 p-4 shadow-2xl shadow-ocean-950/80 backdrop-blur-xl">
                      {[...new Set(item.children.map((c) => c.group ?? ""))].map((g) => (
                        <div key={g}>
                          {g && (
                            <p className="mb-1.5 px-2 font-mono text-[10px] uppercase tracking-widest text-ocean-500">{g}</p>
                          )}
                          {item.children!.filter((c) => (c.group ?? "") === g).map((child) => (
                            <Link
                              key={child.href}
                              href={child.href}
                              onClick={() => setDropdown(null)}
                              className={cn(
                                "block rounded-lg px-2 py-1.5 text-sm transition-colors hover:bg-ocean-800/60 hover:text-white",
                                onSection(child.href) ? "bg-ocean-800/60 text-white" : "text-ocean-300"
                              )}
                            >
                              {child.label}
                            </Link>
                          ))}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <Link
                key={item.href}
                href={item.href!}
                aria-current={onSection(item.href) ? "page" : undefined}
                className={cn(
                  "relative whitespace-nowrap px-3 py-2 text-sm tracking-wide transition-colors font-body",
                  item.society
                    ? onSection(item.href)
                      ? "text-amber-200"
                      : "text-amber-300/70 hover:text-amber-200"
                    : onSection(item.href)
                      ? "text-white"
                      : "text-ocean-300 hover:text-white"
                )}
              >
                {item.label}
                {/* The lit bar under the section you're in. */}
                {onSection(item.href) && (
                  <span
                    className={cn(
                      "absolute inset-x-2 -bottom-0.5 h-0.5 rounded-full",
                      item.society ? "bg-amber-300" : "bg-ocean-300"
                    )}
                  />
                )}
              </Link>
            )
          )}
        </nav>

        {/* CTA Buttons */}
        <div className="hidden md:flex items-center gap-3">
          <NotificationBell />
          {user ? (
            <>
              {MY_LISTINGS_ENABLED && (
                <Link
                  href="/my/listings"
                  className="flex items-center gap-2 px-3 py-2 text-sm text-ocean-300 hover:text-white transition-colors"
                  aria-label="My listings"
                >
                  <ClipboardList className="w-4 h-4" />
                </Link>
              )}
              <MessageBell />
              <div
                className="relative"
                onMouseEnter={() => openDropdown("__account")}
                onMouseLeave={scheduleClose}
              >
                <button
                  type="button"
                  onClick={() => setDropdown(dropdown === "__account" ? null : "__account")}
                  className="flex items-center gap-2 py-1.5 pl-2 pr-3 text-sm text-ocean-200 hover:text-white transition-colors"
                  aria-haspopup="menu"
                  aria-expanded={dropdown === "__account"}
                >
                  <Avatar name={displayName} src={me?.avatar_url ?? null} size={28} />
                  <span className="max-w-[9rem] truncate">{firstName}</span>
                  <ChevronDown className="w-3.5 h-3.5" />
                </button>
                {dropdown === "__account" && (
                  <div
                    role="menu"
                    className="absolute right-0 top-full mt-1 w-60 rounded-xl border border-ocean-800/70 bg-ocean-950/95 p-1.5 shadow-2xl shadow-black/60 backdrop-blur"
                  >
                    <Link
                      href={publicHref}
                      onClick={() => setDropdown(null)}
                      className="flex items-center gap-3 rounded-lg px-3 py-2.5 hover:bg-white/5"
                    >
                      <Avatar name={displayName} src={me?.avatar_url ?? null} size={36} />
                      <span className="min-w-0">
                        <span className="block truncate text-sm font-medium text-white">{displayName}</span>
                        <span className="block text-xs text-ocean-400">View your profile</span>
                      </span>
                    </Link>
                    <div className="my-1 h-px bg-ocean-800/70" />
                    {[
                      { href: "/profile", label: "Dashboard & settings", Icon: Settings },
                      { href: "/feed", label: "The Feed", Icon: Newspaper },
                      { href: "/trophies", label: "Trophies", Icon: Trophy },
                      ...(MY_LISTINGS_ENABLED
                        ? [{ href: "/my/listings", label: "My listings", Icon: ClipboardList }]
                        : []),
                    ].map(({ href, label, Icon }) => (
                      <Link
                        key={href}
                        href={href}
                        onClick={() => setDropdown(null)}
                        className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-ocean-200 hover:bg-white/5 hover:text-white"
                      >
                        <Icon className="w-4 h-4 text-ocean-400" />
                        {label}
                      </Link>
                    ))}
                    <div className="my-1 h-px bg-ocean-800/70" />
                    <button
                      type="button"
                      onClick={() => {
                        setDropdown(null);
                        handleSignOut();
                      }}
                      className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-sm text-ocean-300 hover:bg-white/5 hover:text-white"
                    >
                      <LogOut className="w-4 h-4 text-ocean-400" />
                      Sign out
                    </button>
                  </div>
                )}
              </div>
            </>
          ) : (
            <Link
              href="/login"
              className="px-4 py-2 text-sm text-ocean-300 hover:text-white transition-colors"
            >
              Sign In
            </Link>
          )}
          <Link
            href={POST_AD_PATH}
            className="px-5 py-2.5 text-sm font-medium bg-ocean-600 hover:bg-ocean-500 text-white rounded-xl transition-all duration-300 hover:shadow-lg hover:shadow-ocean-600/30 tracking-wide"
          >
            Post Free Ad
          </Link>
        </div>

        {/* Mobile: notifications + toggle */}
        <div className="md:hidden flex items-center gap-0.5">
          {/* Posting and Messages live on the bottom bar on phones. */}
          <NotificationBell variant="link" onNavigate={() => setOpen(false)} />
          <button
            className="p-2 text-ocean-300 hover:text-white"
            onClick={() => setOpen(!open)}
          >
            {open ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Mobile menu: just the site's sections. Your own stuff lives on the Me tab. */}
      {open && (
        <div className="md:hidden bg-ocean-950/98 backdrop-blur-xl border-t border-ocean-800/50 px-4 pt-3 pb-[calc(6rem_+_env(safe-area-inset-bottom))] max-h-[calc(100dvh_-_5rem)] overflow-y-auto">
          {/* The Society's home on phones, now it's off the bottom bar. */}
          <Link
            href={SOCIETY_PATH}
            onClick={() => setOpen(false)}
            className={cn(
              "mb-4 flex items-center gap-3 rounded-xl border px-4 py-3.5 active:bg-amber-500/15",
              onSection(SOCIETY_PATH)
                ? "border-amber-400/60 bg-amber-500/15"
                : "border-amber-500/30 bg-amber-500/[0.07]"
            )}
          >
            <Crown className="h-5 w-5 shrink-0 text-amber-300" />
            <span className="font-display text-base text-amber-200">The Society</span>
          </Link>
          <p className="px-2 pb-2 font-mono text-[11px] uppercase tracking-widest text-ocean-500">Explore</p>
          <div className="grid grid-cols-2 gap-2">
            {EXPLORE.map(({ href, label, Icon }) => (
              <Link
                key={href}
                href={href}
                onClick={() => setOpen(false)}
                className={cn(
                  "flex items-center gap-2.5 rounded-xl border px-3 py-3 text-sm active:bg-white/10",
                  onSection(href)
                    ? "border-ocean-400/70 bg-ocean-700/40 text-white"
                    : "border-white/10 bg-white/5 text-ocean-100"
                )}
              >
                <Icon className="h-4 w-4 shrink-0 text-ocean-400" />
                {label}
              </Link>
            ))}
          </div>
          {!user && (
            <Link
              href="/login"
              onClick={() => setOpen(false)}
              className="mt-4 block rounded-xl bg-ocean-600 py-3 text-center font-medium text-white"
            >
              Sign in
            </Link>
          )}
        </div>
      )}
    </header>
  );
}
