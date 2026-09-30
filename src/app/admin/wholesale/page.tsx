import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { Warehouse, Phone, Globe, Mail, LayoutDashboard } from "lucide-react";
import { supabaseAdmin } from "@/lib/supabase/admin";
import AdminShopSearch from "@/components/admin/AdminShopSearch";
import WholesaleRow, { STAGES } from "./WholesaleRow";
import ShopTypeToggle from "@/components/stores/ShopTypeToggle";

export const metadata: Metadata = { title: "Admin · Wholesale" };
export const dynamic = "force-dynamic";

type Row = {
  id: string;
  name: string;
  slug: string | null;
  city: string | null;
  state: string | null;
  phone: string | null;
  website: string | null;
  wholesale_at: string | null;
  wholesale_stage: string | null;
  wholesale_notes: string | null;
};

/**
 * Businesses that said they're wholesale only. They're off the shop
 * directory and out of every shop email, and kept here as a list to build
 * on for supplier deals later.
 */
export default async function AdminWholesalePage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; stage?: string }>;
}) {
  const { q: rawQ, stage: rawStage } = await searchParams;
  const q = String(rawQ ?? "").trim();
  const stage = STAGES.some((s) => s.key === rawStage) ? (rawStage as string) : "all";

  let query = supabaseAdmin
    .from("fish_stores")
    .select("id, name, slug, city, state, phone, website, wholesale_at, wholesale_stage, wholesale_notes")
    .eq("status", "wholesale")
    .order("wholesale_at", { ascending: false, nullsFirst: false })
    .limit(500);
  const safe = q.replace(/[^\p{L}\p{N} .'&-]/gu, " ").trim();
  if (safe) query = query.or(`name.ilike.%${safe}%,city.ilike.%${safe}%,state.ilike.%${safe}%`);
  if (stage !== "all") query = query.eq("wholesale_stage", stage);

  const [{ data, error }, { data: all }] = await Promise.all([
    query,
    supabaseAdmin.from("fish_stores").select("wholesale_stage").eq("status", "wholesale").limit(5000),
  ]);
  const rows = (data ?? []) as Row[];

  const counts = new Map<string, number>();
  for (const r of (all ?? []) as { wholesale_stage: string | null }[]) {
    const k = r.wholesale_stage ?? "prospect";
    counts.set(k, (counts.get(k) ?? 0) + 1);
  }
  const total = (all ?? []).length;

  // Their outreach addresses, so you can reach them when you're ready.
  const emails = new Map<string, string[]>();
  if (rows.length) {
    const { data: contacts } = await supabaseAdmin
      .from("store_contacts")
      .select("store_id, email")
      .in("store_id", rows.map((r) => r.id))
      .not("email", "is", null);
    for (const c of (contacts ?? []) as { store_id: string; email: string }[]) {
      const list = emails.get(c.store_id) ?? [];
      if (!list.includes(c.email)) list.push(c.email);
      emails.set(c.store_id, list);
    }
  }

  const href = (s: string) => {
    const p = new URLSearchParams();
    if (q) p.set("q", q);
    if (s !== "all") p.set("stage", s);
    const str = p.toString();
    return `/admin/wholesale${str ? `?${str}` : ""}`;
  };

  return (
    <main>
      <div>
        <h1 className="mb-1 flex items-center gap-3 font-display text-3xl text-white">
          <Warehouse className="h-7 w-7 text-violet-300" /> Wholesale
        </h1>
        <p className="mb-6 text-sm text-ocean-400">
          Businesses that told you they&apos;re wholesale only. They&apos;re off the shop directory and never get shop
          emails. Flip the Consumer store / Wholesale supply switch on a shop (in All shops or on its dashboard) to move it here, and flip it back to return it.
        </p>

        {error && (
          <p className="mb-4 rounded-xl border border-red-400/40 bg-red-500/10 px-4 py-3 text-sm text-red-200">
            Couldn&apos;t load the list: {error.message}. If it mentions a missing column, run step 67 in Supabase.
          </p>
        )}

        <Suspense fallback={<div className="mb-4 h-[46px] rounded-xl border border-ocean-700 bg-ocean-900" />}>
          <AdminShopSearch initial={q} />
        </Suspense>

        <div className="mb-4 flex flex-wrap items-center gap-2">
          {[{ key: "all", label: "All" }, ...STAGES].map((s) => {
            const n = s.key === "all" ? total : counts.get(s.key) ?? 0;
            return (
              <Link
                key={s.key}
                href={href(s.key)}
                className={`rounded-full border px-3.5 py-1.5 text-sm ${
                  stage === s.key
                    ? "border-violet-400/60 bg-violet-500/15 text-white"
                    : "border-ocean-800/70 bg-ocean-900/40 text-ocean-300 hover:text-white"
                }`}
              >
                {s.label} <span className="text-ocean-500">{n}</span>
              </Link>
            );
          })}
        </div>

        {rows.length === 0 ? (
          <p className="rounded-2xl border border-ocean-800/60 bg-ocean-950/40 px-4 py-6 text-center text-sm text-ocean-400">
            {q || stage !== "all" ? (
              <>
                Nothing matches.{" "}
                <Link href="/admin/wholesale" className="text-violet-200 underline hover:text-white">
                  Show all
                </Link>
              </>
            ) : (
              "No wholesalers yet. When a business replies that they're wholesale only, find them in All shops and switch them to Wholesale supply."
            )}
          </p>
        ) : (
          <ul className="space-y-3">
            {rows.map((r) => (
              <li key={r.id} className="rounded-2xl border border-ocean-800/60 bg-ocean-950/40 px-4 py-3">
                <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                  <p className="font-medium text-white">{r.name}</p>
                  <p className="text-xs text-ocean-400">{[r.city, r.state].filter(Boolean).join(", ") || "No location"}</p>
                  {r.wholesale_at && (
                    <p className="ml-auto text-xs text-ocean-500">
                      Added{" "}
                      {new Date(r.wholesale_at).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                        timeZone: "America/Los_Angeles",
                      })}
                    </p>
                  )}
                </div>
                <div className="mt-1.5 flex flex-wrap gap-x-4 gap-y-1 text-xs text-ocean-300">
                  {(emails.get(r.id) ?? []).map((e) => (
                    <a key={e} href={`mailto:${e}`} className="inline-flex items-center gap-1 hover:text-white">
                      <Mail className="h-3.5 w-3.5 text-ocean-500" /> {e}
                    </a>
                  ))}
                  {r.phone && (
                    <a href={`tel:${r.phone}`} className="inline-flex items-center gap-1 hover:text-white">
                      <Phone className="h-3.5 w-3.5 text-ocean-500" /> {r.phone}
                    </a>
                  )}
                  {r.website && (
                    <span className="inline-flex items-center gap-1">
                      <Globe className="h-3.5 w-3.5 text-ocean-500" /> {r.website.replace(/^https?:\/\//, "").replace(/\/$/, "")}
                    </span>
                  )}
                </div>
                <div className="mt-3 flex flex-wrap items-start gap-2">
                  <ShopTypeToggle storeId={r.id} wholesale />
                  {r.slug && (
                    <Link
                      href={`/my/shops/${r.slug}`}
                      className="inline-flex items-center gap-1.5 rounded-xl border border-white/15 px-3.5 py-2 text-sm text-ocean-200 hover:bg-white/5"
                    >
                      <LayoutDashboard className="h-4 w-4" /> Dashboard
                    </Link>
                  )}
                </div>
                <WholesaleRow storeId={r.id} stage={r.wholesale_stage} notes={r.wholesale_notes} />
              </li>
            ))}
          </ul>
        )}
      </div>
    </main>
  );
}
