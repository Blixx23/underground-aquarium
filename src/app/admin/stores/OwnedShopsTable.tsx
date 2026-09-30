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

function HiddenTag() {
  return (
    <span className="rounded border border-amber-400/40 bg-amber-400/10 px-1.5 py-0.5 text-[10px] font-normal uppercase tracking-wide text-amber-200">
      Hidden
    </span>
  );
}

function Actions({ slug }: { slug: string }) {
  return (
    <span className="inline-flex gap-1.5">
      <Link
        href={`/my/shops/${slug}/hours`}
        className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-500/40 bg-emerald-500/10 px-2.5 py-1.5 text-xs font-medium text-emerald-200 transition-colors hover:bg-emerald-500/20"
      >
        <Pencil className="h-3.5 w-3.5" /> Edit
      </Link>
      <Link
        href={`/stores/${slug}`}
        target="_blank"
        className="inline-flex items-center gap-1.5 rounded-lg border border-white/15 px-2.5 py-1.5 text-xs text-ocean-200 transition-colors hover:bg-white/5"
      >
        <ExternalLink className="h-3.5 w-3.5" /> View
      </Link>
    </span>
  );
}

function Owner({ r }: { r: OwnedShopRow }) {
  return (
    <>
      <span className="block text-ocean-100">
        {r.ownerUsername ? (
          <Link href={`/u/${r.ownerUsername}`} target="_blank" className="hover:text-white hover:underline">
            {r.ownerName}
          </Link>
        ) : (
          r.ownerName
        )}
      </span>
      {r.email && (
        <a href={`mailto:${r.email}`} className="block break-all text-xs text-ocean-400 hover:text-white hover:underline">
          {r.email}
        </a>
      )}
    </>
  );
}

/** Every shop that has an owner: who runs it, and quick links to edit or view it. Never scrolls sideways. */
export default function OwnedShopsTable({ rows }: { rows: OwnedShopRow[] }) {
  if (rows.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-ocean-800/60 py-16 text-center">
        <Store className="mx-auto mb-3 h-8 w-8 text-ocean-700" />
        <p className="text-sm text-ocean-400">No shops have an owner yet.</p>
      </div>
    );
  }

  const th = "px-4 py-2.5 text-left text-[11px] font-medium uppercase tracking-wider text-ocean-500";
  const place = (r: OwnedShopRow) => [r.city, r.state].filter(Boolean).join(", ");

  return (
    <>
      {/* Tablet and up: a table that fits the width */}
      <div className="hidden overflow-hidden rounded-2xl border border-ocean-800/60 bg-ocean-900/40 md:block">
        <table className="w-full table-fixed border-collapse text-sm">
          <colgroup>
            <col className="w-[34%]" />
            <col className="w-[34%]" />
            <col className="w-[12%]" />
            <col className="w-[20%]" />
          </colgroup>
          <thead className="border-b border-ocean-800/70 bg-ocean-950/50">
            <tr>
              <th className={th}>Shop</th>
              <th className={th}>Owner</th>
              <th className={th}>Since</th>
              <th className={th}>
                <span className="sr-only">Actions</span>
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-ocean-800/50">
            {rows.map((r, i) => (
              <tr key={r.id} className={i % 2 ? "bg-white/[0.015]" : ""}>
                <td className="px-4 py-3 align-middle">
                  <span className="flex flex-wrap items-center gap-2 font-medium text-white">
                    {r.name}
                    {r.hidden && <HiddenTag />}
                  </span>
                  <span className="block text-xs text-ocean-400">{place(r) || "-"}</span>
                </td>
                <td className="px-4 py-3 align-middle">
                  <Owner r={r} />
                </td>
                <td className="px-4 py-3 align-middle text-xs text-ocean-400">{when(r.since) || "-"}</td>
                <td className="px-4 py-3 text-right align-middle">
                  <Actions slug={r.slug} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Phones: one small card per shop */}
      <div className="space-y-2 md:hidden">
        {rows.map((r) => (
          <div key={r.id} className="rounded-xl border border-ocean-800/60 bg-ocean-900/40 p-3.5">
            <div className="flex flex-wrap items-center gap-2 font-medium text-white">
              {r.name}
              {r.hidden && <HiddenTag />}
            </div>
            <p className="text-xs text-ocean-400">
              {[place(r), r.since ? `since ${when(r.since)}` : null].filter(Boolean).join(" · ")}
            </p>
            <div className="mt-2 text-sm">
              <Owner r={r} />
            </div>
            <div className="mt-3">
              <Actions slug={r.slug} />
            </div>
          </div>
        ))}
      </div>
    </>
  );
}
