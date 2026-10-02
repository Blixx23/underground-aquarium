"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ADMIN_SECTIONS, GROUPS, sectionFor } from "@/lib/admin/sections";

/**
 * The admin side nav, same shape as the Tools and Shop navs: a swipeable
 * strip on phones, a sticky rail on desktop, grouped under headings.
 * The items come from ADMIN_SECTIONS; don't list pages here.
 */
export default function AdminNav({ pending = {} }: { pending?: Record<string, number> }) {
  const pathname = usePathname() || "";
  const current = sectionFor(pathname)?.href;
  const active = (href: string) => current === href;

  return (
    <>
      <nav
        aria-label="Admin"
        className="-mx-4 mb-5 flex gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none] lg:hidden [&::-webkit-scrollbar]:hidden"
      >
        {ADMIN_SECTIONS.map(({ href, label, Icon }) => {
          const n = pending[href] ?? 0;
          return (
            <Link
              key={href}
              href={href}
              className={`inline-flex shrink-0 items-center gap-1.5 rounded-full border px-3.5 py-2 text-sm transition-colors ${
                active(href)
                  ? "border-amber-400/60 bg-amber-500/15 text-white"
                  : "border-ocean-800/70 bg-ocean-900/40 text-ocean-300"
              }`}
            >
              <Icon className="h-4 w-4" />
              {label}
              {n > 0 && (
                <span className="rounded-full bg-amber-400 px-1.5 text-[11px] font-semibold text-ocean-950">{n}</span>
              )}
            </Link>
          );
        })}
      </nav>

      <aside className="hidden lg:block">
        {/* Scrolls on its own when the menu is taller than the window, so the
            bottom items are always reachable without scrolling the page. */}
        <nav
          aria-label="Admin"
          className="sticky top-24 max-h-[calc(100vh-7rem)] overflow-y-auto overscroll-contain pr-1 [scrollbar-width:thin]"
        >
          <p className="mb-3 px-3 font-mono text-[11px] uppercase tracking-widest text-amber-300/70">Admin</p>
          {GROUPS.map((g) => (
            <div key={g.key} className="mb-4">
              {g.key !== "today" && (
                <p className="mb-1 px-3 text-[11px] font-semibold uppercase tracking-wider text-ocean-600">{g.label}</p>
              )}
              <ul className="space-y-0.5">
              {ADMIN_SECTIONS.filter((s) => s.group === g.key).map(({ href, label, sub, Icon }) => {
                const on = active(href);
                const n = pending[href] ?? 0;
                return (
                  <li key={href}>
                    <Link
                      href={href}
                      className={`flex items-center gap-3 rounded-xl border px-3 py-2 transition-colors ${
                        on
                          ? "border-amber-400/40 bg-amber-500/10 text-white"
                          : "border-transparent text-ocean-300 hover:bg-white/5 hover:text-white"
                      }`}
                    >
                      <span
                        className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${
                          on ? "bg-amber-400 text-ocean-950" : "bg-ocean-900/70 text-ocean-400"
                        }`}
                      >
                        <Icon className="h-4 w-4" />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block text-sm font-medium">{label}</span>
                        <span className="block truncate text-xs text-ocean-500">{sub}</span>
                      </span>
                      {n > 0 && (
                        <span className="rounded-full bg-amber-400 px-2 text-xs font-semibold text-ocean-950">{n}</span>
                      )}
                    </Link>
                  </li>
                );
              })}
              </ul>
            </div>
          ))}
        </nav>
      </aside>
    </>
  );
}
