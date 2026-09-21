import Link from "next/link";
import { ShieldCheck } from "lucide-react";
import { supabasePublic } from "@/lib/supabase/public";
import SocietySeal from "@/components/society/SocietySeal";

type BreederCert = {
  species: string;
  scientific: string | null;
  approved_on: string | null;
  points: number | null;
  code: string | null;
};

export async function getBreederCerts(profileId: string): Promise<BreederCert[]> {
  const { data } = await supabasePublic.rpc("public_breeder_certificates", { p_user: profileId });
  return (Array.isArray(data) ? data : []) as BreederCert[];
}

/**
 * Breeder certificates as a compact list: one line per species, so a
 * member with a dozen of them still fits in a sidebar. Verified ones link
 * to their public verification page.
 */
export default function BreederCerts({
  certs,
  limit,
  moreHref,
  className = "",
}: {
  certs: BreederCert[];
  limit?: number;
  moreHref?: string;
  className?: string;
}) {
  if (certs.length === 0) return null;
  const shown = limit ? certs.slice(0, limit) : certs;
  const hidden = certs.length - shown.length;

  return (
    <div className={className}>
      <div className="mb-2 flex items-baseline justify-between">
        <p className="font-mono text-[10px] uppercase tracking-[0.25em] text-amber-300/80">
          Certified breeder
        </p>
        <span className="text-xs text-amber-200/50">{certs.length}</span>
      </div>
      <ul className="space-y-1">
        {shown.map((c) => {
          const row = (
            <>
              <SocietySeal size={22} className="h-[22px] w-[22px] shrink-0" />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm text-amber-50">{c.species}</span>
                {c.scientific && (
                  <span className="block truncate text-[11px] italic text-amber-100/45">
                    {c.scientific}
                  </span>
                )}
              </span>
              {c.code && (
                <ShieldCheck className="h-3.5 w-3.5 shrink-0 text-amber-300" aria-label="Verified" />
              )}
            </>
          );
          const cls = "flex items-center gap-2.5 rounded-lg px-2 py-1.5";
          return (
            <li key={c.species}>
              {c.code ? (
                <Link
                  href={`/verify/${c.code}`}
                  title={`Certified ${c.species} Breeder — verify`}
                  className={`${cls} transition-colors hover:bg-amber-500/10`}
                >
                  {row}
                </Link>
              ) : (
                <div className={cls} title={`Certified ${c.species} Breeder`}>
                  {row}
                </div>
              )}
            </li>
          );
        })}
      </ul>
      {hidden > 0 && moreHref && (
        <Link href={moreHref} className="mt-1 inline-block px-2 text-xs text-amber-300 hover:text-amber-200">
          +{hidden} more
        </Link>
      )}
    </div>
  );
}
