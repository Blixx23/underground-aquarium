import Link from "next/link";
import { BookOpen, MessageSquare, ChevronRight } from "lucide-react";
import type { GuideLink } from "@/lib/discover";

export default function RelatedGuides({
  guides,
  title = "Related guides",
}: {
  guides: GuideLink[];
  title?: string;
}) {
  if (guides.length === 0) return null;
  return (
    <section className="mt-10 border-t border-white/10 pt-8">
      <h2 className="mb-4 flex items-center gap-2 font-display text-xl text-white">
        <BookOpen className="h-5 w-5 text-ocean-300" /> {title}
      </h2>
      <div className="grid gap-2 sm:grid-cols-2">
        {guides.map((g) => (
          <Link
            key={g.id}
            href={g.href}
            className="group flex items-center gap-3 rounded-2xl border border-ocean-800/60 bg-ocean-900/40 px-4 py-3 transition-colors hover:border-ocean-600"
          >
            <span className="min-w-0 flex-1">
              <span className="line-clamp-2 text-sm font-medium leading-snug text-white">{g.title}</span>
              {g.replies > 0 && (
                <span className="mt-1 inline-flex items-center gap-1 text-xs text-ocean-500">
                  <MessageSquare className="h-3 w-3" /> {g.replies}
                </span>
              )}
            </span>
            <ChevronRight className="h-4 w-4 shrink-0 text-ocean-500 transition-transform group-hover:translate-x-0.5" />
          </Link>
        ))}
      </div>
    </section>
  );
}
