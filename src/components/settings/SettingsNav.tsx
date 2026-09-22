"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { UserRound, ShieldCheck, KeyRound, Tag, Store, Bell } from "lucide-react";

const LINKS = [
  { href: "/profile", label: "Profile", sub: "Name, photo, tanks", Icon: UserRound, exact: true },
  { href: "/account", label: "Account & data", sub: "Your copy, blocks, deletion", Icon: ShieldCheck, exact: true },
  { href: "/account/update-password", label: "Password", sub: "Change how you sign in", Icon: KeyRound },
  { href: "/my/listings", label: "Your listings", sub: "What you have for sale", Icon: Tag },
  { href: "/my/shops", label: "Your shops", sub: "Shops you manage", Icon: Store },
  { href: "/notifications", label: "Notifications", sub: "Everything you've been sent", Icon: Bell },
];

/** Your-account menu: a swipeable strip on phones, a sticky rail on desktop. */
export default function SettingsNav() {
  const pathname = usePathname() || "";
  const on = (href: string, exact?: boolean) =>
    exact ? pathname === href : pathname === href || pathname.startsWith(href + "/");

  return (
    <>
      <nav
        aria-label="Your account"
        className="-mx-4 mb-5 flex gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none] lg:hidden [&::-webkit-scrollbar]:hidden"
      >
        {LINKS.map(({ href, label, Icon, exact }) => (
          <Link
            key={href}
            href={href}
            className={`inline-flex shrink-0 items-center gap-1.5 rounded-full border px-3.5 py-2 text-sm transition-colors ${
              on(href, exact)
                ? "border-ocean-400/60 bg-ocean-500/15 text-white"
                : "border-ocean-800/70 bg-ocean-900/40 text-ocean-300"
            }`}
          >
            <Icon className="h-4 w-4" />
            {label}
          </Link>
        ))}
      </nav>

      <aside className="hidden lg:block">
        <nav aria-label="Your account" className="sticky top-24">
          <p className="mb-3 px-3 font-mono text-[11px] uppercase tracking-widest text-ocean-500">Your account</p>
          <ul className="space-y-1">
            {LINKS.map(({ href, label, sub, Icon, exact }) => {
              const active = on(href, exact);
              return (
                <li key={href}>
                  <Link
                    href={href}
                    className={`flex items-center gap-3 rounded-xl border px-3 py-2.5 transition-colors ${
                      active
                        ? "border-ocean-500/40 bg-ocean-500/10 text-white"
                        : "border-transparent text-ocean-300 hover:bg-white/5 hover:text-white"
                    }`}
                  >
                    <span
                      className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${
                        active ? "bg-ocean-400 text-ocean-950" : "bg-ocean-900/70 text-ocean-400"
                      }`}
                    >
                      <Icon className="h-[18px] w-[18px]" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm font-medium">{label}</span>
                      <span className="block truncate text-xs text-ocean-500">{sub}</span>
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>
      </aside>
    </>
  );
}
