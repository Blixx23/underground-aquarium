"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Newspaper, Tag, Plus, MessageCircle, MessagesSquare, User as UserIcon, PenSquare, X } from "lucide-react";
import type { User } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/client";
import Avatar from "@/components/profile/Avatar";
import { POST_AD_PATH } from "@/lib/config";
import { useUnreadMessages } from "@/lib/hooks/useUnreadMessages";

/** Pages where a bottom bar would get in the way (sign-in, a chat's reply box). */
const HIDE_ON = [/^\/login/, /^\/register/, /^\/forgot-password/, /^\/auth\//, /^\/messages\/.+/, /^\/admin/];

/**
 * The phone tab bar, like the big social apps: the Feed,
 * Classifieds, a centre Post button, Messages and you. The Society
 * lives on the Me page and at the top of the menu.
 * Hidden from tablet width up, where the top nav has room for everything.
 */
export default function BottomNav() {
  const pathname = usePathname() || "/";
  const [supabase] = useState(() => createClient());
  const [user, setUser] = useState<User | null>(null);
  const [me, setMe] = useState<{ name: string; avatar: string | null } | null>(null);
  const [sheet, setSheet] = useState(false);
  const unread = useUnreadMessages();

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUser(data.user));
    const { data } = supabase.auth.onAuthStateChange((_e, session) => setUser(session?.user ?? null));
    return () => data.subscription.unsubscribe();
  }, [supabase]);

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
        if (!live) return;
        setMe({
          name: data?.full_name?.trim() || data?.username || "You",
          avatar: data?.avatar_url ?? null,
        });
      });
    return () => {
      live = false;
    };
  }, [supabase, user]);

  // Close the post sheet whenever the page changes.
  useEffect(() => setSheet(false), [pathname]);

  // Only one phone menu at a time: the top menu closes this sheet when it opens.
  useEffect(() => {
    const close = () => setSheet(false);
    window.addEventListener("ua:close-bottom-sheet", close);
    return () => window.removeEventListener("ua:close-bottom-sheet", close);
  }, []);

  if (HIDE_ON.some((r) => r.test(pathname))) return null;

  const is = (...prefixes: string[]) =>
    prefixes.some((p) => (p === "/" ? pathname === "/" : pathname === p || pathname.startsWith(p + "/")));

  const tab = (active: boolean) =>
    `flex flex-1 flex-col items-center justify-center gap-0.5 pt-2 pb-1 text-[10px] font-medium transition-colors ${
      active ? "text-white" : "text-ocean-400"
    }`;

  const postOptions = [
    { href: "/feed?compose=1", label: "Post to the feed", sub: "Photos, a question, what's new in your tanks", Icon: PenSquare },
    { href: POST_AD_PATH, label: "Post a free ad", sub: "Sell or give away fish, plants and gear", Icon: Tag },
    { href: "/forums/new", label: "Ask the forums", sub: "A question or a build for the whole community", Icon: MessagesSquare },
  ];

  return (
    <>
      {/* Keeps the footer from hiding behind the bar. */}
      <div className="h-[calc(4rem_+_env(safe-area-inset-bottom))] md:hidden" aria-hidden />

      {sheet && (
        <div className="fixed inset-0 z-[60] md:hidden" role="dialog" aria-label="Create">
          <button
            type="button"
            aria-label="Close"
            onClick={() => setSheet(false)}
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
          />
          <div className="absolute inset-x-0 bottom-0 rounded-t-3xl border-t border-ocean-800/70 bg-ocean-950 px-4 pt-3 pb-[calc(1.25rem_+_env(safe-area-inset-bottom))] shadow-2xl">
            <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-ocean-700" />
            <div className="mb-2 flex items-center justify-between px-1">
              <p className="font-display text-lg text-white">Create</p>
              <button type="button" onClick={() => setSheet(false)} className="p-1 text-ocean-400" aria-label="Close">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="space-y-1">
              {postOptions.map(({ href, label, sub, Icon }) => (
                <Link
                  key={href}
                  href={href}
                  onClick={() => setSheet(false)}
                  className="flex items-center gap-3 rounded-2xl px-3 py-3 active:bg-white/5"
                >
                  <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-ocean-800/70">
                    <Icon className="h-5 w-5 text-ocean-200" />
                  </span>
                  <span className="min-w-0">
                    <span className="block text-[15px] font-medium text-white">{label}</span>
                    <span className="block truncate text-xs text-ocean-400">{sub}</span>
                  </span>
                </Link>
              ))}
            </div>
          </div>
        </div>
      )}

      <nav
        aria-label="Main"
        onClickCapture={() => window.dispatchEvent(new Event("ua:close-top-menu"))}
        className="fixed inset-x-0 bottom-0 z-40 border-t border-ocean-800/60 bg-ocean-950/95 pb-[env(safe-area-inset-bottom)] backdrop-blur-xl md:hidden"
      >
        <div className="mx-auto flex max-w-lg items-stretch">
          <Link href="/feed" className={tab(is("/feed", "/"))}>
            <Newspaper className="h-6 w-6" strokeWidth={is("/feed", "/") ? 2.4 : 1.8} />
            Feed
          </Link>
          <Link href="/marketplace" className={tab(is("/marketplace", "/listings", "/listing"))}>
            <Tag className="h-6 w-6" strokeWidth={is("/marketplace", "/listings", "/listing") ? 2.4 : 1.8} />
            Classifieds
          </Link>
          <div className="flex flex-1 items-center justify-center">
            <button
              type="button"
              onClick={() => setSheet(true)}
              aria-label="Create a post"
              className="flex h-11 w-11 items-center justify-center rounded-2xl bg-ocean-500 text-white shadow-lg shadow-ocean-500/30 active:bg-ocean-400"
            >
              <Plus className="h-6 w-6" strokeWidth={2.4} />
            </button>
          </div>
          <Link
            href={user ? "/messages" : "/login"}
            className={tab(is("/messages"))}
            aria-label={unread.count > 0 ? `Messages, ${unread.count} unread` : "Messages"}
          >
            <span className="relative">
              <MessageCircle className="h-6 w-6" strokeWidth={is("/messages") ? 2.4 : 1.8} />
              {unread.count > 0 && (
                <span className="absolute -right-2 -top-1.5 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-coral-500 px-1 text-[11px] font-medium leading-none text-white ring-2 ring-ocean-950">
                  {unread.count > 9 ? "9+" : unread.count}
                </span>
              )}
            </span>
            Messages
          </Link>
          <Link href={user ? "/profile" : "/login"} className={tab(is("/profile", "/trophies", "/account"))}>
            {me ? (
              <span
                className={`rounded-full ${is("/profile", "/trophies", "/account") ? "ring-2 ring-white" : ""}`}
              >
                <Avatar name={me.name} src={me.avatar} size={24} />
              </span>
            ) : (
              <UserIcon className="h-6 w-6" strokeWidth={1.8} />
            )}
            {user ? "Me" : "Sign in"}
          </Link>
        </div>
      </nav>
    </>
  );
}
