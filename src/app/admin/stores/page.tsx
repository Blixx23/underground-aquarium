import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { Store, ArrowLeft } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import AdminClaimsList, { type Claim } from "./AdminClaimsList";
import OwnedShopsTable, { type OwnedShopRow } from "./OwnedShopsTable";
import { supabaseAdmin } from "@/lib/supabase/admin";

export const metadata: Metadata = { title: "Admin · Store claims" };

export const dynamic = "force-dynamic";

export default async function AdminStoreClaimsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const { status } = await searchParams;
  const view = status === "approved" || status === "rejected" ? status : "pending";

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("is_admin")
    .eq("id", user.id)
    .maybeSingle();
  if (!profile?.is_admin) notFound();

  const { data } = await supabase.rpc("admin_store_claims", { p_status: view });
  const claims = (data ?? []) as Claim[];

  // Approved: every shop that has an owner, as a table. Built from the shops
  // themselves so owners set up without a claim (like a test shop) show too.
  let owned: OwnedShopRow[] = [];
  if (view === "approved") {
    const { data: shops } = await supabaseAdmin
      .from("fish_stores")
      .select("id, name, slug, city, state, status, claimed_by")
      .not("claimed_by", "is", null)
      .order("name");
    const shopRows = (shops ?? []) as {
      id: string;
      name: string;
      slug: string;
      city: string | null;
      state: string | null;
      status: string | null;
      claimed_by: string;
    }[];
    const ownerIds = [...new Set(shopRows.map((r) => r.claimed_by))];
    const [{ data: profs }, { data: approvedClaims }] = await Promise.all([
      ownerIds.length
        ? supabaseAdmin.from("profiles").select("id, full_name, username").in("id", ownerIds)
        : Promise.resolve({ data: [] }),
      shopRows.length
        ? supabaseAdmin
            .from("store_claims")
            .select("store_id, user_id, contact_email, reviewed_at")
            .eq("status", "approved")
            .in("store_id", shopRows.map((r) => r.id))
        : Promise.resolve({ data: [] }),
    ]);
    const people = new Map(
      ((profs ?? []) as { id: string; full_name: string | null; username: string | null }[]).map((p) => [p.id, p])
    );
    const claimFor = new Map<string, { contact_email: string | null; reviewed_at: string | null }>();
    for (const c of (approvedClaims ?? []) as {
      store_id: string;
      user_id: string;
      contact_email: string | null;
      reviewed_at: string | null;
    }[]) {
      claimFor.set(`${c.store_id}:${c.user_id}`, c);
    }
    owned = shopRows
      .map((r) => {
        const p = people.get(r.claimed_by);
        const c = claimFor.get(`${r.id}:${r.claimed_by}`);
        return {
          id: r.id,
          name: r.name,
          slug: r.slug,
          city: r.city,
          state: r.state,
          hidden: r.status !== "published",
          ownerName: p?.full_name?.trim() || p?.username || "Unknown",
          ownerUsername: p?.username ?? null,
          email: c?.contact_email ?? null,
          since: c?.reviewed_at ?? null,
        };
      })
      .sort((a, b) => (b.since ?? "").localeCompare(a.since ?? ""));
  }

  const tabs = [
    { key: "pending", label: "Waiting" },
    { key: "approved", label: "Approved" },
    { key: "rejected", label: "Rejected" },
  ];

  return (
    <main className="min-h-screen px-4 pt-28 pb-20 sm:px-6">
      <div className={`mx-auto ${view === "approved" ? "max-w-6xl" : "max-w-3xl"}`}>
        <Link
          href="/admin"
          className="mb-6 inline-flex items-center gap-2 text-sm text-ocean-400 transition-colors hover:text-white"
        >
          <ArrowLeft className="h-4 w-4" /> Admin
        </Link>

        <div className="mb-2 flex items-center gap-3">
          <Store className="h-6 w-6 text-ocean-300" />
          <h1 className="font-display text-2xl text-white sm:text-3xl">Store claims</h1>
        </div>
        <p className="mb-6 text-sm text-ocean-400">
          Shop owners asking to manage their listing. Approve and the shop is theirs to edit,
          post updates from and reply to reviews with.
        </p>

        <div className="mb-6 flex gap-1 rounded-xl border border-ocean-800/60 bg-ocean-900/40 p-1 text-sm">
          {tabs.map((t) => (
            <Link
              key={t.key}
              href={`/admin/stores?status=${t.key}`}
              className={`flex-1 rounded-lg py-2 text-center transition-colors ${
                view === t.key ? "bg-ocean-700/70 text-white" : "text-ocean-400 hover:text-white"
              }`}
            >
              {t.label}
            </Link>
          ))}
        </div>

        {view === "approved" ? (
          <>
            <p className="mb-3 text-sm text-ocean-400">
              {owned.length} shop{owned.length === 1 ? "" : "s"} with an owner. Edit opens the shop&apos;s details;
              View opens its public page.
            </p>
            <OwnedShopsTable rows={owned} />
          </>
        ) : (
          <AdminClaimsList claims={claims} view={view} />
        )}
      </div>
    </main>
  );
}
