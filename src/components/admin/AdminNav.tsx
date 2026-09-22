"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard, Mail, Store, Wrench, Flag, Fish, BookOpen,
  GraduationCap, Droplets, MessageSquare, Users,
} from "lucide-react";
import { SOCIETY_CLUB_PATH } from "@/lib/config";

const LINKS = [
  { href: "/admin", label: "Dashboard", sub: "Everything waiting on you", Icon: LayoutDashboard, exact: true },
  { href: "/admin/email", label: "Email", sub: "Queue, health and delivery", Icon: Mail },
  { href: "/admin/stores", label: "Store claims", sub: "Owners claiming a shop", Icon: Store },
  { href: "/admin/store-fixes", label: "Shop fixes", sub: "Wrong hours, moved, closed", Icon: Wrench },
  { href: "/admin/reports", label: "Reports", sub: "Flagged posts and members", Icon: Flag },
  { href: "/admin/species", label: "Species", sub: "Suggested fish", Icon: Fish },
  { href: "/admin/glossary", label: "Glossary", sub: "Suggested terms", Icon: BookOpen },
  { href: "/admin/courses", label: "Courses", sub: "Lessons and quizzes", Icon: GraduationCap },
  { href: "/admin/bubbles", label: "Bubbles", sub: "Award or deduct", Icon: Droplets },
  { href: "/admin/feedback", label: "Feedback", sub: "What members sent in", Icon: MessageSquare },
  { href: `${SOCIETY_CLUB_PATH}/admin`, label: "Society", sub: "Roster, dues, officers", Icon: Users },
];

/**
 * The admin side nav, same shape as the Tools and Shop navs: a swipeable
 * strip on phones, a sticky rail on desktop.
 */
export default function AdminNav({ pending = {} }: { pending?: Record<string, number> }) {
  const pathname = usePathname() || "";
  const active = (href: string, exact?: boolean) =>
    exact ? pathname === href : pathname === href || pathname.startsWith(href + "/");

  return (
    <>
      <nav
        aria-label="Admin"
        className="-mx-4 mb-5 flex gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none] lg:hidden [&::-webkit-scrollbar]:hidden"
      >
        {LINKS.map(({ href, label, Icon, exact }) => {
          const n = pending[href] ?? 0;
          return (
            <Link
              key={href}
              href={href}
              className={`inline-flex shrink-0 items-center gap-1.5 rounded-full border px-3.5 py-2 text-sm transition-colors ${
                active(href, exact)
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
        <nav aria-label="Admin" className="sticky top-24">
          <p className="mb-3 px-3 font-mono text-[11px] uppercase tracking-widest text-amber-300/70">Admin</p>
          <ul className="space-y-1">
            {LINKS.map(({ href, label, sub, Icon, exact }) => {
              const on = active(href, exact);
              const n = pending[href] ?? 0;
              return (
                <li key={href}>
                  <Link
                    href={href}
                    className={`flex items-center gap-3 rounded-xl border px-3 py-2.5 transition-colors ${
                      on
                        ? "border-amber-400/40 bg-amber-500/10 text-white"
                        : "border-transparent text-ocean-300 hover:bg-white/5 hover:text-white"
                    }`}
                  >
                    <span
                      className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${
                        on ? "bg-amber-400 text-ocean-950" : "bg-ocean-900/70 text-ocean-400"
                      }`}
                    >
                      <Icon className="h-[18px] w-[18px]" />
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
        </nav>
      </aside>
    </>
  );
}
