"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Image as ImageIcon,
  CalendarClock,
  Megaphone,
  Star,
  Newspaper,
} from "lucide-react";

const TABS = [
  { seg: "", label: "Overview", Icon: LayoutDashboard },
  { seg: "updates", label: "Updates", Icon: Newspaper },
  { seg: "photos", label: "Photos", Icon: ImageIcon },
  { seg: "hours", label: "Hours & details", Icon: CalendarClock },
  { seg: "reviews", label: "Reviews", Icon: Star },
  { seg: "promotions", label: "Promotions", Icon: Megaphone },
];

/** The shop owner's menu: a column on desktop, a swipeable strip on phones. */
export default function ShopNav({ slug, unanswered = 0 }: { slug: string; unanswered?: number }) {
  const pathname = usePathname() || "";
  const base = `/my/shops/${slug}`;
  const href = (seg: string) => (seg ? `${base}/${seg}` : base);
  const on = (seg: string) => (seg ? pathname === `${base}/${seg}` : pathname === base);

  return (
    <>
      <nav
        aria-label="Shop"
        className="-mx-4 mb-5 flex gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none] lg:hidden [&::-webkit-scrollbar]:hidden"
      >
        {TABS.map(({ seg, label, Icon }) => (
          <Link
            key={seg}
            href={href(seg)}
            className={`inline-flex shrink-0 items-center gap-1.5 rounded-full border px-3.5 py-2 text-sm transition-colors ${
              on(seg)
                ? "border-emerald-400/70 bg-emerald-500/20 text-white"
                : "border-ocean-800/70 bg-ocean-900/40 text-ocean-300"
            }`}
          >
            <Icon className="h-4 w-4" />
            {label}
            {seg === "reviews" && unanswered > 0 && (
              <span className="rounded-full bg-amber-400 px-1.5 text-[10px] font-semibold text-ocean-950">
                {unanswered}
              </span>
            )}
          </Link>
        ))}
      </nav>

      <aside className="hidden lg:block">
        <nav aria-label="Shop" className="sticky top-24 space-y-1">
          {TABS.map(({ seg, label, Icon }) => (
            <Link
              key={seg}
              href={href(seg)}
              className={`flex items-center gap-3 rounded-xl border px-3 py-2.5 text-sm transition-colors ${
                on(seg)
                  ? "border-emerald-500/40 bg-emerald-500/10 text-white"
                  : "border-transparent text-ocean-300 hover:bg-white/5 hover:text-white"
              }`}
            >
              <Icon className={`h-[18px] w-[18px] ${on(seg) ? "text-emerald-300" : "text-ocean-500"}`} />
              {label}
              {seg === "reviews" && unanswered > 0 && (
                <span className="ml-auto rounded-full bg-amber-400 px-1.5 text-[10px] font-semibold text-ocean-950">
                  {unanswered}
                </span>
              )}
            </Link>
          ))}
        </nav>
      </aside>
    </>
  );
}
