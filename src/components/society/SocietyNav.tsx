"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Fish,
  FileStack,
  NotebookPen,
  Trophy,
  ScrollText,
  Ticket,
  ShieldCheck,
  Gavel,
  type LucideIcon,
} from "lucide-react";
import SocietySeal from "@/components/society/SocietySeal";

type Item = {
  href: string;
  label: string;
  Icon: LucideIcon;
  /** Shown as a muted count on the right. */
  badge?: number;
};

/**
 * The member area's side navigation.
 *
 * A rail on desktop, a horizontal scroller on a phone — same links, same
 * order, so the shape of the Society is identical wherever you open it.
 */
export default function SocietyNav({
  memberNumber,
  displayName,
  title,
  isOfficer,
  isJudge = false,
  pendingSubmissions = 0,
  pendingReviews = 0,
  judgeQueue = 0,
}: {
  memberNumber: number | null;
  displayName: string;
  title: string | null;
  isOfficer: boolean;
  isJudge?: boolean;
  pendingSubmissions?: number;
  pendingReviews?: number;
  judgeQueue?: number;
}) {
  const pathname = usePathname();

  const items: Item[] = [
    { href: "/society/home", label: "Overview", Icon: LayoutDashboard },
    { href: "/society/breeder", label: "Breeder Program", Icon: Fish },
    { href: "/society/logs", label: "Spawn Logs", Icon: NotebookPen },
    {
      href: "/society/submissions",
      label: "My Submissions",
      Icon: FileStack,
      badge: pendingSubmissions || undefined,
    },
    {
      href: "/society/review",
      label: "Review Queue",
      Icon: ShieldCheck,
      badge: pendingReviews || undefined,
    },
    { href: "/society/leaderboard", label: "Leaderboard", Icon: Trophy },
    { href: "/society/certificates", label: "Certificates", Icon: ScrollText },
    { href: "/society/raffle", label: "Raffle", Icon: Ticket },
  ];

  if (isJudge) {
    items.push({
      href: "/society/judge",
      label: "Judge's Desk",
      Icon: Gavel,
      badge: judgeQueue || undefined,
    });
  }

  const isActive = (href: string) =>
    pathname === href || pathname.startsWith(href + "/");

  return (
    <nav className="lg:sticky lg:top-24">
      {/* Identity plate — who you are, above where you're going. */}
      <div className="mb-5 hidden items-center gap-3 rounded-2xl border border-amber-500/25 bg-[#04060a] p-4 lg:flex">
        <SocietySeal size={48} className="h-12 w-12 shrink-0" />
        <div className="min-w-0">
          <p className="truncate text-sm font-medium text-white">
            {displayName}
          </p>
          {title && (
            <p className="truncate text-xs text-amber-300">{title}</p>
          )}
          <p className="mt-0.5 font-mono text-[10px] tracking-[0.12em] text-amber-500/60">
            {memberNumber !== null
              ? `UAS-${String(memberNumber).padStart(4, "0")}`
              : "UAS-————"}
          </p>
        </div>
      </div>

      {/*
        Horizontal on a phone. overflow-x-auto with no wrap keeps every
        destination reachable with a thumb instead of hiding them behind a
        menu the member has to discover.
      */}
      <ul className="-mx-6 flex gap-1 overflow-x-auto px-6 pb-2 lg:mx-0 lg:block lg:space-y-1 lg:overflow-visible lg:px-0 lg:pb-0">
        {items.map(({ href, label, Icon, badge }) => {
          const active = isActive(href);
          return (
            <li key={href} className="shrink-0 lg:shrink">
              <Link
                href={href}
                className={`flex items-center gap-3 whitespace-nowrap rounded-xl px-4 py-2.5 text-sm transition-colors ${
                  active
                    ? "border border-amber-500/40 bg-amber-500/10 text-amber-200"
                    : "border border-transparent text-ocean-300 hover:bg-ocean-900/60 hover:text-white"
                }`}
              >
                <Icon
                  className={`h-4 w-4 shrink-0 ${
                    active ? "text-amber-300" : "text-ocean-500"
                  }`}
                />
                {label}
                {badge ? (
                  <span className="ml-auto hidden rounded-full bg-amber-500/20 px-2 py-0.5 font-mono text-[10px] text-amber-300 lg:inline">
                    {badge}
                  </span>
                ) : null}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
