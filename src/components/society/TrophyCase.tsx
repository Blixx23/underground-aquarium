import {
  badgeIcon,
  CATEGORY_LABEL,
  CATEGORY_ORDER,
  LOCKED_CLASS,
  TIER_CLASS,
  type BadgeCategory,
  type EarnedBadge,
  type SocietyBadge,
} from "@/lib/society/badges";

/**
 * The trophy case.
 *
 * Shows every badge in the catalogue, earned ones lit and the rest greyed
 * out, because a locked badge is a roadmap — it tells a member what the
 * Society rewards without a page of instructions. On someone else's public
 * profile only earned badges show, since their empty slots aren't the
 * visitor's business.
 */
export default function TrophyCase({
  catalogue,
  earned,
  showLocked = false,
  heading = "Trophy case",
}: {
  /** Every active badge, for the locked slots. */
  catalogue: SocietyBadge[];
  earned: EarnedBadge[];
  /** True on your own member area, false on a public profile. */
  showLocked?: boolean;
  heading?: string;
}) {
  const earnedByKey = new Map(earned.map((b) => [b.key, b]));

  const shown = showLocked
    ? catalogue
    : catalogue.filter((b) => earnedByKey.has(b.key));

  if (shown.length === 0) return null;

  const byCategory = new Map<BadgeCategory, SocietyBadge[]>();
  for (const b of shown) {
    const list = byCategory.get(b.category) ?? [];
    list.push(b);
    byCategory.set(b.category, list);
  }

  const earnedCount = earned.length;

  return (
    <section className="mt-8">
      <div className="mb-4 flex items-baseline justify-between gap-3">
        <h2 className="font-display text-xl text-white sm:text-2xl">
          {heading}
        </h2>
        <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-amber-500/60">
          {earnedCount} earned
          {showLocked && catalogue.length > 0 && ` of ${catalogue.length}`}
        </p>
      </div>

      <div className="space-y-6">
        {CATEGORY_ORDER.filter((c) => byCategory.has(c)).map((category) => (
          <div key={category}>
            <p className="mb-3 font-mono text-[10px] uppercase tracking-[0.25em] text-ocean-500">
              {CATEGORY_LABEL[category]}
            </p>

            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
              {(byCategory.get(category) ?? []).map((badge) => {
                const mine = earnedByKey.get(badge.key);
                const Icon = badgeIcon(badge.key);
                const style = mine ? TIER_CLASS[badge.tier] : LOCKED_CLASS;

                return (
                  <div
                    key={badge.key}
                    title={badge.description}
                    className={`rounded-2xl border p-4 transition-colors ${style.ring} ${style.glow}`}
                  >
                    <Icon className={`mb-3 h-6 w-6 ${style.icon}`} />

                    <p
                      className={`text-sm font-medium ${
                        mine ? "text-white" : "text-ocean-600"
                      }`}
                    >
                      {badge.name}
                    </p>

                    <p
                      className={`mt-1 text-xs leading-snug ${
                        mine ? "text-amber-100/55" : "text-ocean-700"
                      }`}
                    >
                      {mine?.detail ?? badge.description}
                    </p>

                    {mine && (
                      <p className="mt-2 font-mono text-[10px] uppercase tracking-[0.15em] text-ocean-600">
                        {new Date(mine.earned_at).toLocaleDateString(undefined, {
                          month: "short",
                          year: "numeric",
                        })}
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
