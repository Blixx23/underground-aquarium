import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import SubmitEventForm from "../SubmitEventForm";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Submit an Event",
  description: "Post an aquarium event for the community to find.",
};

export default async function SubmitEventPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return (
      <main className="min-h-screen pt-24 pb-20 px-6">
        <div className="max-w-xl mx-auto text-center">
          <h1 className="font-display text-3xl text-white mb-3">
            Submit an event
          </h1>
          <p className="text-ocean-300 mb-6">
            Please sign in to post an event.
          </p>
          <Link
            href="/login"
            className="inline-flex items-center gap-2 rounded-lg bg-emerald-500/15 border border-emerald-500/40 text-emerald-300 px-5 py-2.5 text-sm font-medium hover:bg-emerald-500/25 transition-colors"
          >
            Sign in
          </Link>
        </div>
      </main>
    );
  }

  const { data: stores } = await supabase
    .from("fish_stores")
    .select("id, name")
    .eq("claimed_by", user.id)
    .eq("status", "published")
    .order("name", { ascending: true });

  return (
    <main className="min-h-screen pt-24 pb-20 px-6">
      <div className="max-w-xl mx-auto">
        <div className="mb-6">
          <Link
            href="/events"
            className="inline-flex items-center gap-2 text-ocean-300 hover:text-white transition-colors text-sm"
          >
            <ArrowLeft className="w-4 h-4" /> All events
          </Link>
        </div>
        <h1 className="font-display text-3xl sm:text-4xl text-white mb-2">
          Submit an event
        </h1>
        <p className="text-ocean-300 mb-8">
          Frag swaps, club meetups, auctions, sales — tell the community what's
          happening.
        </p>
        <SubmitEventForm
          userId={user.id}
          stores={(stores ?? []) as { id: string; name: string }[]}
        />
      </div>
    </main>
  );
}