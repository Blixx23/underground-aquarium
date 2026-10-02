import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { Store, ArrowLeft } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import AdminClaimsList, { type Claim } from "./AdminClaimsList";

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

  const tabs = [
    { key: "pending", label: "Waiting" },
    { key: "approved", label: "Approved" },
    { key: "rejected", label: "Rejected" },
  ];

  return (
    <main className="min-h-screen px-4 pt-28 pb-20 sm:px-6">
      <div className="mx-auto max-w-3xl">
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

        <AdminClaimsList claims={claims} view={view} />
      </div>
    </main>
  );
}
