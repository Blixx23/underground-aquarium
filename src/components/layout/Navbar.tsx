"use client";
import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Menu, X, Fish, ChevronDown, User as UserIcon, LogOut } from "lucide-react";
import type { User } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";
import NotificationBell from "./NotificationBell";

const nav = [
  { label: "Marketplace", href: "/marketplace" },
  {
    label: "Resources",
    children: [
      { label: "Tank Builder", href: "/tank-builder" },
      { label: "Water Check", href: "/water-check" },
      { label: "Fish Species", href: "/species" },
      { label: "Fish Stores", href: "/stores" },
      { label: "Glossary", href: "/glossary" },
      { label: "Blog", href: "/blog" },
      { label: "Vendor Guide", href: "/vendor-guide" },
    ],
  },
  {
    label: "Community",
    children: [
      { label: "Community Hub", href: "/community" },
      { label: "Forums", href: "/forums" },
      { label: "Clubs", href: "/clubs" },
      { label: "Events", href: "/events" },
    ],
  },
  { label: "Courses", href: "/courses" },
];

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false);
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
    window.addEventListener("scroll", handler);
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

  const displayName =
    (user?.user_metadata?.username as string | undefined) ||
    user?.email?.split("@")[0] ||
    "Account";

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
        scrolled
          ? "bg-ocean-950/95 backdrop-blur-xl border-b border-ocean-800/50 py-3"
          : "bg-transparent py-5"
      )}
    >
      <div className="max-w-7xl mx-auto px-6 flex items-center justify-between">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-3 group">
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
                <button className="flex items-center gap-1 px-4 py-2 text-sm tracking-wide text-ocean-300 hover:text-white transition-colors font-body">
                  {item.label}
                  <ChevronDown className="w-3.5 h-3.5 opacity-60" />
                </button>
                {dropdown === item.label && (
                  <div className="absolute top-full left-0 pt-2 w-48">
                    <div className="py-2 bg-ocean-900/95 backdrop-blur-xl border border-ocean-700/50 rounded-xl shadow-2xl shadow-ocean-950/80">
                      {item.children.map((child) => (
                        <Link
                          key={child.href}
                          href={child.href}
                          onClick={() => setDropdown(null)}
                          className="block px-4 py-2.5 text-sm text-ocean-300 hover:text-white hover:bg-ocean-800/60 transition-all"
                        >
                          {child.label}
                        </Link>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <Link
                key={item.href}
                href={item.href!}
                className="px-4 py-2 text-sm tracking-wide text-ocean-300 hover:text-white transition-colors font-body"
              >
                {item.label}
              </Link>
            )
          )}
        </nav>

        {/* CTA Buttons */}
        <div className="hidden md:flex items-center gap-3">
          <NotificationBell />
          {user ? (
            <>
              <Link
                href="/profile"
                className="flex items-center gap-2 px-4 py-2 text-sm text-ocean-300 hover:text-white transition-colors"
              >
                <UserIcon className="w-4 h-4" />
                {displayName}
              </Link>
              <button
                onClick={handleSignOut}
                className="flex items-center gap-2 px-4 py-2 text-sm text-ocean-300 hover:text-white transition-colors"
              >
                <LogOut className="w-4 h-4" />
                Sign out
              </button>
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
            href="/sell"
            className="px-5 py-2.5 text-sm font-medium bg-ocean-600 hover:bg-ocean-500 text-white rounded-xl transition-all duration-300 hover:shadow-lg hover:shadow-ocean-600/30 tracking-wide"
          >
            Start Selling
          </Link>
        </div>

        {/* Mobile: notifications + toggle */}
        <div className="md:hidden flex items-center gap-1">
          <NotificationBell variant="link" onNavigate={() => setOpen(false)} />
          <button
            className="p-2 text-ocean-300 hover:text-white"
            onClick={() => setOpen(!open)}
          >
            {open ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Mobile Menu */}
      {open && (
        <div className="md:hidden bg-ocean-950/98 backdrop-blur-xl border-t border-ocean-800/50 px-6 pt-4 pb-[calc(2rem_+_env(safe-area-inset-bottom))] max-h-[calc(100dvh_-_5rem)] overflow-y-auto">
          {nav.map((item) =>
            item.children ? (
              <div key={item.label}>
                <p className="px-2 py-3 text-xs uppercase tracking-widest text-ocean-500 font-mono">
                  {item.label}
                </p>
                {item.children.map((child) => (
                  <Link
                    key={child.href}
                    href={child.href}
                    onClick={() => setOpen(false)}
                    className="block px-4 py-2.5 text-ocean-300 hover:text-white"
                  >
                    {child.label}
                  </Link>
                ))}
              </div>
            ) : (
              <Link
                key={item.href}
                href={item.href!}
                onClick={() => setOpen(false)}
                className="block px-2 py-3 text-ocean-200 hover:text-white border-b border-ocean-800/30"
              >
                {item.label}
              </Link>
            )
          )}
          <div className="mt-4 flex flex-col gap-3">
            {user ? (
              <>
                <Link
                  href="/profile"
                  onClick={() => setOpen(false)}
                  className="text-center py-3 text-ocean-200"
                >
                  {displayName}
                </Link>
                <button
                  onClick={handleSignOut}
                  className="text-center py-3 text-ocean-300"
                >
                  Sign out
                </button>
              </>
            ) : (
              <Link
                href="/login"
                onClick={() => setOpen(false)}
                className="text-center py-3 text-ocean-300"
              >
                Sign In
              </Link>
            )}
            <Link
              href="/sell"
              onClick={() => setOpen(false)}
              className="text-center py-3 bg-ocean-600 text-white rounded-xl font-medium"
            >
              Start Selling
            </Link>
          </div>
        </div>
      )}
    </header>
  );
}
