import Link from "next/link";
import type { Certification } from "@/components/profile/Certifications";

/**
 * A row of medals under a profile's stats, one for every course the member
 * has finished. Each medal links to that course; hovering shows the course
 * and when it was earned.
 */
function Medal({ id }: { id: string }) {
  return (
    <svg viewBox="0 0 32 40" className="h-8 w-[26px] shrink-0" aria-hidden="true">
      <defs>
        <linearGradient id={`medal-${id}`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#fde68a" />
          <stop offset="0.5" stopColor="#f59e0b" />
          <stop offset="1" stopColor="#b45309" />
        </linearGradient>
      </defs>
      {/* ribbon */}
      <path d="M9 1h6l3 13h-6z" fill="#1a82cc" />
      <path d="M23 1h-6l-3 13h6z" fill="#0e4a76" />
      {/* disc */}
      <circle cx="16" cy="25" r="12" fill={`url(#medal-${id})`} />
      <circle cx="16" cy="25" r="8.5" fill="none" stroke="#fffbeb" strokeOpacity="0.55" strokeWidth="1" />
      {/* check */}
      <path
        d="M11.8 25.2l2.9 2.9 5.6-6"
        fill="none"
        stroke="#451a03"
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export default function CourseMedals({
  rows,
  isMe = false,
}: {
  rows: Certification[];
  isMe?: boolean;
}) {
  if (rows.length === 0) {
    if (!isMe) return null;
    return (
      <div className="mt-4">
        <Link href="/courses" className="text-sm text-ocean-400 hover:text-white">
          Finish a free course to earn your first medal →
        </Link>
      </div>
    );
  }

  return (
    <div className="mt-4 flex flex-wrap items-center gap-2">
      {rows.map((c) => {
        const earned = new Date(c.completed_at).toLocaleDateString("en-US", {
          year: "numeric",
          month: "short",
          day: "numeric",
        });
        return (
          <Link
            key={c.slug}
            href={`/courses/${c.slug}`}
            title={`${c.title}, earned ${earned}`}
            className="group inline-flex items-center gap-2 rounded-full border border-amber-400/25 bg-amber-400/5 py-1 pl-1.5 pr-3.5 transition-colors hover:border-amber-300/60 hover:bg-amber-400/10"
          >
            <Medal id={c.slug} />
            <span className="text-sm font-medium text-amber-200 group-hover:text-amber-100">
              {c.badge_title}
            </span>
          </Link>
        );
      })}
    </div>
  );
}
