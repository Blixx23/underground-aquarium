import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Wrench } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import FixActions from "./FixActions";

export const metadata: Metadata = { title: "Admin · Shop fixes" };
export const dynamic = "force-dynamic";

const KIND: Record<string, string> = {
  hours: "Hours",
  closed: "Closed for good",
  moved: "Moved",
  phone: "Phone",
  website: "Website",
  name: "Name",
  other: "Other",
};

export default async function StoreFixesPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const { data: me } = await supabase.from("profiles").select("is_admin").eq("id", user.id).maybeSingle();
  if (!me?.is_admin) notFound();

  const { data } = await supabaseAdmin
    .from("store_edit_suggestions")
    .select("id, kind, body, created_at, store_id, user_id")
    .eq("status", "open")
    .order("created_at", { ascending: true })
    .limit(200);
  const rows = (data ?? []) as {
    id: string;
    kind: string;
    body: string;
    created_at: string;
    store_id: string;
    user_id: string;
  }[];

  const [{ data: stores }, { data: people }] = await Promise.all([
    rows.length
      ? supabaseAdmin
          .from("fish_stores")
          .select("id, slug, name, city, state, hours, phone, website, address")
          .in("id", [...new Set(rows.map((r) => r.store_id))])
      : Promise.resolve({ data: [] }),
    rows.length
      ? supabaseAdmin.from("profiles").select("id, username").in("id", [...new Set(rows.map((r) => r.user_id))])
      : Promise.resolve({ data: [] }),
  ]);
  type S = { id: string; slug: string; name: string; city: string | null; state: string | null; hours: string | null; phone: string | null; website: string | null; address: string | null };
  const storeById = new Map(((stores ?? []) as S[]).map((s) => [s.id, s]));
  const userById = new Map(((people ?? []) as { id: string; username: string | null }[]).map((p) => [p.id, p.username]));

  return (
    <main className="min-h-screen px-4 pb-20 pt-28 sm:px-6">
      <div className="mx-auto max-w-3xl">
        <Link href="/admin" className="mb-6 inline-flex items-center gap-2 text-sm text-ocean-400 hover:text-white">
          <ArrowLeft className="h-4 w-4" /> Admin
        </Link>
        <div className="mb-2 flex items-center gap-3">
          <Wrench className="h-6 w-6 text-ocean-300" />
          <h1 className="font-display text-2xl text-white sm:text-3xl">Shop fixes</h1>
        </div>
        <p className="mb-6 text-sm text-ocean-400">
          Shoppers flagging wrong details. Open the shop, edit it, then mark it done.
        </p>

        {rows.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-ocean-800/60 p-10 text-center text-ocean-400">
            Nothing waiting.
          </p>
        ) : (
          <ul className="space-y-3">
            {rows.map((r) => {
              const s = storeById.get(r.store_id);
              const current =
                r.kind === "hours" ? s?.hours : r.kind === "phone" ? s?.phone : r.kind === "website" ? s?.website : r.kind === "moved" ? s?.address : null;
              return (
                <li key={r.id} className="rounded-2xl border border-ocean-800/60 bg-ocean-900/40 p-4">
                  <div className="mb-1 flex flex-wrap items-baseline justify-between gap-2">
                    <Link href={s ? `/stores/${s.slug}` : "#"} className="font-semibold text-white hover:underline">
                      {s?.name ?? "Unknown shop"}
                    </Link>
                    <span className="text-xs text-ocean-500">
                      {s?.city}, {s?.state} · {new Date(r.created_at).toLocaleDateString()} ·{" "}
                      {userById.get(r.user_id) ? `@${userById.get(r.user_id)}` : "member"}
                    </span>
                  </div>
                  <p className="text-xs font-medium uppercase tracking-wider text-amber-300">{KIND[r.kind] ?? r.kind}</p>
                  <p className="mt-1 whitespace-pre-wrap text-sm text-ocean-100">{r.body}</p>
                  {current && (
                    <p className="mt-2 whitespace-pre-wrap text-xs text-ocean-500">
                      <span className="text-ocean-400">Now:</span> {current}
                    </p>
                  )}
                  <FixActions id={r.id} />
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </main>
  );
}
