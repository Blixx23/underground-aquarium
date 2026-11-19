import type { Metadata } from "next";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Bell } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { broadcastRecipients } from "@/lib/admin/broadcast";
import NotifyForm from "./NotifyForm";

export const metadata: Metadata = { title: "Admin · Notify members" };
export const dynamic = "force-dynamic";

type Sent = {
  id: string;
  title: string;
  body: string | null;
  link: string | null;
  created_at: string;
  data: { sent_to?: number; test?: boolean; email?: boolean } | null;
};

function when(iso: string): string {
  return new Date(iso).toLocaleString("en-US", {
    timeZone: "America/Los_Angeles",
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export default async function AdminNotifyPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const recipients = await broadcastRecipients().catch(() => [] as string[]);
  const reach = recipients.includes(user.id) ? recipients.length : recipients.length + 1;

  // Every send gives the sender a copy, so their own copies are the history.
  const { data } = await supabaseAdmin
    .from("notifications")
    .select("id, title, body, link, created_at, data")
    .eq("user_id", user.id)
    .eq("type", "site")
    .not("data->>send_id", "is", null)
    .order("created_at", { ascending: false })
    .limit(25);
  const history = (data ?? []) as Sent[];

  return (
    <main className="min-h-screen px-4 pb-20 pt-28 sm:px-6">
      <div className="mx-auto max-w-2xl">
        <div className="mb-1 flex items-center gap-3">
          <Bell className="h-6 w-6 text-amber-300" />
          <h1 className="font-display text-2xl text-white sm:text-3xl">Notify members</h1>
        </div>
        <p className="mb-8 text-ocean-400">
          Send one notification to every member&apos;s bell. Members who get Site news by email are emailed it too, unless
          you pick bell only. Members who switched Site news off, and suspended accounts, are skipped.
        </p>

        <NotifyForm reach={reach} />

        <h2 className="mb-3 mt-10 font-medium text-white">Sent</h2>
        {history.length === 0 ? (
          <p className="text-sm text-ocean-500">Nothing sent yet.</p>
        ) : (
          <div className="divide-y divide-ocean-800/40 rounded-2xl border border-ocean-800/60 bg-ocean-900/40">
            {history.map((h) => (
              <div key={h.id} className="px-4 py-3">
                <div className="flex items-start justify-between gap-4">
                  <p className="font-medium text-ocean-100">{h.title}</p>
                  <span
                    className={`shrink-0 rounded-full px-2 py-0.5 text-xs ${
                      h.data?.test ? "bg-ocean-800 text-ocean-300" : "bg-emerald-500/15 text-emerald-300"
                    }`}
                  >
                    {h.data?.test ? "Test to you" : `${(h.data?.sent_to ?? 0).toLocaleString()} members`}
                  </span>
                </div>
                {h.body && <p className="mt-1 text-sm text-ocean-300">{h.body}</p>}
                <p className="mt-1 text-xs text-ocean-500">
                  {when(h.created_at)}
                  {h.data?.email === false ? " · bell only" : " · bell and email"}
                  {h.link ? (
                    <>
                      {" · "}
                      <Link href={h.link} className="text-emerald-400 hover:text-emerald-300">
                        {h.link}
                      </Link>
                    </>
                  ) : null}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
