import Link from "next/link";
import { ExternalLink, Pencil, Store } from "lucide-react";

export type OwnedShopRow = {
  id: string;
  name: string;
  slug: string;
  city: string | null;
  state: string | null;
  hidden: boolean;
  ownerName: string;
  ownerUsername: string | null;
  email: string | null;
  since: string | null;
};

const when = (iso: string | null) =>
  iso ? new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "";

/** Every shop that has an owner, as a plain table: who runs it, and quick links to edit or view it. */
export default function OwnedShopsTable({ rows }: { rows: OwnedShopRow[] }) {
  if (rows.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-ocean-800/60 py-16 text-center">
        <Store className="mx-auto mb-3 h-8 w-8 text-ocean-700" />
        <p className="text-sm text-ocean-400">No shops have an owner yet.</p>
      </div>
    );
  }

  const th = "whitespace-nowrap px-3 py-2.5 text-left text-[11px] font-medium uppercase tracking-wider text-ocean-500";
  const td = "px-3 py-3 align-middle";

  return (
    <div className="overflow-x-auto rounded-2xl border border-ocean-800/60 bg-ocean-900/40">
      <table className="w-full min-w-[760px] border-collapse text-sm">
        <thead className="border-b border-ocean-800/70 bg-ocean-950/50">
          <tr>
            <th className={th}>Shop</th>
            <th className={th}>Location</th>
            <th className={th}>Owner</th>
            <th className={th}>Email</th>
            <th className={th}>Since</th>
            <th className={`${th} text-right`}>
              <span className="sr-only">Actions</span>
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-ocean-800/50">
          {rows.map((r, i) => (
            <tr key={r.id} className={i % 2 ? "bg-white/[0.015]" : ""}>
              <td className={`${td} font-medium text-white`}>
                <span className="inline-flex items-center gap-2">
                  {r.name}
                  {r.hidden && (
                    <span className="rounded border border-amber-400/40 bg-amber-400/10 px-1.5 py-0.5 text-[10px] font-normal uppercase tracking-wide text-amber-200">
                      Hidden
                    </span>
                  )}
                </span>
              </td>
              <td className={`${td} whitespace-nowrap text-ocean-300`}>
                {[r.city, r.state].filter(Boolean).join(", ") || "-"}
              </td>
              <td className={`${td} text-ocean-200`}>
                {r.ownerUsername ? (
                  <Link href={`/u/${r.ownerUsername}`} target="_blank" className="hover:text-white hover:underline">
                    {r.ownerName}
                  </Link>
                ) : (
                  r.ownerName
                )}
              </td>
              <td className={`${td} text-ocean-300`}>
                {r.email ? (
                  <a href={`mailto:${r.email}`} className="hover:text-white hover:underline">
                    {r.email}
                  </a>
                ) : (
                  <span className="text-ocean-600">-</span>
                )}
              </td>
              <td className={`${td} whitespace-nowrap text-ocean-400`}>{when(r.since) || "-"}</td>
              <td className={`${td} whitespace-nowrap text-right`}>
                <span className="inline-flex gap-1.5">
                  <Link
                    href={`/my/shops/${r.slug}/hours`}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-500/40 bg-emerald-500/10 px-2.5 py-1.5 text-xs font-medium text-emerald-200 transition-colors hover:bg-emerald-500/20"
                  >
                    <Pencil className="h-3.5 w-3.5" /> Edit
                  </Link>
                  <Link
                    href={`/stores/${r.slug}`}
                    target="_blank"
                    className="inline-flex items-center gap-1.5 rounded-lg border border-white/15 px-2.5 py-1.5 text-xs text-ocean-200 transition-colors hover:bg-white/5"
                  >
                    <ExternalLink className="h-3.5 w-3.5" /> View
                  </Link>
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
