import SocietySeal from "@/components/society/SocietySeal";
import { SOCIETY_NAME } from "@/lib/config";

/**
 * The member card.
 *
 * The one object a member gets the day they pay, before any fish has
 * spawned. Built to look like something issued rather than something
 * generated: brass on near-black, the seal, and a number that will never
 * be reissued to anyone else.
 *
 * Renders at any width — it's the same card on a phone and on a profile.
 */
export default function MemberCard({
  name,
  memberNumber,
  joinedAt,
  title,
  tier,
  paidThrough,
  className = "",
}: {
  name: string;
  /** Permanent, sequential. Null only if the row predates numbering. */
  memberNumber: number | null;
  joinedAt: string | null;
  /** Highest earned title, e.g. "Master Breeder". Null until one is earned. */
  title: string | null;
  /** individual | family | lifetime */
  tier: string | null;
  paidThrough: string | null;
  className?: string;
}) {
  const joinYear = joinedAt ? new Date(joinedAt).getFullYear() : null;
  const number =
    memberNumber !== null
      ? `UAS-${String(memberNumber).padStart(4, "0")}`
      : null;

  const isLifetime = tier === "lifetime";
  const standing = isLifetime
    ? "Lifetime member"
    : paidThrough
    ? `Paid through ${new Date(paidThrough + "T00:00:00").toLocaleDateString(
        undefined,
        { month: "short", year: "numeric" }
      )}`
    : "Member";

  return (
    <div
      className={`relative overflow-hidden rounded-2xl border border-amber-500/30 bg-[#04060a] ${className}`}
    >
      {/* Certificate-border texture, same as the homepage band. */}
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.06]"
        style={{
          backgroundImage:
            "repeating-linear-gradient(135deg, rgba(252,211,77,0.9) 0px, rgba(252,211,77,0.9) 1px, transparent 1px, transparent 9px)",
        }}
      />
      <div
        className="pointer-events-none absolute -right-10 top-1/2 h-[320px] w-[320px] -translate-y-1/2"
        style={{
          background:
            "radial-gradient(circle, rgba(217,160,60,0.18) 0%, transparent 70%)",
        }}
      />

      <div className="relative flex items-center gap-4 p-5 sm:gap-6 sm:p-6">
        <SocietySeal
          size={96}
          className="h-16 w-16 shrink-0 sm:h-24 sm:w-24"
        />

        <div className="min-w-0 flex-1">
          <p className="font-mono text-[9px] uppercase tracking-[0.28em] text-amber-400/70 sm:text-[10px]">
            {SOCIETY_NAME}
          </p>

          <p className="mt-1.5 truncate font-display text-xl text-white sm:text-2xl">
            {name}
          </p>

          {title && (
            <p className="mt-0.5 truncate text-sm text-amber-300">{title}</p>
          )}

          <div className="mt-3 flex flex-wrap items-baseline gap-x-4 gap-y-1">
            {number && (
              <span className="font-mono text-sm tracking-[0.12em] text-amber-200 sm:text-base">
                {number}
              </span>
            )}
            {joinYear && (
              <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-amber-500/60">
                Member since {joinYear}
              </span>
            )}
          </div>

          <p className="mt-2 font-mono text-[10px] uppercase tracking-[0.18em] text-amber-500/50">
            {standing}
          </p>
        </div>
      </div>

      {isLifetime && (
        <div className="relative border-t border-amber-500/20 bg-amber-400/[0.06] px-5 py-2 sm:px-6">
          <p className="text-center font-mono text-[10px] uppercase tracking-[0.25em] text-amber-300/80">
            Lifetime
          </p>
        </div>
      )}
    </div>
  );
}
