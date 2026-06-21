import Link from "next/link";
import { Award, BadgeCheck } from "lucide-react";

export type Certification = {
  slug: string;
  title: string;
  badge_title: string;
  completed_at: string;
};

export default function Certifications({
  rows,
  heading = "Certifications",
  emptyText,
}: {
  rows: Certification[];
  heading?: string;
  emptyText?: string;
}) {
  if (!rows || rows.length === 0) {
    if (!emptyText) return null;
    return (
      <section className="mt-10">
        <h2 className="mb-4 flex items-center gap-2 font-display text-2xl text-white">
          <Award className="h-5 w-5 text-amber-300" /> {heading}
        </h2>
        <div className="rounded-2xl border border-white/10 bg-white/5 p-8 text-center">
          <p className="text-sm text-ocean-300">{emptyText}</p>
          <Link
            href="/courses"
            className="mt-2 inline-block text-sm font-medium text-emerald-400 hover:text-emerald-300"
          >
            Browse courses →
          </Link>
        </div>
      </section>
    );
  }

  return (
    <section className="mt-10">
      <h2 className="mb-4 flex items-center gap-2 font-display text-2xl text-white">
        <Award className="h-5 w-5 text-amber-300" /> {heading}
      </h2>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
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
              className="block rounded-xl border border-white/10 bg-white/5 p-4 transition-colors hover:border-amber-400/40 hover:bg-white/10"
            >
              <div className="flex items-start gap-3">
                <div className="relative h-11 w-11 shrink-0">
                  <div className="absolute inset-0 rounded-full bg-amber-400/10" />
                  <div className="absolute inset-0 rounded-full border border-amber-300/30" />
                  <div className="relative z-10 flex h-full w-full items-center justify-center">
                    <BadgeCheck className="h-5 w-5 text-amber-200" />
                  </div>
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-medium text-amber-300/90">{c.badge_title}</p>
                  <p className="mt-0.5 truncate text-sm text-white">{c.title}</p>
                  <p className="mt-1 text-xs text-ocean-500">Earned {earned}</p>
                </div>
              </div>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
