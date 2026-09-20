"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Wrench, Droplets, Fish, BookOpen, MapPin, GraduationCap } from "lucide-react";

const TOOLS = [
  { href: "/tank-builder", label: "Tank Builder", sub: "Plan a compatible tank", Icon: Wrench },
  { href: "/water-check", label: "Water Check", sub: "Read your test results", Icon: Droplets },
  { href: "/species", label: "Fish Species", sub: "Care guides", Icon: Fish },
  { href: "/glossary", label: "Glossary", sub: "Hobby terms explained", Icon: BookOpen },
  { href: "/stores?near=1", label: "Shops Near Me", sub: "Local fish stores", Icon: MapPin },
  { href: "/courses", label: "Courses", sub: "Free lessons", Icon: GraduationCap },
];

/**
 * One place for the hobby tools. A side nav on desktop, a swipeable
 * strip on phones, so hopping from planning a tank to checking water
 * to looking up a fish is one tap.
 */
export default function ToolsNav() {
  const pathname = usePathname() || "";
  const active = (href: string) => {
    const base = href.split("?")[0];
    return pathname === base || pathname.startsWith(base + "/");
  };

  return (
    <>
      {/* Phones and tablets */}
      <nav
        aria-label="Tools"
        className="-mx-4 mb-5 flex gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none] lg:hidden [&::-webkit-scrollbar]:hidden"
      >
        {TOOLS.map(({ href, label, Icon }) => (
          <Link
            key={href}
            href={href}
            className={`inline-flex shrink-0 items-center gap-1.5 rounded-full border px-3.5 py-2 text-sm transition-colors ${
              active(href)
                ? "border-ocean-400 bg-ocean-600/40 text-white"
                : "border-ocean-800/70 bg-ocean-900/40 text-ocean-300"
            }`}
          >
            <Icon className="h-4 w-4" />
            {label}
          </Link>
        ))}
      </nav>

      {/* Desktop */}
      <aside className="hidden lg:block">
        <nav aria-label="Tools" className="sticky top-24">
          <p className="mb-3 px-3 font-mono text-[11px] uppercase tracking-widest text-ocean-500">Tools</p>
          <ul className="space-y-1">
            {TOOLS.map(({ href, label, sub, Icon }) => {
              const on = active(href);
              return (
                <li key={href}>
                  <Link
                    href={href}
                    className={`flex items-center gap-3 rounded-xl border px-3 py-2.5 transition-colors ${
                      on
                        ? "border-ocean-500/50 bg-ocean-700/40 text-white"
                        : "border-transparent text-ocean-300 hover:bg-white/5 hover:text-white"
                    }`}
                  >
                    <span
                      className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${
                        on ? "bg-ocean-500 text-white" : "bg-ocean-900/70 text-ocean-400"
                      }`}
                    >
                      <Icon className="h-[18px] w-[18px]" />
                    </span>
                    <span className="min-w-0">
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
