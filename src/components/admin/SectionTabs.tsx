import Link from "next/link";
import { ADMIN_SECTIONS } from "@/lib/admin/sections";

/**
 * Tabs across the top of a menu item that covers more than one page
 * (Reports and Tanks, Stats for members and shops). The tabs come from the
 * section's `also` list in lib/admin/sections.ts.
 */
export default function SectionTabs({ current }: { current: string }) {
  const section = ADMIN_SECTIONS.find((s) => s.href === current || (s.also ?? []).some((a) => a.href === current));
  if (!section?.also?.length) return null;

  const tabs = [{ href: section.href, label: section.tab ?? section.label }, ...section.also];

  return (
    <div className="mb-6 flex gap-1 border-b border-ocean-800/70" role="tablist">
      {tabs.map((t) => {
        const on = t.href === current;
        return (
          <Link
            key={t.href}
            href={t.href}
            role="tab"
            aria-selected={on}
            className={`-mb-px border-b-2 px-4 py-2 text-sm transition-colors ${
              on ? "border-amber-400 text-white" : "border-transparent text-ocean-400 hover:text-white"
            }`}
          >
            {t.label}
          </Link>
        );
      })}
    </div>
  );
}
