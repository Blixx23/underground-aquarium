import Link from "next/link";
import { ArrowRight, Award, BadgeCheck, GraduationCap } from "lucide-react";

export type ProfileCourse = {
  slug: string;
  title: string;
  subtitle: string | null;
  badge_title: string;
  cover_image: string | null;
  completed_at?: string;
};

/** Gold medal with a ribbon. `muted` draws an unearned one. */
export function Medal({ id, muted = false, className = "h-12 w-10" }: { id: string; muted?: boolean; className?: string }) {
  return (
    <svg viewBox="0 0 32 40" className={`shrink-0 ${className}`} aria-hidden="true">
      <defs>
        <linearGradient id={`medal-${id}`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor={muted ? "#7dc4f0" : "#fde68a"} />
          <stop offset="0.5" stopColor={muted ? "#1264a0" : "#f59e0b"} />
          <stop offset="1" stopColor={muted ? "#072236" : "#b45309"} />
        </linearGradient>
      </defs>
      <path d="M9 1h6l3 13h-6z" fill={muted ? "#0a3352" : "#1a82cc"} />
      <path d="M23 1h-6l-3 13h6z" fill={muted ? "#072236" : "#0e4a76"} />
      <circle cx="16" cy="25" r="12" fill={`url(#medal-${id})`} opacity={muted ? 0.55 : 1} />
      <circle cx="16" cy="25" r="8.5" fill="none" stroke="#fffbeb" strokeOpacity={muted ? 0.25 : 0.55} strokeWidth="1" />
      {!muted && (
        <path
          d="M11.8 25.2l2.9 2.9 5.6-6"
          fill="none"
          stroke="#451a03"
          strokeWidth="2.2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      )}
    </svg>
  );
}

function Cover({ c }: { c: ProfileCourse }) {
  return c.cover_image ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={c.cover_image} alt="" className="aspect-video w-full object-cover" loading="lazy" />
  ) : (
    <div className="flex aspect-video w-full items-center justify-center bg-gradient-to-br from-ocean-900 to-ocean-950">
      <GraduationCap className="h-10 w-10 text-ocean-600" />
    </div>
  );
}

/**
 * The Courses tab on a profile: every course this member has finished, each
 * with a way for whoever is looking to take it themselves. On your own
 * profile, the courses you haven't finished yet are listed underneath.
 */
export default function ProfileCourses({
  name,
  isMe,
  signedIn,
  completed,
  viewerCompleted,
  notYet,
}: {
  name: string;
  isMe: boolean;
  signedIn: boolean;
  completed: ProfileCourse[];
  /** Slugs of courses the person looking at the page has finished. */
  viewerCompleted: string[];
  /** Only used on your own profile: published courses you haven't finished. */
  notYet: ProfileCourse[];
}) {
  const viewerHas = new Set(viewerCompleted);

  return (
    <div>
      {completed.length === 0 ? (
        <div className="rounded-2xl border border-ocean-800/60 bg-ocean-900/40 p-10 text-center">
          <Award className="mx-auto mb-3 h-8 w-8 text-ocean-500" />
          <p className="text-ocean-300">
            {isMe ? "You haven't finished a course yet." : `${name} hasn't finished a course yet.`}
          </p>
          {!isMe && (
            <Link href="/courses" className="mt-3 inline-block text-sm font-medium text-emerald-400 hover:text-emerald-300">
              Browse free courses →
            </Link>
          )}
        </div>
      ) : (
        <>
          <p className="mb-4 text-sm text-ocean-400">
            {isMe ? "Courses you've completed." : `Courses ${name} has completed.`} Every course is free.
          </p>
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
            {completed.map((c) => {
              const earned = c.completed_at
                ? new Date(c.completed_at).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" })
                : null;
              const viewerDone = viewerHas.has(c.slug);
              return (
                <div
                  key={c.slug}
                  className="overflow-hidden rounded-2xl border border-amber-400/25 bg-ocean-900/40 transition-colors hover:border-amber-300/50"
                >
                  <Link href={`/courses/${c.slug}`} className="block">
                    <Cover c={c} />
                  </Link>
                  <div className="p-5">
                    <div className="flex items-start gap-3">
                      <Medal id={`p-${c.slug}`} />
                      <div className="min-w-0 flex-1">
                        <p className="font-medium text-amber-300">{c.badge_title}</p>
                        <Link href={`/courses/${c.slug}`} className="block truncate text-white hover:text-ocean-100">
                          {c.title}
                        </Link>
                        {earned && <p className="mt-0.5 text-xs text-ocean-500">Earned {earned}</p>}
                      </div>
                    </div>

                    <div className="mt-4">
                      {isMe ? (
                        <Link
                          href={`/courses/${c.slug}/certificate`}
                          className="inline-flex items-center gap-2 rounded-full border border-amber-400/40 px-4 py-2 text-sm text-amber-200 transition-colors hover:border-amber-300 hover:text-amber-100"
                        >
                          <Award className="h-4 w-4" /> View certificate
                        </Link>
                      ) : viewerDone ? (
                        <p className="inline-flex items-center gap-2 text-sm text-emerald-300">
                          <BadgeCheck className="h-4 w-4" /> You&apos;ve earned this one too
                        </p>
                      ) : (
                        <Link
                          href={signedIn ? `/courses/${c.slug}/learn` : `/courses/${c.slug}`}
                          className="inline-flex items-center gap-2 rounded-full bg-emerald-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-emerald-500"
                        >
                          Take this course, free <ArrowRight className="h-4 w-4" />
                        </Link>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}

      {isMe && notYet.length > 0 && (
        <section className="mt-10">
          <h2 className="mb-4 font-display text-2xl text-white">Still to earn</h2>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {notYet.map((c) => (
              <Link
                key={c.slug}
                href={`/courses/${c.slug}`}
                className="flex items-center gap-3 rounded-xl border border-ocean-800/60 bg-ocean-900/40 p-4 transition-colors hover:border-ocean-600"
              >
                <Medal id={`n-${c.slug}`} muted className="h-10 w-8" />
                <div className="min-w-0 flex-1">
                  <p className="text-sm text-ocean-400">{c.badge_title}</p>
                  <p className="truncate text-white">{c.title}</p>
                </div>
                <span className="inline-flex items-center gap-1 text-sm text-emerald-400">
                  Start <ArrowRight className="h-4 w-4" />
                </span>
              </Link>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
